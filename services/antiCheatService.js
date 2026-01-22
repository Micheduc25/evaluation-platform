"use client";

/**
 * Anti-Cheat Service
 * 
 * Centralized service for anti-cheating mechanisms including:
 * - Browser fingerprinting
 * - Session validation
 * - Anomaly detection
 * - Risk scoring
 */

// ========== Browser Fingerprinting ==========

/**
 * Generates a canvas fingerprint (unique per browser/hardware)
 */
const getCanvasFingerprint = () => {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return "no-canvas";
    
    // Draw some unique patterns
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Canvas FP", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("Canvas FP", 4, 17);
    
    return canvas.toDataURL().slice(-50);
  } catch {
    return "canvas-error";
  }
};

/**
 * Gets WebGL fingerprint info
 */
const getWebGLFingerprint = () => {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    
    if (!gl) return "no-webgl";
    
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return "webgl-no-debug";
    
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    return `${vendor}~${renderer}`.slice(0, 100);
  } catch {
    return "webgl-error";
  }
};

/**
 * Simple hash function for fingerprint components
 */
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Generates a browser/device fingerprint
 * This is used to detect device switching during an exam
 */
export const generateFingerprint = () => {
  try {
    const components = [
      navigator.userAgent || "no-ua",
      navigator.language || "no-lang",
      `${screen.width}x${screen.height}`,
      screen.colorDepth?.toString() || "no-depth",
      Intl.DateTimeFormat().resolvedOptions().timeZone || "no-tz",
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() || "no-cpu",
      navigator.deviceMemory?.toString() || "no-mem",
      getCanvasFingerprint(),
      getWebGLFingerprint(),
      navigator.platform || "no-platform",
      navigator.maxTouchPoints?.toString() || "0",
    ];
    
    return hashString(components.join("|"));
  } catch {
    return "fingerprint-error";
  }
};

// ========== Enhanced DevTools Detection ==========

/**
 * Multiple methods to detect developer tools
 */
export const detectDevTools = (callback) => {
  const results = {
    windowSize: false,
    consoleLog: false,
    debugTiming: false,
  };

  // Method 1: Window size heuristic (REMOVED - unreliable)
  // Method 2: Console object toString (REMOVED - flaky)
  // Method 3: Firebug (REMOVED - legacy)

  // Method 4: Element inspection trap
  const element = new Image();
  let accessed = false;
  Object.defineProperty(element, "id", {
    get: function() {
      accessed = true;
      results.consoleLog = true;
    }
  });
  
  // Trigger the console check
  console.log(element);
  console.clear?.();

  // Return true if any method detected DevTools
  const detected = Object.values(results).some(Boolean);
  
  if (detected && callback) {
    callback("devTools", "Developer tools detected");
  }
  
  return detected;
};

// ========== Keystroke Analytics ==========

/**
 * Tracks typing patterns without logging content
 * Used to detect copy-paste vs genuine typing
 */
export class TypingAnalytics {
  constructor() {
    this.keyPressTimestamps = [];
    this.keyPressCount = 0;
    this.pasteCount = 0;
    this.deleteCount = 0;
    this.avgTypingSpeed = 0;
    this.maxBurstSpeed = Infinity;
  }

  recordKeyPress() {
    const now = Date.now();
    this.keyPressTimestamps.push(now);
    this.keyPressCount++;
    
    // Keep only last 100 timestamps
    if (this.keyPressTimestamps.length > 100) {
      this.keyPressTimestamps = this.keyPressTimestamps.slice(-100);
    }
    
    // Calculate rolling average speed (ms between keystrokes)
    if (this.keyPressTimestamps.length >= 10) {
      const recent = this.keyPressTimestamps.slice(-10);
      const avgInterval = (recent[9] - recent[0]) / 9;
      this.avgTypingSpeed = avgInterval;
      
      // Track fastest burst
      for (let i = 1; i < recent.length; i++) {
        const interval = recent[i] - recent[i-1];
        if (interval < this.maxBurstSpeed) {
          this.maxBurstSpeed = interval;
        }
      }
    }
  }

  recordPaste() {
    this.pasteCount++;
  }

  recordDelete() {
    this.deleteCount++;
  }

