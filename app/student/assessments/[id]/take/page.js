"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-hot-toast";
import DOMPurify from "isomorphic-dompurify";

import {
  getAssessment,
  startAssessment,
  submitAssessment, 
  saveAssessmentProgress,
  getAssessmentProgress,
} from "@/firebase/utils";
import { setLoading, setError } from "@/store/slices/assessmentSlice";
import { uploadFile } from "@/firebase/storage";

import AssessmentTimer from "./AssessmentTimer";
import AssessmentNavigation from "./AssessmentNavigation";
import QuestionRenderer from "./QuestionRenderer";
import SubmitConfirmModal from "./SubmitConfirmModal";

import AntiCheatWarning from "@/components/AntiCheatWarning";
import { useAntiCheat } from "@/hooks/useAntiCheat";

/**
 * TakeAssessmentPage - Main component for taking assessments
 * 
 * This component coordinates:
 * - Assessment loading and state management
 * - Anti-cheat monitoring (via useAntiCheat hook)
 * - Answer submission and auto-save
 * - Navigation between questions
 */
export default function TakeAssessmentPage() {
  const { id } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  
  const user = useSelector((state) => state.auth.user);
  const isLoading = useSelector((state) => state.assessments.isLoading);
  const error = useSelector((state) => state.assessments.error);

  // Core assessment state
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submissionId, setSubmissionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [markedQuestions, setMarkedQuestions] = useState(new Set());
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("saved");
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState({});
  const [lastQuestionChangeTime, setLastQuestionChangeTime] = useState(Date.now());
  const [questionImages, setQuestionImages] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);

  // Refs
  const initializationRef = useRef(false);
  const stateRef = useRef({
    assessment: null,
    answers: {},
    submissionId: null,
    timeSpentPerQuestion: {},
    lastQuestionChangeTime: Date.now(),
    currentQuestionIndex: 0,
  });

  // Anti-cheat hook
  const antiCheat = useAntiCheat({
    submissionId,
    userId: user?.uid,
    violationLimits: {
      tabSwitch: 3,
      windowBlur: 3,
      devTools: 2,
      fullscreen: 2,
      windowMove: 2,
      printScreen: 2,
    },
    onMaxViolations: (message) => {
      handleSubmit(true);
      toast.error(message + ". Assessment submitted automatically.");
    },
    // Disable detection during loading/uploading, or while submitting, or if assessment isn't loaded
    isDisabled: uploadingImage || isLoading || !assessment || submitting,
  });

  // Keep stateRef updated
  useEffect(() => {
    stateRef.current = {
      assessment,
      answers,
      submissionId,
      violations: antiCheat.violations,
      timeSpentPerQuestion,
      lastQuestionChangeTime,
      currentQuestionIndex,
    };
  }, [assessment, answers, submissionId, antiCheat.violations, 
      timeSpentPerQuestion, lastQuestionChangeTime, currentQuestionIndex]);

  // Submit handler
  const handleSubmit = async (forced = false) => {
    // Note: Manual submission is already confirmed via SubmitConfirmModal
    // Forced submission (e.g. time up or max violations) doesn't need confirmation

    const currentState = stateRef.current;
    setSubmitting(true);

    try {
      const currentQuestion = currentState.assessment?.questions[currentState.currentQuestionIndex];
      const finalTimeSpent = {
        ...currentState.timeSpentPerQuestion,
        [currentQuestion?.id]: 
          (currentState.timeSpentPerQuestion[currentQuestion?.id] || 0) +
          Math.round((Date.now() - currentState.lastQuestionChangeTime) / 1000),
      };

      const result = await submitAssessment(currentState.submissionId, {
        assessmentId: id,
        studentId: user.uid,
        answers: Object.entries(currentState.answers).map(([questionId, answer]) => ({
          questionId: Number(questionId),
          selectedAnswer: answer,
          timeSpent: finalTimeSpent[questionId] || 0,
        })),
        submittedAt: new Date(),
        totalTimeSpent: Object.values(finalTimeSpent).reduce((a, b) => a + b, 0),
        teacherId: currentState.assessment?.createdBy,
        questions: currentState.assessment?.questions,
        forcedSubmission: forced,
        violations: currentState.violations,
        fingerprint: antiCheat.fingerprint,
      });

      toast.success(
        forced
          ? "Assessment submitted automatically due to violations"
          : "Assessment submitted successfully"
      );
      router.push(result?.redirectUrl || "/student/dashboard");
    } catch (err) {
      console.error("Error submitting assessment:", err);
      toast.error("Failed to submit assessment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Load saved progress
  const loadSavedProgress = async (submissionIdParam) => {
    try {
      const savedProgress = await getAssessmentProgress(submissionIdParam);
      if (savedProgress) {
        setAnswers(savedProgress.answers || {});
        setCurrentQuestionIndex(savedProgress.currentQuestionIndex || 0);
        setTimeSpentPerQuestion(savedProgress.timeSpentPerQuestion || {});
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to load saved progress:", err);
      return false;
    }
  };

  // Initialize assessment
  const { enterFullScreen, ignoreNextBlur } = antiCheat;
  useEffect(() => {
    if (!user || initializationRef.current) return;

    const initialize = async () => {
      // Prevent double initialization
      initializationRef.current = true;
      
      try {
        dispatch(setLoading(true));
        const assessmentData = await getAssessment(id);

        if (!assessmentData) {
          throw new Error("Assessment not found");
        }

        if (new Date() > new Date(assessmentData.endDate.seconds * 1000)) {
          throw new Error("Assessment has expired");
        }

        const newSubmissionId = await startAssessment(id, user.uid);
        setSubmissionId(newSubmissionId);
        setAssessment(assessmentData);

        const progressLoaded = await loadSavedProgress(newSubmissionId);
        if (!progressLoaded) {
          const initialAnswers = {};
          assessmentData.questions.forEach((q) => {
            initialAnswers[q.id] = null;
          });
          setAnswers(initialAnswers);
        }

        // Enter fullscreen
        enterFullScreen();
      } catch (err) {
        console.error("Initialization error:", err);
        dispatch(setError(err.message));
        toast.error(err.message);
        router.push("/student/dashboard");
      } finally {
        dispatch(setLoading(false));
      }
    };

    initialize();

    return () => {
      // Don't reset initializationRef on unmount to prevent re-runs if strict mode calls double mount
      // But we might want to if the user navigates away and back. 
      // For now, let's keep it true to be safe against double-invocations.
      // initializationRef.current = false; 
    };
  }, [id, user, router, dispatch, enterFullScreen]);

  // Auto-save effect
  useEffect(() => {
    if (!submissionId || submitting) return;

    const saveProgress = async () => {
      if (!antiCheat.isValidSaveState()) {
        setAutoSaveStatus("error");
        return;
      }

      try {
        setAutoSaveStatus("saving");
        await saveAssessmentProgress(submissionId, {
          answers,
          currentQuestionIndex,
          timeSpentPerQuestion,
          violations: antiCheat.violations,
        });
        setAutoSaveStatus("saved");
      } catch (err) {
        console.error("Auto-save failed:", err);
        setAutoSaveStatus("error");
      }
    };

    const interval = setInterval(saveProgress, 30000);
    return () => clearInterval(interval);
  }, [submissionId, answers, currentQuestionIndex, timeSpentPerQuestion, 
      submitting, antiCheat]);

  // Ref to track last question change time (avoids infinite loops in useEffect)
  const lastQuestionChangeTimeRef = useRef(Date.now());

  // Sync ref with state when state changes
  useEffect(() => {
    lastQuestionChangeTimeRef.current = lastQuestionChangeTime;
  }, [lastQuestionChangeTime]);

  // Question time tracking - only trigger on currentQuestionIndex changes
  useEffect(() => {
    // Record the index when this effect runs
    const currentIndex = currentQuestionIndex;
    
    return () => {
      // Cleanup: record time spent on the question being navigated away from
      if (assessment?.questions[currentIndex]) {
        const questionId = assessment.questions[currentIndex].id;
        const timeSpent = Math.round((Date.now() - lastQuestionChangeTimeRef.current) / 1000);
        setTimeSpentPerQuestion((prev) => ({
          ...prev,
          [questionId]: (prev[questionId] || 0) + timeSpent,
        }));
        // Update lastQuestionChangeTime for the new question
        setLastQuestionChangeTime(Date.now());
      }
    };
  }, [currentQuestionIndex, assessment]);

  // Answer input handler
  const handleAnswerInput = async (questionId, value, type, images = []) => {
    if (!antiCheat.isValidSaveState()) {
      toast.error("Cannot save changes due to violation of exam rules");
      return;
    }

    // Record typing activity
    antiCheat.recordKeyPress();

    const newAnswers = {
      ...answers,
      [questionId]: { value, type, images, timestamp: new Date().toISOString() },
    };
    setAnswers(newAnswers);

    try {
      setAutoSaveStatus("saving");
      await saveAssessmentProgress(submissionId, {
        answers: newAnswers,
        currentQuestionIndex,
        timeSpentPerQuestion,
        violations: antiCheat.violations,
      });
      setAutoSaveStatus("saved");
    } catch (err) {
      console.error("Failed to save answer:", err);
      setAutoSaveStatus("error");
    }
  };

  // Image upload handler
  const handleQuestionImageUpload = async (file, questionId) => {
    try {
      setUploadingImage(true);
      const result = await uploadFile(
        file,
        `assessments/${id}/submissions/${submissionId}/images`
      );

      const currentAnswer = answers[questionId] || { value: "", images: [] };
      const newImages = [...(currentAnswer.images || []), result];
      
      handleAnswerInput(questionId, currentAnswer.value, "open_answer", newImages);
      setQuestionImages((prev) => ({
        ...prev,
        [questionId]: [...(prev[questionId] || []), result],
      }));
    } catch (err) {
      toast.error("Failed to upload image");
      console.error("Image upload error:", err);
    } finally {
      setUploadingImage(false);
    }
  };

  // Navigation
  const navigateQuestions = async (direction) => {
    if (!antiCheat.isValidSaveState()) {
      toast.error("Cannot save progress due to violation of exam rules");
      return;
    }

    const newIndex = currentQuestionIndex + direction;
    if (newIndex >= 0 && newIndex < assessment.questions.length) {
      try {
        setAutoSaveStatus("saving");
        await saveAssessmentProgress(submissionId, {
          answers,
          currentQuestionIndex: newIndex,
          timeSpentPerQuestion,
          violations: antiCheat.violations,
        });
        setAutoSaveStatus("saved");
        setCurrentQuestionIndex(newIndex);
      } catch (err) {
        console.error("Failed to save progress while navigating:", err);
        setAutoSaveStatus("error");
        setCurrentQuestionIndex(newIndex);
      }
    }
  };

  const toggleMarkQuestion = (questionId) => {
    setMarkedQuestions((prev) => {
      const newMarked = new Set(prev);
      if (newMarked.has(questionId)) {
        newMarked.delete(questionId);
      } else {
        newMarked.add(questionId);
      }
      return newMarked;
    });
  };

  const getQuestionStatus = (questionId) => {
    if (markedQuestions.has(questionId)) return "marked";
    if (answers[questionId] !== null) return "answered";
    return "unanswered";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => router.push("/student/dashboard")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!assessment) return null;

  const currentQuestion = assessment.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Anti-cheat warning modal */}
      <AntiCheatWarning
        isOpen={antiCheat.showWarning}
        message={antiCheat.warningMessage}
        onDismiss={antiCheat.dismissWarning}
        severity={antiCheat.hasExceededLimits() ? "critical" : "warning"}
      />

      {/* Submit confirmation modal */}
      <SubmitConfirmModal
        isOpen={showConfirmSubmit}
        onClose={() => setShowConfirmSubmit(false)}
        onConfirm={() => handleSubmit(false)}
        unansweredCount={
          assessment.questions.filter((q) => answers[q.id] === null).length
        }
        markedCount={markedQuestions.size}
        submitting={submitting}
      />

      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800 truncate">
            {assessment.title}
          </h1>
          <div className="flex items-center space-x-4">
            <AssessmentTimer
              duration={assessment.duration}
              onTimeUp={() => handleSubmit(true)}
            />
            <button
              onClick={() => setShowConfirmSubmit(true)}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <QuestionRenderer
            question={currentQuestion}
            questionIndex={currentQuestionIndex}
            totalQuestions={assessment.questions.length}
            answer={answers[currentQuestion.id]}
            isMarked={markedQuestions.has(currentQuestion.id)}
            onAnswerChange={(value, type, images) => 
              handleAnswerInput(currentQuestion.id, value, type, images)
            }
            onMarkToggle={() => toggleMarkQuestion(currentQuestion.id)}
            onImageUpload={(file) => 
              handleQuestionImageUpload(file, currentQuestion.id)
            }
            uploadingImage={uploadingImage}
            isUploadDisabled={!antiCheat.isValidSaveState()}
            onUploadStart={() => setUploadingImage(true)}
            onUploadEnd={() => setUploadingImage(false)}
            onBrowse={ignoreNextBlur}
          />
        </div>

        {/* Navigation */}
        <AssessmentNavigation
          currentIndex={currentQuestionIndex}
          totalQuestions={assessment.questions.length}
          questions={assessment.questions}
          getQuestionStatus={getQuestionStatus}
          onNavigate={(index) => {
            const direction = index - currentQuestionIndex;
            navigateQuestions(direction);
          }}
          onPrevious={() => navigateQuestions(-1)}
          onNext={() => navigateQuestions(1)}
        />
      </div>

      {/* Auto-save indicator */}
      <div className="fixed bottom-4 right-4">
        <span className={`px-3 py-1 rounded-full text-sm ${
          autoSaveStatus === "saved" ? "bg-green-100 text-green-800" :
          autoSaveStatus === "saving" ? "bg-yellow-100 text-yellow-800" :
          "bg-red-100 text-red-800"
        }`}>
          {autoSaveStatus === "saved" ? "All changes saved" :
           autoSaveStatus === "saving" ? "Saving..." : "Failed to save"}
        </span>
      </div>
    </div>
  );
}
