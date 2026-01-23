"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  generateFingerprint,
  detectDevTools,
  TypingAnalytics,
  MouseBehaviorTracker,
  setupPrintScreenDetection,
  FocusMonitor,
  generateSessionToken,
  validateSessionToken,
} from "@/services/antiCheatService";

/**
 * useAntiCheat Hook
 * 
 * Centralized React hook for anti-cheating detection.
 * Handles all detection logic and provides clean interface for components.
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.submissionId - Current submission ID
 * @param {string} options.userId - Current user ID
 * @param {Object} options.violationLimits - Max violations per type
 * @param {Function} options.onMaxViolations - Callback when max reached
 * @param {boolean} options.isDisabled - Temporarily disable detection
 */
export function useAntiCheat({
  submissionId,
  userId,
  violationLimits = {
    tabSwitch: 3,
    windowBlur: 3,
    devTools: 2,
    fullscreen: 2,
    windowMove: 2,
    printScreen: 2,
  },
  onMaxViolations,
  isDisabled = false,
}) {
  // State
  const [violations, setViolations] = useState({
    tabSwitch: 0,
    windowBlur: 0,
    devTools: 0,
    fullscreen: 0,
    windowMove: 0,
    printScreen: 0,
  });
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);

  // Refs
  const typingAnalyticsRef = useRef(new TypingAnalytics());
  const mouseTrackerRef = useRef(new MouseBehaviorTracker());
  const focusMonitorRef = useRef(null);
  const cleanupFunctionsRef = useRef([]);
  const violationsRef = useRef(violations);
  const ignoreNextBlurRef = useRef(false);

  // Keep violations ref up to date
  useEffect(() => {
    violationsRef.current = violations;
  }, [violations]);

  const [gracePeriod, setGracePeriod] = useState(true);
  const [monitoringGracePeriod, setMonitoringGracePeriod] = useState(false);

  // Initial grace period effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setGracePeriod(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Monitoring grace period effect - triggers when detection is re-enabled (e.g. after upload)
  useEffect(() => {
    if (!isDisabled) {
      setMonitoringGracePeriod(true);
      const timer = setTimeout(() => {
        setMonitoringGracePeriod(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isDisabled]);

  // Handle violation detection
  const handleViolation = useCallback((type, message) => {
    if (isDisabled || gracePeriod || monitoringGracePeriod) return;

    if (type === "windowBlur" && ignoreNextBlurRef.current) {
      ignoreNextBlurRef.current = false;
      return;
    }

    setViolations((prev) => {
      const newCount = (prev[type] || 0) + 1;
      const limit = violationLimits[type] || 3;

      // Check if we've exceeded the limit
      if (newCount >= limit) {
        onMaxViolations?.(`Maximum ${type} violations reached`);
      } else {
        // Show warning
        setWarningMessage(`Warning: ${message} (${newCount}/${limit})`);
        setShowWarning(true);
      }

      return { ...prev, [type]: newCount };
    });
  }, [isDisabled, gracePeriod, violationLimits, onMaxViolations]);

  // Initialize session and fingerprint
  useEffect(() => {
    if (!submissionId || !userId) return;

    // Generate fingerprint
    const fp = generateFingerprint();
    setFingerprint(fp);

    // Generate or validate session token
    const storedToken = sessionStorage.getItem(`antiCheat_${submissionId}`);
    if (storedToken) {
      const validation = validateSessionToken(storedToken, submissionId);
      if (validation.valid) {
        setSessionToken(storedToken);
      } else if (validation.reason === "device_changed") {
        handleViolation("deviceChange", "Device change detected");
      }
    }

    if (!storedToken) {
      const newToken = generateSessionToken(submissionId, userId);
      sessionStorage.setItem(`antiCheat_${submissionId}`, newToken);
      setSessionToken(newToken);
    }
  }, [submissionId, userId, handleViolation]);

  // Setup all detection mechanisms
  useEffect(() => {
    if (isDisabled) return;

    const cleanups = [];

    // 1. Focus monitoring
    focusMonitorRef.current = new FocusMonitor(handleViolation, 500);
    focusMonitorRef.current.start();
    cleanups.push(() => focusMonitorRef.current?.stop());

    // 2. PrintScreen detection
    const cleanupPrintScreen = setupPrintScreenDetection(handleViolation);
    cleanups.push(cleanupPrintScreen);

    // 3. DevTools detection (periodic)
    const devToolsInterval = setInterval(() => {
      detectDevTools(handleViolation);
    }, 2000);
    cleanups.push(() => clearInterval(devToolsInterval));

    // 3.5 Mouse behavior tracking
    mouseTrackerRef.current.start();
    cleanups.push(() => mouseTrackerRef.current.stop());

    // 4. Fullscreen monitoring
    const handleFullscreenChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullScreen(isFS);
      if (!isFS && !isDisabled) {
        handleViolation("fullscreen", "Fullscreen mode exited");
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    cleanups.push(() => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    });

    // 5. Window movement detection
    let lastTop = window.screenY;
    let lastLeft = window.screenX;
    const moveInterval = setInterval(() => {
      if (window.screenY !== lastTop || window.screenX !== lastLeft) {
        handleViolation("windowMove", "Window movement detected");
        lastTop = window.screenY;
        lastLeft = window.screenX;
      }
    }, 1000);
    cleanups.push(() => clearInterval(moveInterval));

    // 6. Copy/paste prevention
    const preventCopyPaste = (e) => {
      e.preventDefault();
      handleViolation("copyPaste", "Copy/paste attempt blocked");
      return false;
    };
    document.addEventListener("copy", preventCopyPaste);
    document.addEventListener("paste", preventCopyPaste);
    document.addEventListener("contextmenu", preventCopyPaste);
    cleanups.push(() => {
      document.removeEventListener("copy", preventCopyPaste);
      document.removeEventListener("paste", preventCopyPaste);
      document.removeEventListener("contextmenu", preventCopyPaste);
    });

    // 7. Keyboard shortcuts
    const preventKeyboardShortcuts = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "p", "s", "u", "i"].includes(e.key?.toLowerCase())
      ) {
        e.preventDefault();
        return false;
      }
      // Block F12
      if (e.key === "F12") {
        e.preventDefault();
        handleViolation("devTools", "F12 key blocked");
        return false;
      }
    };
    window.addEventListener("keydown", preventKeyboardShortcuts);
    cleanups.push(() => {
      window.removeEventListener("keydown", preventKeyboardShortcuts);
    });

    // 8. Prevent text selection
    const style = document.createElement("style");
    style.id = "anti-cheat-styles";
    style.textContent = `
      html {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
    `;
    document.head.appendChild(style);
    cleanups.push(() => {
      const styleEl = document.getElementById("anti-cheat-styles");
      if (styleEl) styleEl.remove();
    });

    cleanupFunctionsRef.current = cleanups;

    return () => {
      cleanups.forEach((cleanup) => cleanup?.());
    };
  }, [isDisabled, handleViolation]);

  // Ignore the next blur event (useful for file uploads or fullscreen transitions)
  const ignoreNextBlur = useCallback(() => {
    ignoreNextBlurRef.current = true;
    // Auto-reset after 5 seconds if no blur happens
    setTimeout(() => {
      ignoreNextBlurRef.current = false;
    }, 5000);
  }, []);

  // Enter fullscreen
  const enterFullScreen = useCallback(() => {
    ignoreNextBlur();
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().catch(() => {});
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }, [ignoreNextBlur]);

  // Record typing activity
  const recordKeyPress = useCallback(() => {
    typingAnalyticsRef.current.recordKeyPress();
  }, []);

  const recordPaste = useCallback(() => {
    typingAnalyticsRef.current.recordPaste();
  }, []);

  // Dismiss warning
  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    setWarningMessage("");
  }, []);

  // Check if any violation has exceeded its limit
  const hasExceededLimits = useCallback(() => {
    return Object.entries(violationsRef.current).some(
      ([type, count]) => count >= (violationLimits[type] || 3)
    );
  }, [violationLimits]);

  // Calculate total violations
  const getTotalViolations = useCallback(() => {
    return Object.values(violationsRef.current).reduce((sum, count) => sum + count, 0);
  }, []);

  // Check if save operations should be allowed
  const isValidSaveState = useCallback(() => {
    if (hasExceededLimits()) return false;
    
    const maxTotalViolations = 
      Object.values(violationLimits).reduce((sum, limit) => sum + limit, 0) * 0.7;
    
    return getTotalViolations() < maxTotalViolations;
  }, [hasExceededLimits, getTotalViolations, violationLimits]);

  // Get typing analytics
  const getTypingStats = useCallback(() => {
    return typingAnalyticsRef.current.getStats();
  }, []);

  // Detect typing anomalies
  const detectTypingAnomalies = useCallback((answerLength) => {
    return typingAnalyticsRef.current.detectAnomaly(answerLength);
  }, []);

  // Reset typing analytics for new question
  const resetTypingAnalytics = useCallback(() => {
    typingAnalyticsRef.current.reset();
  }, []);

  // Temporarily disable detection (for file uploads, etc.)
  const temporarilyDisable = useCallback((durationMs = 5000) => {
    return new Promise((resolve) => {
      cleanupFunctionsRef.current.forEach((cleanup) => cleanup?.());
      setTimeout(() => {
        // Detection will be re-enabled on next render if isDisabled is false
        resolve();
      }, durationMs);
    });
  }, []);

  // Mouse tracking functions
  const getMouseStats = useCallback(() => mouseTrackerRef.current.getStats(), []);
  const detectMouseAnomalies = useCallback(() => mouseTrackerRef.current.detectAnomalies(), []);

  return useMemo(() => ({
    // State
    violations,
    showWarning,
    warningMessage,
    isFullScreen,
    sessionToken,
    fingerprint,
    
    // Actions
    handleViolation,
    enterFullScreen,
    dismissWarning,
    recordKeyPress,
    recordPaste,
    resetTypingAnalytics,
    temporarilyDisable,
    ignoreNextBlur,
    
    // Getters
    hasExceededLimits,
    getTotalViolations,
    isValidSaveState,
    getTypingStats,
    detectTypingAnomalies,
    
    // Mouse tracking
    getMouseStats,
    detectMouseAnomalies,
  }), [
    violations,
    showWarning,
    warningMessage,
    isFullScreen,
    sessionToken,
    fingerprint,
    handleViolation,
    enterFullScreen,
    dismissWarning,
    recordKeyPress,
    recordPaste,
    resetTypingAnalytics,
    temporarilyDisable,
    hasExceededLimits,
    getTotalViolations,
    isValidSaveState,
    getTypingStats,
    detectTypingAnomalies,
    getMouseStats,
    detectMouseAnomalies,
  ]);
}

export default useAntiCheat;
