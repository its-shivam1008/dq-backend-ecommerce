// Vercel serverless handler that wraps the existing Express app
// Instantiate the app once per Lambda/container instance for better performance
const createApp = require("../app");
const app = createApp();

// Export the Express app directly so Vercel can use it as the handler
module.exports = app;
