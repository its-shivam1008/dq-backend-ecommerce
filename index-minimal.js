const dotenv = require("dotenv");
dotenv.config();

const createApp = require("./app-minimal");

// Export the app for Vercel serverless function
module.exports = createApp();