  /**
   * Detect suspicious typing patterns
   */
  detectAnomaly(answerLength) {
    const issues = [];
    
    // Very long answer with minimal typing
    if (answerLength > 200 && this.keyPressCount < 50) {
      issues.push({
        type: "low_keystroke_ratio",
        severity: "high",
        message: "Answer appears to be copy-pasted"
      });
    }
    
    // Impossibly fast typing (< 30ms between keys consistently)
    if (this.maxBurstSpeed < 30 && this.keyPressCount > 20) {
      issues.push({
        type: "inhuman_typing_speed",
        severity: "medium",
        message: "Typing speed exceeds human limits"
      });
    }
    
    // High paste count relative to answer length
    if (this.pasteCount > 5 && answerLength > 100) {
      issues.push({
        type: "excessive_pasting",
        severity: "low",
        message: "Multiple paste operations detected"
      });
    }
    
    return issues;
  }

  reset() {
    this.keyPressTimestamps = [];
    this.keyPressCount = 0;
    this.pasteCount = 0;
    this.deleteCount = 0;
    this.avgTypingSpeed = 0;
    this.maxBurstSpeed = Infinity;
  }

  getStats() {
    return {
      keyPressCount: this.keyPressCount,
      pasteCount: this.pasteCount,
      deleteCount: this.deleteCount,
      avgTypingSpeed: Math.round(this.avgTypingSpeed),
      maxBurstSpeed: this.maxBurstSpeed === Infinity ? 0 : this.maxBurstSpeed,
    };
  }
}

// ========== Risk Scoring ==========

/**
 * Weight configuration for different violation types
 */
const VIOLATION_WEIGHTS = {
  tabSwitch: 15,
  windowBlur: 10,
  devTools: 25,
  fullscreen: 8,
  windowMove: 5,
  suspiciousTiming: 20,
  deviceChange: 30,
  ipChange: 25,
  copyPaste: 5,
  printScreen: 15,
};

/**
 * Calculate risk score based on violations
 * @param {Object} violations - Object with violation types and counts
 * @returns {Object} - Risk score and level
 */
export const calculateRiskScore = (violations) => {
  if (!violations || typeof violations !== "object") {
    return { score: 0, level: "low", color: "green" };
  }
  
  let score = 0;
  
  for (const [type, count] of Object.entries(violations)) {
    const weight = VIOLATION_WEIGHTS[type] || 5;
    const violationCount = typeof count === "number" ? count : 1;
    score += weight * violationCount;
  }
  
  // Cap at 100
  score = Math.min(100, score);
  
  // Determine risk level
  let level, color;
  if (score <= 20) {
    level = "low";
    color = "green";
  } else if (score <= 50) {
    level = "medium";
    color = "yellow";
  } else if (score <= 75) {
    level = "high";
    color = "orange";
  } else {
    level = "critical";
    color = "red";
  }
  
  return { score, level, color };
};

// ========== Answer Timing Validation ==========

/**
 * Validate if answer timing is suspicious
 * @param {Object} answer - Answer object with timeSpent and value
 * @param {Object} question - Question object with type
 * @returns {Array} - List of timing issues found
 */
export const validateAnswerTiming = (answer, question) => {
  const issues = [];
  
  if (!answer || !question) return issues;
  
  const timeSpent = answer.timeSpent || 0;
  const answerValue = answer.selectedAnswer?.value || answer.value || "";
  const answerLength = typeof answerValue === "string" ? answerValue.length : 0;
  
  // For open answer questions
  if (question.type === "open_answer" && answerLength > 0) {
    // Calculate words per minute
    const wordCount = typeof answerValue === "string" 
      ? answerValue.split(/\s+/).filter(Boolean).length 
      : 0;
    const minutes = timeSpent / 60;
    const wpm = minutes > 0 ? wordCount / minutes : Infinity;
    
    // Check for impossibly fast answers (avg typing is 40 WPM)
    if (timeSpent < 10 && answerLength > 100) {
      issues.push({
        type: "suspiciously_fast",
        severity: "high",
        message: `Long answer written in only ${timeSpent}s`
      });
    }
    
    // Check for unusual typing speed
    if (wpm > 120 && wordCount > 20) {
      issues.push({
        type: "unusual_typing_speed",
        severity: "medium",
        message: `Typing speed of ${Math.round(wpm)} WPM exceeds normal limits`
      });
    }
  }
  
  // For multiple choice questions
  if (question.type === "multiple_choice") {
    // Check for instant answers on long questions
    const questionTextLength = question.text?.length || 0;
    if (timeSpent < 3 && questionTextLength > 200) {
      issues.push({
        type: "instant_answer",
        severity: "low",
        message: "Question answered too quickly to have been read"
      });
    }
  }
  
  return issues;
};

