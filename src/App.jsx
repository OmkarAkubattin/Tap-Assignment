// src/App.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// Web Worker for background checks
const createWorker = () => {
  if (window.Worker) {
    return new Worker(new URL("./worker.js", import.meta.url));
  }
  return null;
};

function App() {
  const [location, setLocation] = useState(null);
  const [networkStatus, setNetworkStatus] = useState("checking...");
  const [isInactive, setIsInactive] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [logs, setLogs] = useState([]);
  const workerRef = useRef(null);
  const inactivityTimer = useRef(null);
  const emergencyTimer = useRef(null);

  // Optimized logging with throttling
  const addLog = useCallback((message) => {
    setLogs((prev) => {
      if (prev.length > 20) {
        return [
          ...prev.slice(-19),
          `${new Date().toLocaleTimeString()}: ${message}`,
        ];
      }
      return [...prev, `${new Date().toLocaleTimeString()}: ${message}`];
    });
  }, []);

  // 1. Geolocation API (throttled)
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      addLog("Geolocation not supported");
      return;
    }

    let mounted = true;
    const geoOptions = {
      enableHighAccuracy: true,
      maximumAge: 30000, // Cache for 30s
      timeout: 10000,
    };

    const geoSuccess = (position) => {
      if (!mounted) return;
      const { latitude, longitude } = position.coords;
      setLocation((prev) => {
        // Only update if changed significantly
        if (
          !prev ||
          Math.abs(prev.lat - latitude) > 0.0001 ||
          Math.abs(prev.lng - longitude) > 0.0001
        ) {
          addLog(`Location updated`);
          return { lat: latitude, lng: longitude };
        }
        return prev;
      });
    };

    const geoError = (error) => {
      if (!mounted) return;
      addLog(`Geolocation: ${error.message}`);
    };

    const watchId = navigator.geolocation.watchPosition(
      geoSuccess,
      geoError,
      geoOptions
    );

    return () => {
      mounted = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [addLog]);

  // 2. Network Information API (lazy-loaded)
  useEffect(() => {
    if (!("connection" in navigator)) {
      setNetworkStatus("API not supported");
      return;
    }

    const updateNetworkStatus = () => {
      const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;
      const { effectiveType, downlink, rtt } = connection;
      console.log(effectiveType, downlink, rtt, connection);

      let status;
      if (effectiveType.includes("2g") || downlink < 1 || rtt > 1000) {
        status = "poor";
      } else if (
        effectiveType.includes("slow-2g") ||
        downlink < 0.5 ||
        rtt > 2000
      ) {
        status = "very-poor";
      } else {
        status = "good";
      }

      setNetworkStatus(status);

      if (status === "very-poor") {
        handleNetworkEmergency();
      }
    };

    // Initial check with delay
    const initTimer = setTimeout(updateNetworkStatus, 2000);

    // Listen for changes (throttled)
    const throttledUpdate = throttle(updateNetworkStatus, 5000);
    navigator.connection.addEventListener("change", throttledUpdate);

    return () => {
      clearTimeout(initTimer);
      navigator.connection.removeEventListener("change", throttledUpdate);
    };
  }, []);

  // 3. Background Tasks via Web Worker
  useEffect(() => {
    workerRef.current = createWorker();
    if (!workerRef.current) {
      addLog("Web Workers not supported - using fallback");
      return;
    }

    workerRef.current.onmessage = (e) => {
      if (e.data.type === "HEALTH_CHECK") {
        addLog("Background health check OK");
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [addLog]);

  // 4. Optimized Inactivity Detection
  useEffect(() => {
    const handleActivity = () => {
      setIsInactive(false);
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        setIsInactive(true);
        addLog("User inactive - possible emergency");
        triggerEmergency("INACTIVITY");
      }, 45000); // 45 seconds of inactivity
    };

    // Throttled event listeners
    const events = ["mousemove", "keydown", "scroll", "touchstart"];
    const throttledHandler = throttle(handleActivity, 1000);

    events.forEach((event) => {
      window.addEventListener(event, throttledHandler);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, throttledHandler);
      });
      clearTimeout(inactivityTimer.current);
    };
  }, [addLog]);

  const handleNetworkEmergency = useCallback(() => {
    addLog("Poor network detected - monitoring");

    clearTimeout(emergencyTimer.current);
    emergencyTimer.current = setTimeout(() => {
      if (networkStatus === "very-poor") {
        triggerEmergency("NETWORK_FAILURE");
      }
    }, 30000); // 30s countdown
  }, [networkStatus, addLog]);

  const triggerEmergency = useCallback(
    (reason) => {
      if (emergencyMode) return;

      setEmergencyMode(true);
      addLog(`EMERGENCY: ${reason}`);

      // In real app: contact emergency services
      setTimeout(() => {
        setEmergencyMode(false);
        addLog("Emergency resolved");
      }, 10000);
    },
    [emergencyMode, addLog]
  );

  const simulateAccident = () => {
    triggerEmergency("MANUAL_TEST");
  };

  return (
    <div className="app">
      <header>
        <h1>Emergency Responder</h1>
      </header>

      <main>
        {emergencyMode && (
          <div className="emergency-banner">EMERGENCY MODE ACTIVATED</div>
        )}

        <div className="status-panel">
          <div className="status-item">
            <span>Location:</span>
            {location
              ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
              : "Acquiring..."}
          </div>
          <div className="status-item">
            <span>Network:</span>
            <span className={`network-${networkStatus}`}>{networkStatus}</span>
          </div>
        </div>

        <button className="emergency-btn" onClick={simulateAccident}>
          TEST EMERGENCY
        </button>

        <div className="log-panel">
          <h3>System Logs</h3>
          <div className="log-list">
            {logs.map((log, i) => (
              <div key={i} className="log-entry">
                {log}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper function to throttle events
function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function () {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function () {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

export default App;
