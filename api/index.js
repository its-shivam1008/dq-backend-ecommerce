// Vercel serverless handler that wraps the existing Express app
// Instantiate the app lazily and surface init errors to logs without touching backend code
let app;

function getApp() {
  if (!app) {
    const createApp = require("../app");
    app = createApp();
  }
  return app;
}

module.exports = async (req, res) => {
  try {
    const appInstance = getApp();
    return appInstance(req, res);
  } catch (err) {
    console.error("[api/index] Initialization error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "FUNCTION_INIT_FAILED",
        message: err?.message || "Internal error",
      })
    );
  }
};
