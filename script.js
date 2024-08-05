let profile_data;
let email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
let is_guest_payer = true;
let email_input_element = document.getElementById("email");
let identity;
let profile;
let FastlanePaymentComponent;
let FastlaneWatermarkComponent;
let client_token;
let client_id;
let script_tag;
let paypal_button;
let venmo_button;
let method;
let amount_input_element = document.getElementById("amount");
let payment_form = document.getElementById("payment_form");
let process_payment_request;
let process_payment_response;
let amount_paid;
let currency_code;
let payment_method_element = document.getElementById("payment_method");
let buyer_email_element = document.getElementById("buyer_email");
let payment_submit_button = document.getElementById("payment_submit");
let paypal_button_options;
let create_paypal_order_request;
let order_data;
let payment_fetch_options;
let order_fetch_options;
let show_card_fields_button = document.getElementById("show_card_fields");
let paypal_button_container = document.getElementById("paypal_button_container");
let venmo_button_container = document.getElementById("venmo_button_container");
let auth_flow_response;
let authentication_state;
let card_fields_container = document.getElementById("card_fields_container");
let lookup_response;
let customer_context_id;
let tokenize_response;
let tokenize_id;
let order_id;
let server_endpoint = "/.netlify/functions/api/"; // Replace with your own server endpoint
let single_use_token;
let fastlane_options_object;
let payment_source;

// Entry point
get_auth()
    .then(response => response.json())
    .then(init_paypal_script_tag)
    .catch(error => {
        console.error("Error:", error);
    });
