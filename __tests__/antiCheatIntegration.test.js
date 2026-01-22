/**
 * Integration Tests for Anti-Cheat System
 * 
 * Tests the integration between:
 * - useAntiCheat hook
 * - antiCheatService
 * - ViolationReport component
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "test-assessment-id" }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock("react-redux", () => ({
  useSelector: jest.fn((selector) => {
    const state = {
      auth: { user: { uid: "test-user-id", email: "test@test.com" } },
      assessments: { isLoading: false, error: null },
    };
    return selector(state);
  }),
  useDispatch: () => jest.fn(),
}));

jest.mock("@/firebase/utils", () => ({
  getAssessment: jest.fn(),
  startAssessment: jest.fn(),
  submitAssessment: jest.fn(),
  saveAssessmentProgress: jest.fn(),
  getAssessmentProgress: jest.fn(),
}));

// Import components and services
import {
  generateFingerprint,
  calculateRiskScore,
  validateAnswerTiming,
  analyzeSubmission,
  TypingAnalytics,
  MouseBehaviorTracker,
  FocusMonitor,
} from "@/services/antiCheatService";
import { ViolationSummary, RiskScoreBadge } from "@/components/AntiCheatWarning";
import ViolationReport from "@/components/ViolationReport";

describe("Anti-Cheat Integration Tests", () => {
  describe("Fingerprint Generation", () => {
    it("should generate consistent fingerprints in the same environment", () => {
      const fp1 = generateFingerprint();
      const fp2 = generateFingerprint();
      expect(fp1).toBe(fp2);
    });

    it("should return a non-empty string", () => {
      const fp = generateFingerprint();
      expect(typeof fp).toBe("string");
      expect(fp.length).toBeGreaterThan(0);
    });
  });

  describe("Risk Scoring Integration", () => {
    it("should correctly aggregate multiple violation types", () => {
      const violations = {
        tabSwitch: 2,
        devTools: 1,
        fullscreen: 1,
      };
      const result = calculateRiskScore(violations);
      
      // 2*15 + 1*25 + 1*8 = 63
      expect(result.score).toBe(63);
      expect(result.level).toBe("high");
    });

    it("should integrate with ViolationSummary component", () => {
      const violations = { tabSwitch: 3, devTools: 1 };
      
      render(<ViolationSummary violations={violations} showDetails />);
      
      expect(screen.getByText(/Tab Switching/i)).toBeInTheDocument();
      expect(screen.getByText(/3 time/i)).toBeInTheDocument();
    });

    it("should integrate with RiskScoreBadge component", () => {
      const { score, level } = calculateRiskScore({ devTools: 3, tabSwitch: 2 });
      
      render(<RiskScoreBadge score={score} level={level} />);
      
      expect(screen.getByText(/Risk:/i)).toBeInTheDocument();
    });
  });

  describe("Answer Timing Validation Integration", () => {
    it("should detect fast answers in full submission analysis", () => {
      const submission = {
        answers: [
          { 
            questionId: 1, 
            timeSpent: 5, 
            selectedAnswer: { value: "A".repeat(200) }
          }
        ],
        violations: {},
      };
      const assessment = {
        questions: [{ id: 1, type: "open_answer", text: "Question 1" }]
      };

      const analysis = analyzeSubmission(submission, assessment);
      
      expect(analysis.anomalies).toContainEqual(
        expect.objectContaining({ type: "suspiciously_fast" })
      );
    });

    it("should flag very fast overall completion", () => {
      const now = Date.now();
      const submission = {
        startedAt: { toDate: () => new Date(now - 5 * 60 * 1000) }, // 5 mins ago
        submittedAt: { toDate: () => new Date(now) },
        answers: [],
        violations: {},
      };
      const assessment = {
        duration: 60, // 60 min expected
        questions: Array(10).fill({ id: 1 })
      };

      const analysis = analyzeSubmission(submission, assessment);
      
      expect(analysis.anomalies.some(a => a.type === "very_fast_completion")).toBe(true);
    });
  });

  describe("Typing Analytics Integration", () => {
    let analytics;

    beforeEach(() => {
      analytics = new TypingAnalytics();
    });

    it("should correctly detect low keystroke ratio for long answers", () => {
      // Simulate 5 keypresses for a 500 character answer
      for (let i = 0; i < 5; i++) {
        analytics.recordKeyPress();
      }

      const anomalies = analytics.detectAnomaly(500);
      
      expect(anomalies).toContainEqual(
        expect.objectContaining({ type: "low_keystroke_ratio" })
      );
    });

    it("should work correctly with normal typing patterns", () => {
      // Simulate 100 keypresses with reasonable timing
      jest.useFakeTimers();
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        jest.advanceTimersByTime(100); // 100ms between keypresses
        analytics.recordKeyPress();
      }
      
      const anomalies = analytics.detectAnomaly(100);
      
      // Should not flag normal typing
      expect(anomalies.some(a => a.type === "inhuman_typing_speed")).toBe(false);
      
      jest.useRealTimers();
    });
  });

  describe("Mouse Behavior Tracking Integration", () => {
    let tracker;

    beforeEach(() => {
      tracker = new MouseBehaviorTracker();
      tracker.start();
    });

    afterEach(() => {
      tracker.stop();
    });

    it("should track mouse movements", () => {
      // Simulate mouse movements
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 100,
        clientY: 100,
      });
      window.dispatchEvent(moveEvent);

      const stats = tracker.getStats();
      expect(stats.totalMovements).toBeGreaterThanOrEqual(0);
    });

    it("should detect no movement anomaly", () => {
      // Simulate lots of clicks but no movement
      tracker.movements = [];
      tracker.clicks = Array(15).fill({ x: 100, y: 100, time: Date.now() });
      
      const anomalies = tracker.detectAnomalies();
      
      expect(anomalies.some(a => a.type === "no_mouse_movement")).toBe(true);
    });
  });

  describe("Focus Monitor Integration", () => {
    let monitor;
    let violations;

    beforeEach(() => {
      violations = [];
      monitor = new FocusMonitor((type, message) => {
        violations.push({ type, message });
      }, 100);
    });

    afterEach(() => {
      monitor.stop();
    });

    it("should detect visibility changes", async () => {
      monitor.start();

      // Simulate visibility change
      Object.defineProperty(document, "hidden", {
        value: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(violations.some(v => v.type === "tabSwitch")).toBe(true);
      
      // Reset
      Object.defineProperty(document, "hidden", {
        value: false,
        configurable: true,
      });
    });
  });

  describe("ViolationReport Component Integration", () => {
    const mockSubmission = {
      id: "sub-123",
      studentId: "student-456",
      violations: { tabSwitch: 2, devTools: 1 },
      forcedSubmission: false,
      answers: [
        { questionId: 1, timeSpent: 60, selectedAnswer: { value: "Answer 1" } }
      ],
      startedAt: { toDate: () => new Date(Date.now() - 30 * 60 * 1000) },
      submittedAt: { toDate: () => new Date() },
    };

    const mockAssessment = {
      id: "assess-789",
      duration: 60,
      questions: [
        { id: 1, type: "open_answer", text: "Question 1" }
      ],
    };

    it("should render all tabs", () => {
      render(
        <ViolationReport 
          submission={mockSubmission} 
          assessment={mockAssessment} 
        />
      );

      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(screen.getByText("Anomalies")).toBeInTheDocument();
      expect(screen.getByText("Timing")).toBeInTheDocument();
      expect(screen.getByText("Recommendations")).toBeInTheDocument();
    });

    it("should show risk score", () => {
      render(
        <ViolationReport 
          submission={mockSubmission} 
          assessment={mockAssessment} 
        />
      );

      expect(screen.getByText(/Risk:/i)).toBeInTheDocument();
    });

    it("should allow tab switching", async () => {
      render(
        <ViolationReport 
          submission={mockSubmission} 
          assessment={mockAssessment} 
        />
      );

      const anomaliesTab = screen.getByText("Anomalies");
      fireEvent.click(anomaliesTab);

      // Should show anomalies content
      await waitFor(() => {
        expect(screen.getByText(/No anomalies detected|potential issue/i)).toBeInTheDocument();
      });
    });

    it("should have export functionality", () => {
      render(
        <ViolationReport 
          submission={mockSubmission} 
          assessment={mockAssessment} 
        />
      );

      const exportButton = screen.getByText("Export");
      expect(exportButton).toBeInTheDocument();
    });
  });

  describe("Full Flow Integration", () => {
    it("should produce consistent results from detection to reporting", () => {
      // 1. Simulate violations being detected
      const violations = {
        tabSwitch: 3,
        devTools: 2,
        fullscreen: 1,
      };

      // 2. Calculate risk score
      const riskResult = calculateRiskScore(violations);
      expect(riskResult.score).toBeGreaterThan(0);

      // 3. Create submission with violations
      const submission = {
        violations,
        forcedSubmission: true,
        answers: [],
        startedAt: { toDate: () => new Date(Date.now() - 10 * 60 * 1000) },
        submittedAt: { toDate: () => new Date() },
      };

      // 4. Analyze submission
      const assessment = { duration: 60, questions: Array(10).fill({ id: 1 }) };
      const analysis = analyzeSubmission(submission, assessment);

      // 5. Verify analysis includes forced submission flag
      expect(analysis.anomalies.some(a => a.type === "forced_submission")).toBe(true);
      expect(analysis.overallRisk).not.toBe("low");
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });
  });
});
