import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import assessmentReducer from "./slices/assessmentSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    assessments: assessmentReducer,
  },
});