// ========== Session Validation ==========

/**
 * Generate a session token for the assessment
 */
export const generateSessionToken = (submissionId, userId) => {
  const sessionData = {
    submissionId,
    userId,
    startTime: Date.now(),
    fingerprint: generateFingerprint(),
    nonce: Math.random().toString(36).substring(2, 15),
  };
  
  // Encode as base64 (in production, this should be signed server-side)
  return btoa(JSON.stringify(sessionData));
};

/**
 * Validate a session token
 */
export const validateSessionToken = (token, submissionId) => {
  try {
    const decoded = JSON.parse(atob(token));
    
    if (decoded.submissionId !== submissionId) {
      return { valid: false, reason: "submission_mismatch" };
    }
    
    // Check if session is too old (max 4 hours)
    const maxDuration = 4 * 60 * 60 * 1000;
    if (Date.now() - decoded.startTime > maxDuration) {
      return { valid: false, reason: "session_expired" };
    }
    
    // Check fingerprint matches current device
    const currentFingerprint = generateFingerprint();
    if (decoded.fingerprint !== currentFingerprint) {
      return { valid: false, reason: "device_changed" };
    }
    
    return { valid: true, sessionData: decoded };
  } catch {
    return { valid: false, reason: "invalid_token" };
  }
};

// ========== Violation Formatting ==========

/**
 * Format violations for display
 */
export const formatViolations = (violations) => {
  if (!violations) return [];
  
  // Handle both array and object formats
  if (Array.isArray(violations)) {
    return violations.map(v => {
      if (typeof v === "string") return v;
      if (v.type && v.count) {
        return `${formatViolationType(v.type)}: ${v.count} time(s)`;
      }
      return JSON.stringify(v);
    });
  }
  
  if (typeof violations === "object") {
    return Object.entries(violations)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => `${formatViolationType(type)}: ${count} time(s)`);
  }
  
  return [];
};

/**
 * Format violation type for display
 */
const formatViolationType = (type) => {
  const labels = {
    tabSwitch: "Tab Switching",
    windowBlur: "Window Focus Lost",
    devTools: "Developer Tools",
    fullscreen: "Fullscreen Exit",
    windowMove: "Window Moved",
    copyPaste: "Copy/Paste Attempt",
    printScreen: "Screenshot Attempt",
    suspiciousTiming: "Suspicious Timing",
    deviceChange: "Device Changed",
  };
  
  return labels[type] || type.replace(/([A-Z])/g, " $1").trim();
};

// ========== PrintScreen Detection ==========

/**
 * Detect PrintScreen key press
 */
export const setupPrintScreenDetection = (callback) => {
  const handler = (e) => {
    // PrintScreen key
    if (e.key === "PrintScreen" || e.keyCode === 44) {
      e.preventDefault();
      callback?.("printScreen", "Screenshot attempt detected");
      return false;
    }
    
    // Windows Snipping Tool (Win+Shift+S)
    if (e.metaKey && e.shiftKey && e.key?.toLowerCase() === "s") {
      e.preventDefault();
      callback?.("printScreen", "Screenshot shortcut detected");
      return false;
    }
    
    // Mac screenshot (Cmd+Shift+3 or Cmd+Shift+4)
    if (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4")) {
      e.preventDefault();
      callback?.("printScreen", "Screenshot shortcut detected");
      return false;
    }
  };
  
  window.addEventListener("keydown", handler, true);
  window.addEventListener("keyup", handler, true);
  
  // Return cleanup function
  return () => {
    window.removeEventListener("keydown", handler, true);
    window.removeEventListener("keyup", handler, true);
  };
};

// ========== Focus Monitoring ==========

/**
 * Enhanced focus monitoring with debouncing
 */
