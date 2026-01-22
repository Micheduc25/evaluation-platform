/**
 * Tests for Anti-Cheat Service
 * 
 * Tests cover:
 * - Browser fingerprinting
 * - Risk score calculation
 * - Answer timing validation
 * - Session token generation/validation
 * - Violation formatting
 */

import {
  generateFingerprint,
  calculateRiskScore,
  validateAnswerTiming,
  generateSessionToken,
  validateSessionToken,
  formatViolations,
  TypingAnalytics,
} from "@/services/antiCheatService";

// Mock browser APIs
const mockWindow = {
  screen: { width: 1920, height: 1080, colorDepth: 24 },
  navigator: {
    userAgent: "Mozilla/5.0 Test",
    language: "en-US",
    hardwareConcurrency: 8,
    deviceMemory: 8,
    platform: "MacIntel",
    maxTouchPoints: 0,
  },
};

describe("antiCheatService", () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe("generateFingerprint", () => {
    it("should generate a non-empty fingerprint string", () => {
      const fingerprint = generateFingerprint();
      expect(typeof fingerprint).toBe("string");
      expect(fingerprint.length).toBeGreaterThan(0);
    });

    it("should generate consistent fingerprints for the same environment", () => {
      const fp1 = generateFingerprint();
      const fp2 = generateFingerprint();
      expect(fp1).toBe(fp2);
    });
  });

  describe("calculateRiskScore", () => {
    it("should return zero score for empty violations", () => {
      const result = calculateRiskScore({});
      expect(result.score).toBe(0);
      expect(result.level).toBe("low");
    });

    it("should return zero for null violations", () => {
      const result = calculateRiskScore(null);
      expect(result.score).toBe(0);
      expect(result.level).toBe("low");
    });

    it("should calculate score based on violation weights", () => {
      const violations = {
        tabSwitch: 2, // 15 * 2 = 30
        devTools: 1,  // 25 * 1 = 25
      };
      const result = calculateRiskScore(violations);
      expect(result.score).toBe(55);
      expect(result.level).toBe("high");
    });

    it("should cap score at 100", () => {
      const violations = {
        tabSwitch: 10,
        devTools: 10,
        deviceChange: 5,
      };
      const result = calculateRiskScore(violations);
      expect(result.score).toBe(100);
      expect(result.level).toBe("critical");
    });

    it("should return correct risk levels", () => {
      expect(calculateRiskScore({ tabSwitch: 1 }).level).toBe("low");
      expect(calculateRiskScore({ tabSwitch: 2 }).level).toBe("medium");
      expect(calculateRiskScore({ devTools: 2, tabSwitch: 2 }).level).toBe("high");
      expect(calculateRiskScore({ devTools: 5, tabSwitch: 5 }).level).toBe("critical");
    });
  });

  describe("validateAnswerTiming", () => {
    it("should return empty array for valid timing", () => {
      const answer = { 
        timeSpent: 60, 
        selectedAnswer: { value: "This is a short answer." } 
      };
      const question = { type: "open_answer" };
      
      const issues = validateAnswerTiming(answer, question);
      expect(issues).toEqual([]);
    });

    it("should detect suspiciously fast long answers", () => {
      const answer = {
        timeSpent: 5,
        selectedAnswer: { 
          value: "A".repeat(150) // 150 character answer in 5 seconds
        }
      };
      const question = { type: "open_answer" };
      
      const issues = validateAnswerTiming(answer, question);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe("suspiciously_fast");
      expect(issues[0].severity).toBe("high");
    });

    it("should detect unusual typing speed", () => {
      const answer = {
        timeSpent: 10, // 10 seconds
        selectedAnswer: { 
          // 50 words in 10 seconds = 300 WPM (impossible)
          value: Array(50).fill("word").join(" ")
        }
      };
      const question = { type: "open_answer" };
      
      const issues = validateAnswerTiming(answer, question);
      expect(issues.some(i => i.type === "unusual_typing_speed")).toBe(true);
    });

    it("should detect instant multiple choice answers on long questions", () => {
      const answer = { timeSpent: 2, selectedAnswer: { value: 0 } };
      const question = { 
        type: "multiple_choice",
        text: "A".repeat(250) // Long question
      };
      
      const issues = validateAnswerTiming(answer, question);
      expect(issues.some(i => i.type === "instant_answer")).toBe(true);
    });

    it("should handle null inputs gracefully", () => {
      expect(validateAnswerTiming(null, null)).toEqual([]);
      expect(validateAnswerTiming({}, null)).toEqual([]);
      expect(validateAnswerTiming(null, {})).toEqual([]);
    });
  });

  describe("Session Token", () => {
    const mockSubmissionId = "sub123";
    const mockUserId = "user456";

    it("should generate a valid base64 token", () => {
      const token = generateSessionToken(mockSubmissionId, mockUserId);
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
      
      // Should be valid base64
      expect(() => atob(token)).not.toThrow();
    });

    it("should contain correct session data", () => {
      const token = generateSessionToken(mockSubmissionId, mockUserId);
      const decoded = JSON.parse(atob(token));
      
      expect(decoded.submissionId).toBe(mockSubmissionId);
      expect(decoded.userId).toBe(mockUserId);
      expect(decoded.startTime).toBeDefined();
      expect(decoded.fingerprint).toBeDefined();
      expect(decoded.nonce).toBeDefined();
    });

    it("should validate correct token", () => {
      const token = generateSessionToken(mockSubmissionId, mockUserId);
      const result = validateSessionToken(token, mockSubmissionId);
      
      expect(result.valid).toBe(true);
      expect(result.sessionData).toBeDefined();
    });

    it("should reject token with wrong submission ID", () => {
      const token = generateSessionToken(mockSubmissionId, mockUserId);
      const result = validateSessionToken(token, "wrongId");
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("submission_mismatch");
    });

    it("should reject invalid token", () => {
      const result = validateSessionToken("invalid-token", mockSubmissionId);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("invalid_token");
    });
  });

  describe("formatViolations", () => {
    it("should handle object format violations", () => {
      const violations = {
        tabSwitch: 2,
        devTools: 1,
        fullscreen: 0,
      };
      
      const formatted = formatViolations(violations);
      expect(formatted.length).toBe(2); // Only non-zero
      expect(formatted[0]).toContain("Tab Switching");
      expect(formatted[0]).toContain("2 time(s)");
    });

    it("should handle array format violations", () => {
      const violations = [
        { type: "tabSwitch", count: 3 },
        { type: "devTools", count: 1 },
      ];
      
      const formatted = formatViolations(violations);
      expect(formatted.length).toBe(2);
    });

    it("should handle string array violations", () => {
      const violations = ["Tab switched", "DevTools opened"];
      
      const formatted = formatViolations(violations);
      expect(formatted).toEqual(violations);
    });

    it("should return empty array for null/undefined", () => {
      expect(formatViolations(null)).toEqual([]);
      expect(formatViolations(undefined)).toEqual([]);
    });
  });

  describe("TypingAnalytics", () => {
    let analytics;

    beforeEach(() => {
      analytics = new TypingAnalytics();
    });

    it("should track key presses", () => {
      analytics.recordKeyPress();
      analytics.recordKeyPress();
      analytics.recordKeyPress();
      
      const stats = analytics.getStats();
      expect(stats.keyPressCount).toBe(3);
    });

    it("should track paste operations", () => {
      analytics.recordPaste();
      analytics.recordPaste();
      
      const stats = analytics.getStats();
      expect(stats.pasteCount).toBe(2);
    });

    it("should detect low keystroke ratio anomaly", () => {
      // Simulate answer with minimal typing
      analytics.recordKeyPress();
      
      const anomalies = analytics.detectAnomaly(300); // Long answer
      expect(anomalies.some(a => a.type === "low_keystroke_ratio")).toBe(true);
    });

    it("should detect excessive pasting", () => {
      for (let i = 0; i < 10; i++) {
        analytics.recordPaste();
      }
      
      const anomalies = analytics.detectAnomaly(200);
      expect(anomalies.some(a => a.type === "excessive_pasting")).toBe(true);
    });

    it("should reset analytics", () => {
      analytics.recordKeyPress();
      analytics.recordPaste();
      analytics.reset();
      
      const stats = analytics.getStats();
      expect(stats.keyPressCount).toBe(0);
      expect(stats.pasteCount).toBe(0);
    });
  });
});
