const dotenv = require("dotenv");
dotenv.config();

const createApp = require("./app");

// Create app instance
const app = createApp();

// For local development
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// Export the app for Vercel serverless function
module.exports = app;