export class FocusMonitor {
  constructor(onViolation, debounceMs = 500) {
    this.onViolation = onViolation;
    this.debounceMs = debounceMs;
    this.lastBlurTime = 0;
    this.blurCount = 0;
    this.isActive = false;
    this.handlers = {};
  }

  start() {
    if (this.isActive) return;
    
    this.handlers.blur = () => {
      const now = Date.now();
      // Debounce rapid blur events
      if (now - this.lastBlurTime > this.debounceMs) {
        this.blurCount++;
        this.onViolation?.("windowBlur", "Window lost focus");
        this.lastBlurTime = now;
      }
    };
    
    this.handlers.visibilityChange = () => {
      if (document.hidden) {
        const now = Date.now();
        if (now - this.lastBlurTime > this.debounceMs) {
          this.onViolation?.("tabSwitch", "Tab switched");
          this.lastBlurTime = now;
        }
      }
    };
    
    window.addEventListener("blur", this.handlers.blur);
    document.addEventListener("visibilitychange", this.handlers.visibilityChange);
    
    this.isActive = true;
  }

  stop() {
    if (!this.isActive) return;
    
    window.removeEventListener("blur", this.handlers.blur);
    document.removeEventListener("visibilitychange", this.handlers.visibilityChange);
    
    this.isActive = false;
  }

  getStats() {
    return {
      blurCount: this.blurCount,
    };
  }
}

// ========== Mouse Behavior Tracking ==========

/**
 * Tracks mouse behavior patterns to detect automation
 */
export class MouseBehaviorTracker {
  constructor() {
    this.movements = [];
    this.clicks = [];
    this.scrolls = [];
    this.lastPosition = null;
    this.isActive = false;
    this.handlers = {};
  }

  start() {
    if (this.isActive) return;

    this.handlers.mouseMove = (e) => {
      const now = Date.now();
      const position = { x: e.clientX, y: e.clientY, time: now };
      
      // Only record every 100ms to avoid too much data
      if (this.movements.length === 0 || 
          now - this.movements[this.movements.length - 1].time > 100) {
        this.movements.push(position);
        
        // Keep only last 100 movements
        if (this.movements.length > 100) {
          this.movements = this.movements.slice(-100);
        }
      }
      
      this.lastPosition = position;
    };

    this.handlers.click = (e) => {
      this.clicks.push({
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
        button: e.button,
      });
      
      // Keep only last 50 clicks
      if (this.clicks.length > 50) {
        this.clicks = this.clicks.slice(-50);
      }
    };

    this.handlers.scroll = () => {
      this.scrolls.push({
        time: Date.now(),
        scrollY: window.scrollY,
      });
      
      // Keep only last 30 scroll events
      if (this.scrolls.length > 30) {
        this.scrolls = this.scrolls.slice(-30);
      }
    };

    window.addEventListener("mousemove", this.handlers.mouseMove);
    window.addEventListener("click", this.handlers.click);
    window.addEventListener("scroll", this.handlers.scroll);
    
    this.isActive = true;
  }

  stop() {
    if (!this.isActive) return;
    
    window.removeEventListener("mousemove", this.handlers.mouseMove);
    window.removeEventListener("click", this.handlers.click);
    window.removeEventListener("scroll", this.handlers.scroll);
    
    this.isActive = false;
  }

  /**
   * Detect bot-like mouse behavior
   */
  detectAnomalies() {
    const issues = [];

    // Check for straight line movements (bot-like)
    if (this.movements.length >= 10) {
      const straightLineCount = this.countStraightLines();
      if (straightLineCount > this.movements.length * 0.7) {
        issues.push({
          type: "robotic_mouse",
          severity: "medium",
          message: "Mouse movements appear automated"
        });
      }
    }

    // Check for no mouse movement at all
    if (this.movements.length < 5 && this.clicks.length > 10) {
      issues.push({
        type: "no_mouse_movement",
        severity: "low",
        message: "Very few mouse movements detected"
      });
    }

    // Check for perfectly timed clicks (bot-like)
    if (this.clicks.length >= 5) {
      const clickIntervals = [];
      for (let i = 1; i < this.clicks.length; i++) {
        clickIntervals.push(this.clicks[i].time - this.clicks[i - 1].time);
      }
      
      const avgInterval = clickIntervals.reduce((a, b) => a + b, 0) / clickIntervals.length;
      const variance = clickIntervals.reduce((sum, val) => 
        sum + Math.pow(val - avgInterval, 2), 0) / clickIntervals.length;
      
      // Very low variance suggests automation
      if (variance < 100 && clickIntervals.length > 3) {
        issues.push({
          type: "consistent_click_timing",
          severity: "medium",
          message: "Click timing suspiciously consistent"
        });
      }
    }

    return issues;
  }