// Fetch an authentication token from the server to load fastlane SDK (card payments)
function get_auth() {
    return fetch(server_endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            method: "fastlane_auth"
        })
    });
}
// Initializes the PayPal script tag with the provided access token.
function init_paypal_script_tag(data) {
    client_token = data.client_token;
    client_id = "REPLACE_ME";
    // Setting script tag attributes
    script_tag = document.createElement("script");
    script_tag.src = `https://www.paypal.com/sdk/js?client-id=${client_id}&components=buttons,fastlane&enable-funding=venmo&disable-funding=card,paylater`;
    script_tag.setAttribute("data-user-id-token", client_token);
    script_tag.setAttribute("data-client-metadata-id", "testing-sb-fastlane");
    document.head.appendChild(script_tag);
    script_tag.onload = init_paypal_payment_options;
}
// Initializes PayPal payment options by setting up Fastlane and PayPal buttons.
function init_paypal_payment_options() {
    init_fastlane_methods();
    paypal_button = bootstrap_standard_button({ fundingSource: "paypal", style: {
        shape: "rect",
        color: "gold",
        label: "paypal",
        height: 55
    }});
    paypal_button.render("#paypal_button_container");
    venmo_button = bootstrap_standard_button({ fundingSource: "venmo" });
    venmo_button.render("#venmo_button_container");
}
// Initializes Fastlane methods and sets up event handlers.
async function init_fastlane_methods() {
    let fastlane = await window.paypal.Fastlane({});
    fastlane.setLocale("en_us");
    profile = fastlane.profile;
    FastlanePaymentComponent = fastlane.FastlanePaymentComponent;
    identity = fastlane.identity;
    // Fastlane watermark component
	FastlaneWatermarkComponent = await fastlane.FastlaneWatermarkComponent({ includeAdditionalInfo: true });
	FastlaneWatermarkComponent.render("#watermark-container");
    // Show all form elements now that SDK loading has completed
    ui_display_remaining_elements();
    // Set event listener to handle automatic fastlane lookup on input
    email_input_element.addEventListener("input", function() {
        handle_email_input();
    });
    //Click once to display card fields and check the user email in fastlane for first time
    show_card_fields_button.addEventListener("click", (event) => {
        if (show_card_fields_button.style.display === "block") {
            ui_handle_show_card_fields();
            fastlane_display_card_fields();
        }
    });
    // Render the fastlane component
    async function fastlane_display_card_fields() {
        // Optional UI fix
        card_fields_container.style.setProperty("width", "calc(100% - 32px)", "important");
        card_fields_container.style["margin-bottom"] = "13px";
        fastlane_options_object = {
            styles: {
                root: {
                    backgroundColor: "white",
                    errorColor: "red",
                    fontFamily: "Arial, sans-serif",
                    textColorBase: "black",
                    fontSizeBase: "16px",
                    padding: "0px",
                    primaryColor: "black",
                },
                input: {
                    backgroundColor: "white",
                    borderRadius: "4px",
                    borderColor: "#e6e6e6",
                    borderWidth: "1px",
                    textColorBase: "black",
                    focusBorderColor: "black",
                }
            },
/*          If your website has shipping inputs, you can
            pass them here to associate them with this
            new fastlane account. */
/*           shippingAddress: {
                firstName: "Jen",
                lastName: "Smith",
                company: "PayPal",
                streetAddress: "1 E 1st St",
                extendedAddress: "5th Floor",
                locality: "Bartlett",
                region: "IL",
                postalCode: "60103",
                countryCodeAlpha2: "US",
                phoneNumber: "14155551212"
                
              } */
        };
        // To use the "Flexible" Fastlane integration where you have
        // more customized UI, you can use the following instead:
        // FastlaneCardFieldComponent = await fastlane.FastlaneCardFieldComponent(fastlane_options_object);
        FastlanePaymentComponent = await fastlane.FastlanePaymentComponent(fastlane_options_object);
        FastlanePaymentComponent.render("#card_fields_container");
        setup_payment_handler(FastlanePaymentComponent);
    }
    // IF YOU HAVE SHIPPING
    async function show_shipping_address_selector() {
          let shipping_address_selector = await profile.showShippingAddressSelector();
          let selected_address = shipping_address_selector.selectedAddress;
          let selection_changed = shipping_address_selector.selectionChanged;
          //After user is done with the selection modal
          if (selection_changed) {
            // selectedAddress contains the new address
          } else {
            // Selection modal was dismissed without selection
          }
    }
    //To switch their card
    async function show_card_selector() {
          let card_selector = await profile.showCardSelector();
          let selected_card = card_selector.selectedCard;
          let selection_changed = card_selector.selectionChanged;
          //After user is done with the selection modal
          if (selection_changed) {
            // selectedCard contains the new Card
          } else {
            // Selection modal was dismissed without selection
          }
    }
    // Submit button to process payment
    function setup_payment_handler(FastlanePaymentComponent) {
        payment_submit_button.addEventListener("click", async (event) => {
            ui_submit_button_clicked();
            console.log("Payment form requested to be submitted.");
            //User typed out card info (guest)
            if (is_guest_payer) {
                tokenize_response = await FastlanePaymentComponent.getPaymentToken({
                    billingAddress: {}
                }).catch(error => {
                    console.error("Error tokenizing payment:", error);
                    revert_submit_button_ui();
                });
                console.log("tokenize response", tokenize_response);
                // Payment source type can be extracted in response
                payment_source = Object.keys(tokenize_response.paymentSource)[0];
                process_payment({ "single_use_token": tokenize_response.id, "payment_source": payment_source });
            }
            //User passed OTP (fastlane user)
            else {
                process_authenticated_user();
            }
        });
    }
}
// We already have the profile data from fastlane,
// so we can process the payment. No need to display
// card fields nor tokenize any user inputs.
function process_authenticated_user() {
    // In case you want to use any of these for custom UI or receipts
    let name = profile_data.name;
    let shippingAddress = profile_data.shippingAddress;
    let card = profile_data.card;
    process_payment({ "single_use_token": card.id, "payment_source": "card" });
}
// Avoid fastlane lookups of a string unless user has entered a valid email
function handle_email_input() {
    if (check_email_validity(email_input_element.value)) {
        console.log('The string "' + email_input_element.value + '" is a valid email address.');
        begin_fastlane_lookup();
    }
}
// Fastlane lookup to decide if UI should be guest payer (if email not found)
// or attempt for one-time-password (OTP) fastlane auth
async function begin_fastlane_lookup() {
    lookup_response = await identity.lookupCustomerByEmail(email_input_element.value);
    customer_context_id = lookup_response.customerContextId;
    
    if (customer_context_id) {
        handle_existing_customer(customer_context_id);
    } else {
        // Optional UI fix
        card_fields_container.style.setProperty("width", "calc(100% - 32px)", "important");
        handle_guest_payer();
    }
}
// Fastlane OTP auth if fastlane matched the email string to a profile
async function handle_existing_customer(customer_context_id) {
    auth_flow_response = await identity.triggerAuthenticationFlow(customer_context_id);
    authentication_state = auth_flow_response.authenticationState;
    // Can use profileData for "flexible" integration where you would display card details with custom UI
    profile_data = auth_flow_response.profileData;
    console.log("Profile data associated with this fastlane account:", profile_data);
    // Fastlane OTP auth passed
    if (authentication_state === "succeeded") {
        // We click to show the card fields container so that their stored card is displayed for authenticated users
        // For the "Quick Start" integration, this is built in. For "flexible" integration, you must
        // build this UI using the "profile_data" variable:
        // let name = profile_data.name;
        // let shippingAddress = profile_data.shippingAddress;
        // let card = profile_data.card;
        show_card_fields_button.click();
        is_guest_payer = false;
        console.log("Fastlane member successfully authenticated themselves");
        // Optional UI fix
        card_fields_container.style.setProperty("width", "calc(100% - 40px)", "important");
    }
    // Fastlane OTP auth did not pass, treat as guest payer
    else {
        console.log("Member failed or cancelled to authenticate. Treat them as a guest payer");
        // Optional UI fix
        card_fields_container.style.setProperty("width", "calc(100% - 32px)", "important");
        handle_guest_payer();
    }
}

