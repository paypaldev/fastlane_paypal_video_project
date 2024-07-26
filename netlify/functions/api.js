import fetch from "node-fetch";
import 'dotenv/config';

let PAYPAL_CLIENT = process.env.PAYPAL_CLIENT;
let PAYPAL_SECRET = process.env.PAYPAL_SECRET;
let FASTLANE_APPROVED_DOMAINS_CSV = process.env.FASTLANE_APPROVED_DOMAINS_CSV;
let PAYPAL_API_BASE_URL = "https://api-m.sandbox.paypal.com";
//let PAYPAL_API_BASE_URL = "https://api-m.paypal.com";

// Routes
exports.handler = async (event) => {
    let request_body = JSON.parse(event.body);
    console.log("Received request:", request_body);

    switch (request_body.method) {
        case "fastlane_auth":
            return handle_fastlane_auth();
        case "auth":
            return handle_auth();
        case "card_order":
            return handle_card_order(request_body);
        case "create_order":
            return handle_create_order(request_body);
        case "complete_order":
            return handle_complete_order(request_body);
        default:
            console.error("Invalid method:", request_body.method);
            return {
                statusCode: 400,
                body: "Invalid endpoint"
            };
    }
};

// Handle Authentication
let handle_auth = async () => {
    try {
        let access_token_response = await get_access_token();
        let access_token = access_token_response.access_token;
        return {
            statusCode: 200,
            body: JSON.stringify({ access_token })
        };
    } catch (error) {
        console.error("Error in handle_auth:", error);
        return {
            statusCode: 500,
            body: error.toString()
        };
    }
};

// Handle Fastlane Authentication
let handle_fastlane_auth = async () => {
    try {
        let access_token_response = await get_access_token();
        let access_token = access_token_response.access_token;
        let fastlane_auth_response = await fetch(`${PAYPAL_API_BASE_URL}/v1/oauth2/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Bearer ${access_token}`
            },
            body: new URLSearchParams({
                grant_type: "client_credentials",
                response_type: "client_token",
                intent: "sdk_init",
                "domains[]": FASTLANE_APPROVED_DOMAINS_CSV
            })
        });

        let fastlane_auth_response_json = await fastlane_auth_response.json();
        return {
            statusCode: 200,
            body: JSON.stringify({ access_token: fastlane_auth_response_json.access_token })
        };
    } catch (error) {
        console.error("Error in handle_fastlane_auth:", error);
        return {
            statusCode: 500,
            body: error.toString()
        };
    }
};

// Handle Card Order
let handle_card_order = async (request_body) => {
    try {
        let { amount, payment_source, single_use_token, shipping_address } = request_body;
        let create_order_response = await create_order({ amount, payment_source, single_use_token, shipping_address });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(create_order_response)
        };
    } catch (error) {
        console.error("Error in handle_card_order:", error);
        return {
            statusCode: 500,
            body: error.toString()
        };
    }
};

// Handle Create Order
let handle_create_order = async (request_body) => {
    try {
        let { amount, payment_source, shipping_address } = request_body;
        let create_order_request = await create_order({ amount, payment_source, shipping_address });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(create_order_request)
        };
    } catch (error) {
        console.error("Error in handle_create_order:", error);
        return {
            statusCode: 500,
            body: error.toString()
        };
    }
};

// Handle Complete Order
let handle_complete_order = async (request_body) => {
    try {
        let capture_paypal_order_response = await capture_paypal_order(request_body.order_id);
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(capture_paypal_order_response)
        };
    } catch (error) {
        console.error("Error in handle_complete_order:", error);
        return {
            statusCode: 500,
            body: error.toString()
        };
    }
};

