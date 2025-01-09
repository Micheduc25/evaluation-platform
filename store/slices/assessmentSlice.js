import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  assessments: [],
  isLoading: false,
  error: null,
};

const assessmentSlice = createSlice({
  name: "assessments",
  initialState,
  reducers: {
    setAssessments: (state, action) => {
      state.assessments = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    removeAssessment: (state, action) => {
      state.assessments = state.assessments.filter(
        (assessment) => assessment.id !== action.payload
      );
    },
    updateAssessment: (state, action) => {
      const index = state.assessments.findIndex(
        (a) => a.id === action.payload.id
      );
      if (index !== -1) {
        state.assessments[index] = action.payload;
      }
    },
    updateSubmissionGrade: (state, action) => {
      const { submissionId, questionId, points, feedback } = action.payload;
      // Update submission grade in state if needed
    },
    setGradingStatus: (state, action) => {
      state.gradingStatus = action.payload;
    },
  },
});

export const {
  setAssessments,
  setLoading,
  setError,
  removeAssessment,
  updateAssessment,
  updateSubmissionGrade,
  setGradingStatus,
} = assessmentSlice.actions;
export default assessmentSlice.reducer;