  /**
   * Count movements that form straight lines
   */
  countStraightLines() {
    let straightCount = 0;
    
    for (let i = 2; i < this.movements.length; i++) {
      const p1 = this.movements[i - 2];
      const p2 = this.movements[i - 1];
      const p3 = this.movements[i];
      
      // Calculate if points are collinear (cross product close to 0)
      const crossProduct = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
      if (Math.abs(crossProduct) < 10) {
        straightCount++;
      }
    }
    
    return straightCount;
  }

  getStats() {
    return {
      totalMovements: this.movements.length,
      totalClicks: this.clicks.length,
      totalScrolls: this.scrolls.length,
      avgMovementSpeed: this.calculateAvgMovementSpeed(),
    };
  }

  calculateAvgMovementSpeed() {
    if (this.movements.length < 2) return 0;
    
    let totalDistance = 0;
    let totalTime = 0;
    
    for (let i = 1; i < this.movements.length; i++) {
      const p1 = this.movements[i - 1];
      const p2 = this.movements[i];
      
      const distance = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
      );
      const time = p2.time - p1.time;
      
      totalDistance += distance;
      totalTime += time;
    }
    
    return totalTime > 0 ? Math.round(totalDistance / (totalTime / 1000)) : 0;
  }

  reset() {
    this.movements = [];
    this.clicks = [];
    this.scrolls = [];
    this.lastPosition = null;
  }
}

// ========== Comprehensive Anomaly Detection ==========

/**
 * Analyzes an entire submission for anomalies
 * @param {Object} submission - The submission data
 * @param {Object} assessment - The assessment data
 * @returns {Object} - Comprehensive analysis results
 */
export const analyzeSubmission = (submission, assessment) => {
  const analysis = {
    overallRisk: "low",
    riskScore: 0,
    anomalies: [],
    summary: "",
    recommendations: [],
  };

  if (!submission || !assessment) return analysis;

  // 1. Check violations
  if (submission.violations) {
    const riskResult = calculateRiskScore(submission.violations);
    analysis.riskScore = riskResult.score;
    analysis.overallRisk = riskResult.level;
  }

  // 2. Check timing anomalies per answer
  if (submission.answers && assessment.questions) {
    for (const answer of submission.answers) {
      const question = assessment.questions.find(q => q.id === answer.questionId);
      if (question) {
        const timingIssues = validateAnswerTiming(answer, question);
        if (timingIssues.length > 0) {
          analysis.anomalies.push(...timingIssues.map(issue => ({
            ...issue,
            questionId: answer.questionId,
          })));
        }
      }
    }
  }

  // 3. Check overall completion time
  if (submission.startedAt && submission.submittedAt) {
    const startTime = submission.startedAt.toDate ? 
      submission.startedAt.toDate().getTime() : 
      new Date(submission.startedAt).getTime();
    const endTime = submission.submittedAt.toDate ? 
      submission.submittedAt.toDate().getTime() : 
      new Date(submission.submittedAt).getTime();
    
    const totalMinutes = (endTime - startTime) / (1000 * 60);
    const expectedMinutes = assessment.duration || 60;
    
    // Suspiciously fast completion (less than 20% of expected time)
    if (totalMinutes < expectedMinutes * 0.2 && assessment.questions?.length > 5) {
      analysis.anomalies.push({
        type: "very_fast_completion",
        severity: "high",
        message: `Completed in ${Math.round(totalMinutes)} minutes (expected: ${expectedMinutes})`
      });
    }
  }

  // 4. Check for forced submission
  if (submission.forcedSubmission) {
    analysis.anomalies.push({
      type: "forced_submission",
      severity: "high",
      message: "Assessment was auto-submitted due to violations"
    });
  }

  // 5. Check answer patterns
  if (submission.answers) {
    const answerPatterns = analyzeAnswerPatterns(submission.answers);
    analysis.anomalies.push(...answerPatterns);
  }

  // Update overall risk based on anomaly count
  const highSeverityCount = analysis.anomalies.filter(a => a.severity === "high").length;
  const mediumSeverityCount = analysis.anomalies.filter(a => a.severity === "medium").length;
  
  const anomalyScore = (highSeverityCount * 20) + (mediumSeverityCount * 10);
  analysis.riskScore = Math.min(100, analysis.riskScore + anomalyScore);
  
  // Update risk level
  if (analysis.riskScore >= 75) {
    analysis.overallRisk = "critical";
  } else if (analysis.riskScore >= 50) {
    analysis.overallRisk = "high";
  } else if (analysis.riskScore >= 25) {
    analysis.overallRisk = "medium";
  }

  // Generate summary and recommendations
  analysis.summary = generateAnalysisSummary(analysis);
  analysis.recommendations = generateRecommendations(analysis);

  return analysis;
};