// Capture PayPal Order
// https://developer.paypal.com/docs/api/orders/v2/#orders_capture
let capture_paypal_order = async (order_id) => {
    try {
        let access_token_response = await get_access_token();
        let access_token = access_token_response.access_token;
        let url = `${PAYPAL_API_BASE_URL}/v2/checkout/orders/${order_id}/capture`;

        let capture_request = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`
            },
            body: "{}"
        });
        let capture_response = await capture_request.json();
        // You always want to sanitize API responses. No need to send the full
        // data dump to the client as to avoid unwanted data exposure
        let sanitized_paypal_capture_response = {
            amount: {
                value: capture_response.purchase_units[0].payments.captures[0].amount.value,
                currency: capture_response.purchase_units[0].payments.captures[0].amount.currency_code
            },
            payment_method: {}
        };
        // Check for PayPal details and set payment method accordingly
        if (capture_response.payment_source.paypal) {
            sanitized_paypal_capture_response.payment_method.type = "paypal";
            sanitized_paypal_capture_response.payment_method.details = {
                email: capture_response.payment_source.paypal.email_address
            };
        }
        // Check for Venmo details and set payment method accordingly
        if (capture_response.payment_source.venmo) {
            sanitized_paypal_capture_response.payment_method.type = "venmo";
            sanitized_paypal_capture_response.payment_method.details = {
                email: capture_response.payment_source.venmo.email_address
            };
        }
        console.log("Capture Order Response:", JSON.stringify(capture_response, null, 2));
        return sanitized_paypal_capture_response;
    } catch (error) {
        console.error("Error in capture_paypal_order:", error);
        throw error;
    }
};

// Create Order
// https://developer.paypal.com/docs/api/orders/v2/#orders_create
let create_order = async (request_object) => {
    try {
        let { amount, payment_source, single_use_token, shipping_address } = request_object;
        let access_token_response = await get_access_token();
        let access_token = access_token_response.access_token;
        let create_order_endpoint = `${PAYPAL_API_BASE_URL}/v2/checkout/orders`;
        let purchase_unit_object = {
            amount: {
                currency_code: "USD",
                value: amount,
                breakdown: {
                    item_total: {
                        currency_code: "USD",
                        value: amount
                    }
                }
            },
            items: [{
                name: "Buy Me",
                quantity: "1",
                category: shipping_address ? "PHYSICAL_GOODS" : "DIGITAL_GOODS",
                unit_amount: {
                    currency_code: "USD",
                    value: amount
                }
            }]
        };
        // If using shipping addresses, replace these options
        // with the options from your server
        if (shipping_address) {
            purchase_unit_object.shipping = {
                options: [
                    {
                        id: "my_custom_shipping_option_1",
                        label: "Free Shipping",
                        type: "SHIPPING",
                        selected: true,
                        amount: {
                            currency_code: "USD",
                            value: "0.00"
                        }
                    },
                    {
                        id: "my_custom_shipping_option_2",
                        label: "Basic Shipping",
                        type: "SHIPPING",
                        selected: false,
                        amount: {
                            currency_code: "USD",
                            value: "3.50"
                        }
                    }
                ],
                name: {
                    full_name: "John Doe"
                },
                address: shipping_address
            };
        }

        let payload = {
            intent: "CAPTURE",
            purchase_units: [purchase_unit_object],
            payment_source: {}
        };
        payload.payment_source[payment_source] = {
            // "experience_context" is optional, but if the payment_source
            // is "card" then "single_use_token" must be passed (Few lines down)
            experience_context: {
                brand_name: "BUY ME",
                shipping_preference: shipping_address ? "GET_FROM_FILE" : "NO_SHIPPING",
                user_action: "PAY_NOW",
                payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED"
            }
        };
        if (payment_source === "card") {
            // https://developer.paypal.com/docs/api/orders/v2/#orders_create!path=purchase_units/soft_descriptor&t=request
            purchase_unit_object.soft_descriptor = "BIZNAME HERE";
            //If using card, "single_use_token" is not optional
            payload.payment_source.card = {
                single_use_token: single_use_token
            };
        }
        console.log("Payload before creating Order:", JSON.stringify(payload, null, 2));
        let create_order_request = await fetch(create_order_endpoint, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`,
                // PayPal-Request-Id shouldn't necessarily be random,
                // but if so, store it yourself for referencing. Learn more:
                // https://developer.paypal.com/api/rest/reference/idempotency/
                "PayPal-Request-Id": Math.random().toString()
            },
            method: "POST",
            body: JSON.stringify(payload)
        });
        let json_response = await create_order_request.json();
        console.log("Order API Response:", JSON.stringify(json_response, null, 2));
        //If fastlane order, then this is final response
        if (payment_source === "card") {
            // You always want to sanitize API responses. No need to send the full
            // data dump to the client as to avoid unwanted data exposure
            let sanitized_card_capture_response = {
                amount: {
                    value: json_response.purchase_units[0].payments.captures[0].amount.value,
                    currency: json_response.purchase_units[0].payments.captures[0].amount.currency_code
                },
                payment_method: {
                    type: "card",
                    details: {
                        brand: json_response.payment_source.card.brand,
                        last_digits: json_response.payment_source.card.last_digits,
                        name: json_response.payment_source.card.name
                    }
                }
            };
            return sanitized_card_capture_response;
        }
        //Otherwise you have just created an Order and not finalized a payment
        else {
            return { id: json_response.id};
        }
    } catch (error) {
        console.error("Error creating order:", error);
        return {
            statusCode: 400,
            body: error.toString()
        };
    }
};

// Get Access Token
let get_access_token = async () => {
    try {
        let auth = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString("base64");
        let request_body = "grant_type=client_credentials";

        let access_token_request = await fetch(`${PAYPAL_API_BASE_URL}/v1/oauth2/token`, {
            method: "POST",
            body: request_body,
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });

        let access_token_response = await access_token_request.json();

        if (!access_token_request.ok) {
            throw new Error(access_token_response.error_description || "Failed to fetch access token");
        }

        return { access_token: access_token_response.access_token };
    } catch (error) {
        console.error("Error fetching access token:", error);
        return {
            statusCode: 400,
            body: error.toString()
        };
    }
};