function handle_guest_payer() {
    console.log("No profile found with this email address. This is a guest payer");
    is_guest_payer = true;
    // Add any other custom code that you want to occur for guest payer scenario
}
// Processes the payment using the provided tokenize ID and payment source.
async function process_payment(object) {
    single_use_token = object.single_use_token;
    payment_source = object.payment_source;
    order_id = object.order_id;
    console.log("Processing payment, have this profile data avail:", profile_data);
    // Determine the method based on the payment source
    if (payment_source === "card") {
        method = "card_order";
        console.log(`Processing payment with single_use_token: ${single_use_token} and payment_source: ${payment_source}`);
    } else {
        method = "complete_order";
        console.log(`Processing payment with order_id: ${order_id} and payment_source: ${payment_source}`);
    }
    // Set up fetch options for the API call
    payment_fetch_options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            method: method,
            amount: amount_input_element.value,
            order_id: order_id,
            payment_source: payment_source,
            single_use_token: single_use_token
        })
    };
    try {
        console.log("Sending payment request to the server...");
        // Send the payment request to the server
        fetch(server_endpoint, payment_fetch_options)
            .then(response => response.json())
            .then((process_payment_response) => {
                ui_display_receipt(process_payment_response);
            });
    } catch (error) {
        revert_submit_button_ui();
        // Replace with your own custom UI error handling
        alert("Error processing payment. Please try again.");
        console.error("Error processing payment:", error);
    }    
}
// Initializes PayPal buttons and sets up event handlers for order creation and approval.
function bootstrap_standard_button(options_object) {
    paypal_button_options = {
        createOrder: async (data) => {
            try {
                // Set up fetch options for creating an order
                order_fetch_options = {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        method: "create_order",
                        amount: amount_input_element.value,
                        payment_source: data.paymentSource,
/*                  If your website has shipping inputs, you can
                    pass them here to associate them with this
                    new Order Creation API Call. */
/*                         shipping_address: {
                                "address_line_1": "123 Townsend St",
                                "address_line_2": "Floor 6",
                                "admin_area_2": "San Francisco",
                                "admin_area_1": "CA",
                                "postal_code": "94107",
                                "country_code": "US"
                            } */
                    })
                };
                // Send the create order request to the server
                create_paypal_order_request = await fetch(server_endpoint, order_fetch_options);
                order_data = await create_paypal_order_request.json();
                console.log("Order data received:", order_data);
                if (order_data.id) {
                    return order_data.id;
                }
            } catch (error) {
                console.error("Error creating order:", error);
            }
        },
        onApprove: async (data, actions) => {
            console.log("Order approved with data:", data);
            // Process the payment upon order approval
            try {
                await process_payment({ "order_id": data.orderID, "payment_source": data.paymentSource });
            } catch (error) {
                console.error("Error processing payment:", error);
            }
        }
    };
    // Merge the provided object with the default options
    Object.assign(paypal_button_options, options_object);
    return window.paypal.Buttons(paypal_button_options);
}

