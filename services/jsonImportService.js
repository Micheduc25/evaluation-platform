/**
 * Service to handle JSON parsing and validation for assessments/tutorials import
 */

/**
 * Validates the structure of an imported assessment/tutorial JSON object
 * @param {Object} data - The parsed JSON object
 * @returns {Object} - { isValid: boolean, errors: string[], data: Object }
 */
export const validateImportJson = (data) => {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Invalid JSON format"], data: null };
  }

  // Validate required top-level fields
  if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
    errors.push("Title is required and must be a string");
  }

  // Normalize type
  const type = data.type === "tutorial" ? "tutorial" : "assessment";

  // Validate questions
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    errors.push("At least one question is required");
  } else {
    data.questions.forEach((q, index) => {
      const qNum = index + 1;
      
      if (!q.text || typeof q.text !== "string" || !q.text.trim()) {
        errors.push(`Question ${qNum}: Text is required`);
      }

      if (!["multiple_choice", "open_answer"].includes(q.type)) {
        errors.push(`Question ${qNum}: Invalid type '${q.type}'. Must be 'multiple_choice' or 'open_answer'`);
      }

      if (q.type === "multiple_choice") {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          errors.push(`Question ${qNum}: Multiple choice questions must have at least 2 options`);
        } else {
          // Check if options are strings
           q.options.forEach((opt, optIndex) => {
             if (typeof opt !== 'string') {
                errors.push(`Question ${qNum}: Option ${optIndex + 1} must be a string`);
             }
           });
        }

        if (typeof q.correctAnswer !== "number" || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
          errors.push(`Question ${qNum}: Invalid correct answer index`);
        }
        
        // Validate points if present, otherwise default will be used
        if (q.points !== undefined && (typeof q.points !== "number" || q.points < 0)) {
           errors.push(`Question ${qNum}: Points must be a non-negative number`);
        }
      } else if (q.type === "open_answer") {
         if (q.maxPoints !== undefined && (typeof q.maxPoints !== "number" || q.maxPoints < 0)) {
            errors.push(`Question ${qNum}: Max points must be a non-negative number`);
         }
      }
    });

    // Validate points total for assessments
    if (type === "assessment") {
       if (data.totalPoints !== undefined && (typeof data.totalPoints !== 'number' || data.totalPoints < 0)) {
          errors.push("Total points must be a non-negative number");
       }
       
       if (data.duration !== undefined && (typeof data.duration !== 'number' || data.duration < 0)) {
          errors.push("Duration must be a positive number");
       }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data: {
      ...data,
      type,
      // Ensure defaults
      description: data.description || "",
      questions: data.questions.map(q => ({
        ...q,
        id: Date.now() + Math.random(), // Generate temp IDs
        // Ensure strictly required fields for the UI
        points: q.type === "multiple_choice" ? (q.points || 10) : null,
        maxPoints: q.type === "open_answer" ? (q.maxPoints || 10) : null,
        options: q.type === "multiple_choice" ? q.options : [],
      }))
    }
  };
};

/**
 * Parses a JSON string
 * @param {string} jsonString 
 * @returns {Object} - Parsed object or throws error
 */
export const parseJsonString = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error("Invalid JSON syntax: " + e.message);
  }
};
