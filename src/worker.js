// src/worker.js
self.onmessage = function (e) {
  if (e.data === "START_HEALTH_CHECKS") {
    // Simulate health checks every 30s
    setInterval(() => {
      self.postMessage({ type: "HEALTH_CHECK" });
    }, 30000);
  }
};