// UI AND HELPER FUNCTIONS BELOW

function ui_display_receipt(process_payment_response) {
    console.log("Payment response received:", process_payment_response);
    // Hide the left and right cards
    document.getElementById("card-content-left").style.display = "none";
    document.getElementById("card-content-right").style.display = "none";
    // Show the receipt card
    document.getElementById("card-content-receipt").style.display = "block";
    // Update the receipt with the payment response information
    let amount_paid = process_payment_response.amount.value;
    let currency_code = process_payment_response.amount.currency;
    document.getElementById("amount_paid").textContent = `${amount_paid} ${currency_code}`;

    let payment_method_element = document.getElementById("payment_method");
    let buyer_email_element = document.getElementById("buyer_email");

    if (process_payment_response.payment_method.type === "card") {
        payment_method_element.textContent = `💳 ${process_payment_response.payment_method.details.brand} ending in ${process_payment_response.payment_method.details.last_digits}`;
        buyer_email_element.textContent = document.getElementById("email").value;
    } else
    if (process_payment_response.payment_method.type === "paypal" || process_payment_response.payment_method.type === "venmo") {
        payment_method_element.textContent = process_payment_response.payment_method.type.charAt(0).toUpperCase() + process_payment_response.payment_method.type.slice(1);
        buyer_email_element.textContent = process_payment_response.payment_method.details.email;
    }
}

function ui_submit_button_clicked() {
    payment_submit_button.setAttribute("disabled", true);
    payment_submit_button.value = "Loading...";
    payment_submit_button.style.setProperty("cursor", "not-allowed", "important");
}

function revert_submit_button_ui() {
    payment_submit_button.removeAttribute("disabled");
    payment_submit_button.value = "Pay Now";
    payment_submit_button.style.removeProperty("cursor");
}

function ui_display_remaining_elements() {
    document.getElementById("loading").style.display = "none";
    email_input_element.style.display = "block";
    show_card_fields_button.style.display = "block";
    paypal_button_container.style.display = "block";
    venmo_button_container.style.display = "block";
    payment_submit_button.style.display = "block";
}

function ui_handle_show_card_fields() {
    paypal_button_container.style.display = "none";
    venmo_button_container.style.display = "none";
    show_card_fields_button.style.display = "none";
}

function check_email_validity(email) {
    return email_regex.test(email);
}
// Remove default form submission behavior
payment_form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (show_card_fields_button.style.display === "block") {
        show_card_fields_button.click();
    }
});

/* Example Profile data payload:
{
    "shippingAddress": {
        "name": {
            "firstName": "John",
            "lastName": "Doe",
            "fullName": "John Doe"
        },
        "address": {
            "addressLine1": "123 Main St",
            "adminArea2": "City",
            "adminArea1": "State",
            "postalCode": "12345",
            "countryCode": "US"
        },
        "phoneNumber": {
            "nationalNumber": "5551234567",
            "countryCode": "1"
        }
    },
    "card": {
        "id": "12345678-1234-1234-1234-1234567890ab",
        "paymentSource": {
            "card": {
                "brand": "VISA",
                "expiry": "2023-12",
                "lastDigits": "1234",
                "name": "John Doe",
                "billingAddress": {
                    "addressLine1": "123 Main St",
                    "adminArea2": "City",
                    "adminArea1": "State",
                    "postalCode": "12345",
                    "countryCode": "US"
                }
            }
        }
    },
    "name": {
        "firstName": "John",
        "lastName": "Doe",
        "fullName": "John Doe"
    }
} */