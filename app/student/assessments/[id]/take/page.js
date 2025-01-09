"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import {
  getAssessment,
  startAssessment,
  submitAssessment,
} from "@/firebase/utils";
import { setLoading, setError } from "@/store/slices/assessmentSlice";
import AssessmentTimer from "./AssessmentTimer";
import { toast } from "react-hot-toast";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FlagIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

export default function TakeAssessmentPage() {
  const { id } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const isLoading = useSelector((state) => state.assessments.isLoading);
  const error = useSelector((state) => state.assessments.error);

  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submissionId, setSubmissionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [markedQuestions, setMarkedQuestions] = useState(new Set());
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("saved"); // 'saved', 'saving', 'error'
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState({});
  const [lastQuestionChangeTime, setLastQuestionChangeTime] = useState(
    Date.now()
  );

  // Initialize assessment and handle auto-save
  useEffect(() => {
    let autoSaveTimer;

    const initializeAssessment = async () => {
      try {
        dispatch(setLoading(true));
        const assessmentData = await getAssessment(id);

        if (!assessmentData) {
          throw new Error("Assessment not found");
        }

        if (new Date() > assessmentData.endDate.toDate()) {
          throw new Error("Assessment has expired");
        }

        const submissionId = await startAssessment(id, user.uid);
        setSubmissionId(submissionId);
        setAssessment(assessmentData);

        const initialAnswers = {};
        assessmentData.questions.forEach((q) => (initialAnswers[q.id] = null));
        setAnswers(initialAnswers);
      } catch (error) {
        dispatch(setError(error.message));
        toast.error(error.message);
        router.push("/student/dashboard");
      } finally {
        dispatch(setLoading(false));
      }
    };

    if (user) {
      initializeAssessment();
    }

    // Auto-save answers every 30 seconds
    autoSaveTimer = setInterval(async () => {
      if (submissionId && Object.keys(answers).length > 0) {
        try {
          setAutoSaveStatus("saving");
          await updateSubmissionProgress(submissionId, answers);
          setAutoSaveStatus("saved");
        } catch (error) {
          console.error("Auto-save failed:", error);
          setAutoSaveStatus("error");
        }
      }
    }, 30000);

    return () => clearInterval(autoSaveTimer);
  }, [id, user, dispatch, router]);

  // Update time spent when changing questions
  useEffect(() => {
    const updateTimeSpent = () => {
      const now = Date.now();
      const timeSpent = Math.round((now - lastQuestionChangeTime) / 1000); // Convert to seconds

      if (assessment?.questions[currentQuestionIndex]) {
        const questionId = assessment.questions[currentQuestionIndex].id;
        setTimeSpentPerQuestion((prev) => ({
          ...prev,
          [questionId]: (prev[questionId] || 0) + timeSpent,
        }));
      }
    };

    // Update time spent when unmounting or changing questions
    return () => {
      updateTimeSpent();
      setLastQuestionChangeTime(Date.now());
    };
  }, [currentQuestionIndex, assessment, lastQuestionChangeTime]);

  // Handle answer selection with auto-save
  const handleAnswerSelect = async (questionId, answerIndex) => {
    const newAnswers = {
      ...answers,
      [questionId]: answerIndex,
    };
    setAnswers(newAnswers);

    // Attempt to save progress
    try {
      setAutoSaveStatus("saving");
      await updateSubmissionProgress(submissionId, newAnswers);
      setAutoSaveStatus("saved");
    } catch (error) {
      console.error("Failed to save answer:", error);
      setAutoSaveStatus("error");
    }
  };

  const handleAnswerInput = async (questionId, value, type) => {
    const newAnswers = {
      ...answers,
      [questionId]: {
        value,
        type,
        timestamp: new Date().toISOString(),
      },
    };
    setAnswers(newAnswers);

    try {
      setAutoSaveStatus("saving");
      await updateSubmissionProgress(submissionId, newAnswers);
      setAutoSaveStatus("saved");
    } catch (error) {
      console.error("Failed to save answer:", error);
      setAutoSaveStatus("error");
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

  const navigateQuestions = (direction) => {
    const newIndex = currentQuestionIndex + direction;
    if (newIndex >= 0 && newIndex < assessment.questions.length) {
      setCurrentQuestionIndex(newIndex);
    }
  };

  const getQuestionStatus = (questionId) => {
    if (markedQuestions.has(questionId)) return "marked";
    if (answers[questionId] !== null) return "answered";
    return "unanswered";
  };

  const handleSubmit = async () => {
    if (!confirm("Are you sure you want to submit your assessment?")) return;

    // Update time spent for the current question before submitting
    const finalTimeSpent = {
      ...timeSpentPerQuestion,
      [assessment.questions[currentQuestionIndex].id]:
        (timeSpentPerQuestion[assessment.questions[currentQuestionIndex].id] ||
          0) + Math.round((Date.now() - lastQuestionChangeTime) / 1000),
    };

    setSubmitting(true);
    try {
      const result = await submitAssessment(submissionId, {
        assessmentId: id,
        studentId: user.uid,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId: Number(questionId),
          selectedAnswer: answer,
          timeSpent: finalTimeSpent[questionId] || 0,
        })),
        submittedAt: new Date(),
        totalTimeSpent: Object.values(finalTimeSpent).reduce(
          (a, b) => a + b,
          0
        ),
      });

      toast.success("Assessment submitted successfully");

      // Redirect to results page if available, otherwise to dashboard
      router.push(result?.redirectUrl || "/student/dashboard");
    } catch (error) {
      console.error("Error submitting assessment:", error);
      toast.error("Failed to submit assessment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <ExclamationCircleIcon className="h-12 w-12 text-red-500 mb-4" />
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

  // Add auto-save status indicator
  const AutoSaveIndicator = () => (
    <div className="fixed bottom-4 right-4">
      <span
        className={`px-3 py-1 rounded-full text-sm ${
          autoSaveStatus === "saved"
            ? "bg-green-100 text-green-800"
            : autoSaveStatus === "saving"
            ? "bg-yellow-100 text-yellow-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {autoSaveStatus === "saved"
          ? "All changes saved"
          : autoSaveStatus === "saving"
          ? "Saving..."
          : "Failed to save"}
      </span>
    </div>
  );

  const renderQuestion = (question) => {
    switch (question.type) {
      case "multiple_choice":
        return (
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <label
                key={idx}
                className={`flex items-center p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                  answers[question.id]?.value === idx
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={idx}
                  checked={answers[question.id]?.value === idx}
                  onChange={() =>
                    handleAnswerInput(question.id, idx, "multiple_choice")
                  }
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-3">{option}</span>
              </label>
            ))}
          </div>
        );

      case "open_answer":
        return (
          <div className="space-y-2">
            <textarea
              value={answers[question.id]?.value || ""}
              onChange={(e) =>
                handleAnswerInput(question.id, e.target.value, "open_answer")
              }
              placeholder="Type your answer here..."
              className="w-full p-4 border-2 rounded-lg min-h-[200px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              rows={8}
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>
                Characters: {(answers[question.id]?.value || "").length}
              </span>
              <span>Max points: {question.maxPoints || 10}</span>
            </div>
          </div>
        );

      default:
        return <p>Unsupported question type</p>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {assessment?.title}
              </h1>
              <p className="text-gray-600 mt-1">{assessment?.description}</p>
            </div>
            <AssessmentTimer
              duration={assessment?.duration}
              onTimeUp={handleSubmit}
              className="text-xl font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold mb-4">Questions Overview</h3>
              <div className="grid grid-cols-4 md:grid-cols-3 gap-2">
                {assessment?.questions.map((q, idx) => {
                  const status = getQuestionStatus(q.id);
                  const isAnswered = !!answers[q.id]?.value;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`p-2 rounded-lg text-center relative ${
                        currentQuestionIndex === idx
                          ? "bg-blue-100 text-blue-700"
                          : status === "marked"
                          ? "bg-yellow-50 text-yellow-700"
                          : isAnswered
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-50 text-gray-700"
                      }`}
                    >
                      {idx + 1}
                      {q.type === "open_answer" && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>Marked for Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <span>Unanswered</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Question Area */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {assessment?.questions[currentQuestionIndex] && (
                <>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-medium">
                        Question {currentQuestionIndex + 1} of{" "}
                        {assessment.questions.length}
                      </h2>
                      <span className="text-sm text-gray-500">
                        {assessment.questions[currentQuestionIndex].type ===
                        "open_answer"
                          ? "Open Answer Question"
                          : "Multiple Choice Question"}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        toggleMarkQuestion(
                          assessment.questions[currentQuestionIndex].id
                        )
                      }
                      className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                        markedQuestions.has(
                          assessment.questions[currentQuestionIndex].id
                        )
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      <FlagIcon className="h-4 w-4" />
                      {markedQuestions.has(
                        assessment.questions[currentQuestionIndex].id
                      )
                        ? "Marked"
                        : "Mark for Review"}
                    </button>
                  </div>

                  <div className="prose max-w-none mb-6">
                    <p className="text-lg">
                      {assessment.questions[currentQuestionIndex].text}
                    </p>
                  </div>

                  {renderQuestion(assessment.questions[currentQuestionIndex])}

                  <div className="flex justify-between mt-8">
                    <button
                      onClick={() => navigateQuestions(-1)}
                      disabled={currentQuestionIndex === 0}
                      className="flex items-center px-4 py-2 text-gray-700 disabled:opacity-50"
                    >
                      <ChevronLeftIcon className="h-5 w-5 mr-2" />
                      Previous
                    </button>
                    {currentQuestionIndex ===
                    assessment.questions.length - 1 ? (
                      <button
                        onClick={() => setShowConfirmSubmit(true)}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Submit Assessment
                      </button>
                    ) : (
                      <button
                        onClick={() => navigateQuestions(1)}
                        className="flex items-center px-4 py-2 text-gray-700"
                      >
                        Next
                        <ChevronRightIcon className="h-5 w-5 ml-2" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Submit Assessment?</h3>
            <div className="space-y-4">
              <p className="text-gray-600">
                Answered:{" "}
                {Object.values(answers).filter((a) => a !== null).length} of{" "}
                {assessment.questions.length}
              </p>
              <p className="text-gray-600">
                Marked for Review: {markedQuestions.size}
              </p>
              {markedQuestions.size > 0 && (
                <p className="flex items-center text-yellow-600">
                  <ExclamationCircleIcon className="h-5 w-5 mr-2" />
                  You have marked questions for review
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Confirm Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
      <AutoSaveIndicator />
    </div>
  );
}

// Helper function to update submission progress
async function updateSubmissionProgress(submissionId, answers) {
  // Implement the API call to update submission progress
  // This could be a new function in firebase/utils.js
  // For now, just simulate the API call
  return new Promise((resolve) => setTimeout(resolve, 500));
}
