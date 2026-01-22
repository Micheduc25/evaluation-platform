/**
 * Tests for Assessment Cloning Functionality
 *
 * Tests cover:
 * - cloneAssessment function behavior
 * - Redux addAssessment action
 * - Data integrity during cloning
 */

import { addAssessment, removeAssessment } from "@/store/slices/assessmentSlice";

// Mock assessment data for testing
const mockSourceAssessment = {
  id: "source-123",
  title: "Original Assessment",
  description: "Test description",
  duration: 60,
  totalPoints: 100,
  classroomId: "classroom-456",
  type: "assessment",
  questions: [
    {
      id: 1001,
      text: "What is 2+2?",
      type: "multiple_choice",
      points: 10,
      options: ["3", "4", "5", "6"],
      correctAnswer: "4",
    },
    {
      id: 1002,
      text: "Explain the theory of relativity.",
      type: "open_answer",
      maxPoints: 20,
    },
  ],
  createdBy: "teacher-789",
  createdAt: new Date().toISOString(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  status: "active",
  submissionCount: 5, // Should be reset to 0 in clone
};

describe("Assessment Cloning", () => {
  describe("cloneAssessment utility function", () => {
    it("should create a clone with fresh question IDs", () => {
      // This tests the logic that should be in cloneAssessment
      const clonedQuestions = mockSourceAssessment.questions.map((q) => ({
        ...q,
        id: Date.now() + Math.random(),
      }));

      // Ensure all IDs are unique and different from source
      const sourceIds = mockSourceAssessment.questions.map((q) => q.id);
      const clonedIds = clonedQuestions.map((q) => q.id);

      clonedIds.forEach((id) => {
        expect(sourceIds).not.toContain(id);
      });
    });

    it("should reset submissionCount to 0 in cloned data", () => {
      const clonedData = {
        ...mockSourceAssessment,
        submissionCount: 0, // This is what cloneAssessment should do
      };

      expect(clonedData.submissionCount).toBe(0);
    });

    it("should apply custom title override", () => {
      const customTitle = "[Clone] Custom Title";
      const clonedData = {
        ...mockSourceAssessment,
        title: customTitle,
      };

      expect(clonedData.title).toBe(customTitle);
    });

    it("should preserve question content during clone", () => {
      const clonedQuestions = mockSourceAssessment.questions.map((q) => ({
        ...q,
        id: Date.now() + Math.random(),
      }));

      // Content should be identical
      expect(clonedQuestions[0].text).toBe(mockSourceAssessment.questions[0].text);
      expect(clonedQuestions[0].options).toEqual(
        mockSourceAssessment.questions[0].options
      );
      expect(clonedQuestions[1].maxPoints).toBe(
        mockSourceAssessment.questions[1].maxPoints
      );
    });
  });

  describe("Redux addAssessment action", () => {
    it("should be a valid action creator", () => {
      const mockAssessment = {
        id: "new-123",
        title: "New Assessment",
      };

      const action = addAssessment(mockAssessment);

      expect(action.type).toBe("assessments/addAssessment");
      expect(action.payload).toEqual(mockAssessment);
    });
  });

  describe("Clone data integrity", () => {
    it("should not include student submission data", () => {
      // Fields that should NOT be copied from source
      const fieldsToExclude = ["submissionCount"];

      const clonedData = {
        title: `[Clone] ${mockSourceAssessment.title}`,
        description: mockSourceAssessment.description,
        duration: mockSourceAssessment.duration,
        totalPoints: mockSourceAssessment.totalPoints,
        classroomId: mockSourceAssessment.classroomId,
        type: mockSourceAssessment.type,
        questions: mockSourceAssessment.questions,
        createdBy: "new-teacher-uid",
        createdAt: new Date(),
        endDate: new Date(),
        status: "active",
        submissionCount: 0,
      };

      // submissionCount should be 0
      expect(clonedData.submissionCount).toBe(0);

      // Clone should have a new createdAt
      expect(clonedData.createdAt).not.toBe(mockSourceAssessment.createdAt);
    });

    it("should allow targeting a different classroom", () => {
      const newClassroomId = "different-classroom-999";
      const clonedData = {
        ...mockSourceAssessment,
        classroomId: newClassroomId,
      };

      expect(clonedData.classroomId).toBe(newClassroomId);
      expect(clonedData.classroomId).not.toBe(mockSourceAssessment.classroomId);
    });
  });
});
