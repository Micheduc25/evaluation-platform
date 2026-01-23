
import { validateImportJson } from '@/services/jsonImportService';

describe('JSON Import Validation', () => {
  const validAssessment = {
    title: "Valid Assessment",
    type: "assessment",
    description: "A test assessment",
    questions: [
      {
        text: "Q1",
        type: "multiple_choice",
        options: ["A", "B", "C", "D"],
        correctAnswer: 0,
        points: 5
      }
    ],
    totalPoints: 5,
    duration: 30,
    endDate: "2024-12-31T23:59:00Z"
  };

  const validTutorial = {
    title: "Valid Tutorial",
    type: "tutorial",
    questions: [
      {
        text: "Q1",
        type: "open_answer",
        maxPoints: 10
      }
    ]
  };

  test('validates a correct assessment JSON', () => {
    const result = validateImportJson(validAssessment);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data.title).toBe(validAssessment.title);
    expect(result.data.type).toBe("assessment");
  });

  test('validates a correct tutorial JSON', () => {
    const result = validateImportJson(validTutorial);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data.type).toBe("tutorial");
  });

  test('detects missing title', () => {
    const invalid = { ...validAssessment, title: "" };
    const result = validateImportJson(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining("Title is required"));
  });

  test('detects empty questions array', () => {
    const invalid = { ...validAssessment, questions: [] };
    const result = validateImportJson(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining("At least one question is required"));
  });

  test('validates question structure', () => {
    const invalidQuestion = {
      title: "Test",
      questions: [
        {
          // missing text
          type: "multiple_choice",
          options: ["A", "B"],
          correctAnswer: 0
        }
      ]
    };
    const result = validateImportJson(invalidQuestion);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes("Text is required"))).toBe(true);
  });

  test('validates multiple choice options', () => {
      const invalidOptions = {
        ...validAssessment,
        questions: [
          {
            text: "Q1",
            type: "multiple_choice",
            options: ["Only One"], // Need at least 2
            correctAnswer: 0
          }
        ]
      };
      const result = validateImportJson(invalidOptions);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("must have at least 2 options"))).toBe(true);
  });
  
  test('validates invalid question types', () => {
    const invalidType = {
        ...validAssessment,
        questions: [
            {
                text: "Q1",
                type: "invalid_type",
                options: ["A", "B"],
                correctAnswer: 0
            }
        ]
    };
    const result = validateImportJson(invalidType);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes("Invalid type"))).toBe(true);
  });

  test('adds default values where missing', () => {
     const minimal = {
         title: "Minimal",
         questions: [
             {
                 text: "Q1",
                 type: "multiple_choice",
                 options: ["A", "B"],
                 correctAnswer: 0
             }
         ]
     };
     
     const result = validateImportJson(minimal);
     expect(result.isValid).toBe(true);
     expect(result.data.type).toBe("assessment");
     expect(result.data.description).toBe("");
     // Check if default points were added
     expect(result.data.questions[0].points).toBe(10);
  });
});
