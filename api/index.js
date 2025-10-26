// Vercel serverless handler that wraps the existing Express app
// Instantiate the app lazily and surface init errors to logs without touching backend code
let app;

function ensureTmpUploads() {
  try {
    const fs = require("fs");
    const path = require("path");

    // Prefer writeable /tmp on Vercel for any local uploads
    try { process.chdir("/tmp"); } catch (_) {}

    const uploadsRoot = path.resolve("uploads");
    const subdirs = [
      uploadsRoot,
      path.join(uploadsRoot, "banners"),
      path.join(uploadsRoot, "categories"),
    ];
    for (const p of subdirs) {
      try { fs.mkdirSync(p, { recursive: true }); } catch (e) {
        // Log but don't crash; missing local FS should not take down the function
        console.warn(`[api/index] mkdir failed for ${p}:`, e?.message || e);
      }
    }
  } catch (e) {
    console.warn("[api/index] ensureTmpUploads error:", e?.message || e);
  }
}

function getApp() {
  if (!app) {
    ensureTmpUploads();
    const createApp = require("../app");
    app = createApp();

    // Also mount a static handler to the writeable /tmp/uploads so URLs like /uploads/... work
    try {
      const express = require("express");
      const path = require("path");
      app.use("/uploads", express.static(path.resolve("uploads")));
    } catch (e) {
      console.warn("[api/index] static mount failed:", e?.message || e);
    }
  }
  return app;
}

module.exports = async (req, res) => {
  try {
    // Log incoming request for debugging
    console.log(`[api/index] ${req.method} ${req.url}`);
    
    const appInstance = getApp();
    return appInstance(req, res);
  } catch (err) {
    console.error("[api/index] Initialization error:", err);
    console.error("[api/index] Stack trace:", err?.stack);
    
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "FUNCTION_INIT_FAILED",
        message: err?.message || "Internal error",
        path: req.url,
        method: req.method
      })
    );
  }
};
