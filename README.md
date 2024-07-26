<div align="center">
    <a href="https://twitter.com/paypaldev" target="_blank">
        <img alt="Twitter: PayPal Developer" src="https://img.shields.io/twitter/follow/paypaldev?style=social" />
    </a>
    <br />
    <a href="https://twitter.com/paypaldev" target="_blank">Twitter</a>
        <span>&nbsp;&nbsp;-&nbsp;&nbsp;</span>
    <a href="https://www.paypal.com/us/home" target="_blank">PayPal</a>
        <span>&nbsp;&nbsp;-&nbsp;&nbsp;</span>
    <a href="https://developer.paypal.com/home" target="_blank">Docs</a>
        <span>&nbsp;&nbsp;-&nbsp;&nbsp;</span>
    <a href="https://github.com/paypaldev" target="_blank">Code Samples</a>
        <span>&nbsp;&nbsp;-&nbsp;&nbsp;</span>
    <a href="https://dev.to/paypaldeveloper" target="_blank">Blog</a>
    <br />
    <hr />
</div>

# Fastlane by PayPal using the PayPal Integration - Video Project Files

This is the example code for the Fastlane PayPal Video Project.

## Getting Started

To get started with this project, follow these steps:

1. Obtain the PayPal CLIENT ID and SECRET for your existing PayPal integration.
2. Update the following files with your credentials:
     - Rename the .env-template file to .env and populate with creds [.env-template](https://github.com/paypaldev/fastlane_paypal_video_project/blob/main/.env-template)
     - Use the same Client ID in your .env file in the script file [script.js line 67](https://github.com/paypaldev/fastlane_paypal_video_project/blob/main/script.js#L67)
3. Make sure to provide a comma separated list of domain names in the .env file, as well
4. Update your server-side endpoint URL [script.js line 40](https://github.com/paypaldev/fastlane_paypal_video_project/blob/main/script.js#L40)
5. Update the "data-client-metadata-id" especially when not in sandbox mode [script.js line 72](https://github.com/paypaldev/fastlane_paypal_video_project/blob/main/script.js#L72)
6. Note: To use Netlify with this project, you can leave the files as they are. However, if you're not using Netlify, you may need to restructure the directory to ensure that `api.js` is seen as the server endpoint in your Node.js project.

Once you have configured your credentials, you can install the required packages by running `npm i`. To start the app, run `node index`.

## PayPal Developer Community

Join the PayPal Developer community to enhance your skills, contribute to PayPal products, and connect with other developers.

- Website: [developer.paypal.com](https://developer.paypal.com)
- Twitter: [@paypaldev](https://twitter.com/paypaldev)
- GitHub: [@paypal](https://github.com/paypal)