/**
 * Analyze answer patterns for anomalies
 */
const analyzeAnswerPatterns = (answers) => {
  const anomalies = [];
  
  // Check for all answers being the same (for MCQ)
  const mcqAnswers = answers.filter(a => 
    a.selectedAnswer?.value !== undefined && typeof a.selectedAnswer.value === "number"
  );
  
  if (mcqAnswers.length >= 5) {
    const answerValues = mcqAnswers.map(a => a.selectedAnswer.value);
    const uniqueAnswers = new Set(answerValues);
    
    if (uniqueAnswers.size === 1) {
      anomalies.push({
        type: "same_answer_pattern",
        severity: "high",
        message: "All multiple choice answers are the same option"
      });
    }
    
    // Check for sequential pattern (A, B, C, D, A, B, C, D...)
    const isSequential = answerValues.every((val, idx) => 
      val === idx % 4
    );
    if (isSequential && mcqAnswers.length >= 8) {
      anomalies.push({
        type: "sequential_pattern",
        severity: "medium",
        message: "Answers follow a sequential pattern"
      });
    }
  }

  return anomalies;
};

/**
 * Generate human-readable summary
 */
const generateAnalysisSummary = (analysis) => {
  const { overallRisk, anomalies } = analysis;
  
  if (anomalies.length === 0) {
    return "No anomalies detected. Submission appears legitimate.";
  }
  
  const highCount = anomalies.filter(a => a.severity === "high").length;
  const mediumCount = anomalies.filter(a => a.severity === "medium").length;
  
  let summary = `Found ${anomalies.length} potential issue(s): `;
  if (highCount > 0) summary += `${highCount} high severity, `;
  if (mediumCount > 0) summary += `${mediumCount} medium severity. `;
  
  summary += `Overall risk level: ${overallRisk.toUpperCase()}.`;
  
  return summary;
};

/**
 * Generate recommendations based on analysis
 */
const generateRecommendations = (analysis) => {
  const recommendations = [];
  
  if (analysis.overallRisk === "critical") {
    recommendations.push("Consider flagging this submission for manual review");
    recommendations.push("Verify student identity before accepting the grade");
  }
  
  if (analysis.anomalies.some(a => a.type === "forced_submission")) {
    recommendations.push("Review violation history in detail");
  }
  
  if (analysis.anomalies.some(a => a.type === "very_fast_completion")) {
    recommendations.push("Compare completion time with other students");
  }
  
  if (analysis.anomalies.some(a => a.type.includes("timing"))) {
    recommendations.push("Check if answers show understanding or just pattern matching");
  }
  
  if (recommendations.length === 0 && analysis.overallRisk !== "low") {
    recommendations.push("Monitor this student's future submissions");
  }
  
  return recommendations;
};

// ========== Export Default ==========

export default {
  generateFingerprint,
  detectDevTools,
  TypingAnalytics,
  calculateRiskScore,
  validateAnswerTiming,
  generateSessionToken,
  validateSessionToken,
  formatViolations,
  setupPrintScreenDetection,
  FocusMonitor,
  MouseBehaviorTracker,
  analyzeSubmission,
};
