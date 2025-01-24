"use client";
import { useState, useEffect, useRef, useCallback } from "react"; // Add useCallback import
import { useParams, useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import {
  getAssessment,
  startAssessment,
  submitAssessment,
  handleIncompleteAssessment,
  saveAssessmentProgress,
  getAssessmentProgress,
} from "@/firebase/utils";
import { setLoading, setError } from "@/store/slices/assessmentSlice";
import AssessmentTimer from "./AssessmentTimer";
import { toast } from "react-hot-toast";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FlagIcon,
  ExclamationCircleIcon,
  XCircleIcon, // Add this import
  PhotoIcon,
} from "@heroicons/react/24/outline";
import DOMPurify from "isomorphic-dompurify";
import RichTextEditor from "@/components/RichTextEditor";
import FileUpload from "@/components/FileUpload";
import { uploadFile } from "@/firebase/storage";

export default function TakeAssessmentPage() {
  let numbers = [1, 2, 3, 4, 5];
  for (i = 0; i <= numbers.length; i++) {
    console.log(numbers[i]);
  }

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

  const [isFullScreen, setIsFullScreen] = useState(false);

  const [violations, setViolations] = useState({
    tabSwitch: 0,
    windowBlur: 0,
    devTools: 0,
    fullscreen: 0,
    windowMove: 0,
  });
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const [questionImages, setQuestionImages] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);

  const [isUploadingImage, setIsUploadingImage] = useState(false); // Add new state

  const VIOLATION_LIMITS = {
    tabSwitch: 3,
    windowBlur: 3,
    devTools: 2,
    fullscreen: 2,
    windowMove: 2,
  };

  const isValidSaveState = () => {
    // Check total violations against thresholds
    const currentViolations = stateRef.current.violations;

    // Prevent saves if:
    // 1. Any violation type is at or above its limit
    // 2. Total violations across all types is too high
    const hasExceededLimits = Object.entries(currentViolations).some(
      ([type, count]) => count >= VIOLATION_LIMITS[type]
    );

    const totalViolations = Object.values(currentViolations).reduce(
      (sum, count) => sum + count,
      0
    );

    // Allow maximum of 70% of total possible violations before blocking saves
    const maxTotalViolations =
      Object.values(VIOLATION_LIMITS).reduce((sum, limit) => sum + limit, 0) *
      0.7;

    return !hasExceededLimits && totalViolations < maxTotalViolations;
  };

  const handleViolation = (type, message) => {
    setViolations((prev) => {
      const newCount = (prev[type] || 0) + 1;
      const limit = VIOLATION_LIMITS[type];

      // update state ref
      stateRef.current.violations = {
        ...prev,
        [type]: newCount,
      };

      if (newCount >= limit) {
        handleSubmit(true);
        toast.error(
          `Maximum ${type} violations reached. Assessment submitted.`
        );
      } else {
        setWarningMessage(`Warning: ${message} (${newCount}/${limit})`);
        setShowWarningModal(true);
      }

      return { ...prev, [type]: newCount };
    });
  };

  const initializationRef = useRef(false);

  // Add refs to track latest state values
  const stateRef = useRef({
    assessment: null,
    answers: {},
    submissionId: null,
    violations: 0,
    timeSpentPerQuestion: {},
    lastQuestionChangeTime: Date.now(),
    currentQuestionIndex: 0,
  });

  // Update refs whenever state changes
  useEffect(() => {
    stateRef.current = {
      assessment,
      answers,
      submissionId,
      violations,
      timeSpentPerQuestion,
      lastQuestionChangeTime,
      currentQuestionIndex,
    };
  }, [
    assessment,
    answers,
    submissionId,
    violations,
    timeSpentPerQuestion,
    lastQuestionChangeTime,
    currentQuestionIndex,
  ]);

  // Add this before the effects
  const preventCopyPaste = (e) => {
    e.preventDefault();
    return false;
  };

  const handleSubmit = async (forced = false) => {
    if (
      !forced &&
      !confirm("Are you sure you want to submit your assessment?")
    ) {
      return;
    }

    const currentState = stateRef.current;

    setSubmitting(true);
    try {
      const finalTimeSpent = {
        ...currentState.timeSpentPerQuestion,
        [currentState.assessment?.questions[currentState.currentQuestionIndex]
          ?.id]:
          (currentState.timeSpentPerQuestion[
            currentState.assessment?.questions[
              currentState.currentQuestionIndex
            ]?.id
          ] || 0) +
          Math.round((Date.now() - currentState.lastQuestionChangeTime) / 1000),
      };

      const result = await submitAssessment(currentState.submissionId, {
        assessmentId: id,
        studentId: user.uid,
        answers: Object.entries(currentState.answers).map(
          ([questionId, answer]) => ({
            questionId: Number(questionId),
            selectedAnswer: answer,
            timeSpent: finalTimeSpent[questionId] || 0,
          })
        ),
        submittedAt: new Date(),
        totalTimeSpent: Object.values(finalTimeSpent).reduce(
          (a, b) => a + b,
          0
        ),
        teacherId: currentState.assessment?.createdBy,
        questions: currentState.assessment?.questions,
        forcedSubmission: forced,
        violations: currentState.violations,
      });

      toast.success(
        forced
          ? "Assessment submitted automatically due to tab switching violations"
          : "Assessment submitted successfully"
      );

      router.push(result?.redirectUrl || "/student/dashboard");
    } catch (error) {
      console.error("Error submitting assessment:", error);
      toast.error("Failed to submit assessment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Function to handle fullscreen
  const enterFullScreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  };

  // Function to detect DevTools
  const detectDevTools = () => {
    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;

    if (widthThreshold || heightThreshold) {
      handleViolation("devTools", "Developer tools are not allowed");
    }
  };

  // Prevent keyboard shortcuts
  const preventKeyboardShortcuts = useCallback((e) => {
    // Prevent common shortcuts
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "c" ||
        e.key === "v" ||
        e.key === "p" ||
        e.key === "s" ||
        e.key === "u" ||
        e.key === "i" ||
        (e.shiftKey && e.key === "i"))
    ) {
      e.preventDefault();
      return false;
    }
  }, []);

  const loadSavedProgress = async (submissionId) => {
    try {
      const savedProgress = await getAssessmentProgress(submissionId);
      if (savedProgress) {
        setAnswers(savedProgress.answers);
        setCurrentQuestionIndex(savedProgress.currentQuestionIndex);
        setTimeSpentPerQuestion(savedProgress.timeSpentPerQuestion);
        setViolations(
          savedProgress.violations || {
            tabSwitch: 0,
            windowBlur: 0,
            devTools: 0,
            fullscreen: 0,
            windowMove: 0,
          }
        );

        // Update state ref with loaded data
        stateRef.current = {
          ...stateRef.current,
          answers: savedProgress.answers,
          currentQuestionIndex: savedProgress.currentQuestionIndex,
          timeSpentPerQuestion: savedProgress.timeSpentPerQuestion,
          violations: savedProgress.violations,
        };

        // toast.success("Restored your previous progress");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to load saved progress:", error);
      toast.error("Could not restore your previous progress");
      return false;
    }
  };

  useEffect(() => {
    let autoSaveTimer;
    let hidden, visibilityChange;

    // Set up visibility API variables
    if (typeof document.hidden !== "undefined") {
      hidden = "hidden";
      visibilityChange = "visibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
      hidden = "msHidden";
      visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
      hidden = "webkitHidden";
      visibilityChange = "webkitvisibilitychange";
    }

    const handleVisibilityChange = () => {
      if (document[hidden] && !isUploadingImage) {
        // Only check if not uploading
        handleViolation("tabSwitch", "Switching tabs is not allowed");
      }
    };

    const handleBeforeUnload = (e) => {
      const currentState = stateRef.current;
      if (
        currentState.submissionId &&
        Object.keys(currentState.answers).length > 0
      ) {
        handleSubmit(true);
        e.preventDefault();
        e.returnValue =
          "Leaving this page will submit your assessment automatically.";
      }
    };

    // Set up event listeners
    document.addEventListener(visibilityChange, handleVisibilityChange);
    window.addEventListener("blur", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    document.addEventListener("copy", preventCopyPaste);
    document.addEventListener("paste", preventCopyPaste);
    document.addEventListener("contextmenu", preventCopyPaste);

    // Initialize assessment and start auto-save
    const initializeAssessment = async () => {
      if (initializationRef.current) return;

      try {
        dispatch(setLoading(true));
        const assessmentData = await getAssessment(id);

        if (!assessmentData) {
          throw new Error("Assessment not found");
        }

        if (new Date() > new Date(assessmentData.endDate.seconds * 1000)) {
          throw new Error("Assessment has expired");
        }

        const submissionIdNew = await startAssessment(id, user.uid);
        setSubmissionId(submissionIdNew);
        setAssessment(assessmentData);

        // Initialize with empty answers if no saved progress
        const progressLoaded = await loadSavedProgress(submissionIdNew);
        if (!progressLoaded) {
          const initialAnswers = {};
          assessmentData.questions.forEach((q) => {
            initialAnswers[q.id] = null;
          });
          setAnswers(initialAnswers);
          setTimeSpentPerQuestion({});
          setCurrentQuestionIndex(0);
        }

        initializationRef.current = true;
      } catch (error) {
        dispatch(setError(error.message));
        toast.error(error.message);
        router.push("/student/dashboard");
      } finally {
        dispatch(setLoading(false));
      }
    };

    // Force fullscreen
    enterFullScreen();

    // Monitor fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
      if (!document.fullscreenElement && !submitting && !isUploadingImage) {
        handleViolation("fullscreen", "Fullscreen mode is required");
        enterFullScreen();
      }
    };

    // Monitor window size and position
    let lastTop = window.screenY;
    let lastLeft = window.screenX;

    const handleWindowMove = () => {
      if (window.screenY !== lastTop || window.screenX !== lastLeft) {
        handleViolation("windowMove", "Window movement detected");
      }
    };

    // Prevent screen capture
    const style = document.createElement("style");
    style.textContent = `
      html {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      video::-webkit-media-controls-enclosure,
      video::-webkit-media-controls {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    // Set up event listeners
    window.addEventListener("keydown", preventKeyboardShortcuts);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("resize", detectDevTools);
    window.addEventListener("move", handleWindowMove);

    // Initialize assessment if user is available
    if (user && !initializationRef.current) {
      initializeAssessment();
    }

    return () => {
      document.removeEventListener(visibilityChange, handleVisibilityChange);
      window.removeEventListener("blur", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("copy", preventCopyPaste);
      document.removeEventListener("paste", preventCopyPaste);
      document.removeEventListener("contextmenu", preventCopyPaste);
      window.removeEventListener("keydown", preventKeyboardShortcuts);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("resize", detectDevTools);
      window.removeEventListener("move", handleWindowMove);
      document.head.removeChild(style);

      clearInterval(autoSaveTimer);
      initializationRef.current = false;
    };
  }, [id, user, router]);

  // Add new auto-save effect after state initialization
  useEffect(() => {
    let autoSaveInterval;

    if (submissionId && !submitting) {
      const saveProgress = async () => {
        if (!isValidSaveState()) {
          console.warn("Skipping auto-save due to violation state");
          setAutoSaveStatus("error");
          return;
        }

        try {
          setAutoSaveStatus("saving");
          await saveAssessmentProgress(submissionId, {
            answers,
            currentQuestionIndex,
            timeSpentPerQuestion,
            violations: stateRef.current.violations,
            lastSaveAttempt: new Date(),
            violations: Object.entries(stateRef.current.violations)
              .filter(([_, count]) => count > 0)
              .map(([type, count]) => ({ type, count })),
          });
          setAutoSaveStatus("saved");
        } catch (error) {
          console.error("Auto-save failed:", error);
          setAutoSaveStatus("error");
        }
      };

      // Save every 30 seconds
      autoSaveInterval = setInterval(saveProgress, 30000);

      // Save when window loses focus
      const handleVisibilityChange = async () => {
        if (document.hidden) {
          await saveProgress();
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        clearInterval(autoSaveInterval);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }
  }, [
    submissionId,
    answers,
    currentQuestionIndex,
    timeSpentPerQuestion,
    submitting,
  ]);

  // Keep the question timer effect separate as it has different concerns
  useEffect(() => {
    const updateTimeSpent = () => {
      const now = Date.now();
      const timeSpent = Math.round((now - lastQuestionChangeTime) / 1000);

      if (assessment?.questions[currentQuestionIndex]) {
        const questionId = assessment.questions[currentQuestionIndex].id;
        setTimeSpentPerQuestion((prev) => ({
          ...prev,
          [questionId]: (prev[questionId] || 0) + timeSpent,
        }));
      }
    };

    return () => {
      updateTimeSpent();
      setLastQuestionChangeTime(Date.now());
    };
  }, [currentQuestionIndex, assessment, lastQuestionChangeTime]);

  // Add cleanup function
  const handleCleanup = async () => {
    if (submissionId && Object.keys(answers).length > 0) {
      const finalTimeSpent = {
        ...timeSpentPerQuestion,
        [assessment?.questions[currentQuestionIndex]?.id]:
          (timeSpentPerQuestion[
            assessment?.questions[currentQuestionIndex]?.id
          ] || 0) + Math.round((Date.now() - lastQuestionChangeTime) / 1000),
      };

      try {
        await saveAssessmentProgress(submissionId, {
          answers,
          currentQuestionIndex,
          timeSpentPerQuestion: finalTimeSpent,
          violations: stateRef.current.violations,
        });
      } catch (error) {
        console.error("Failed to save final progress:", error);
      }
    }
  };

  // Handle answer selection with auto-save
  // TODO: Maybe remove
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

  const handleAnswerInput = async (questionId, value, type, images = []) => {
    if (!isValidSaveState()) {
      toast.error("Cannot save changes due to violation of exam rules");
      return;
    }

    const newAnswers = {
      ...answers,
      [questionId]: {
        value,
        type,
        images,
        timestamp: new Date().toISOString(),
      },
    };
    setAnswers(newAnswers);

    try {
      setAutoSaveStatus("saving");
      await saveAssessmentProgress(submissionId, {
        answers: newAnswers,
        currentQuestionIndex,
        timeSpentPerQuestion,
        violations: stateRef.current.violations,
        lastSaveAttempt: new Date(),
      });
      setAutoSaveStatus("saved");
    } catch (error) {
      console.error("Failed to save answer:", error);
      setAutoSaveStatus("error");
    }
  };

  const handleQuestionImageUpload = async (file, questionId) => {
    try {
      setIsUploadingImage(true); // Disable violation checking
      setUploadingImage(true);
      const result = await uploadFile(
        file,
        `assessments/${id}/submissions/${submissionId}/images`
      );

      const newImages = {
        ...questionImages,
        [questionId]: [...(questionImages[questionId] || []), result],
      };
      setQuestionImages(newImages);

      // Update the answer to include the image reference
      const currentAnswer = answers[questionId] || { value: "", images: [] };
      const newAnswer = {
        ...currentAnswer,
        images: [...(currentAnswer.images || []), result],
      };

      handleAnswerInput(
        questionId,
        currentAnswer.value,
        "open_answer",
        newAnswer.images
      );
    } catch (error) {
      toast.error("Failed to upload image");
      console.error("Image upload error:", error);
    } finally {
      setUploadingImage(false);
      setIsUploadingImage(false); // Re-enable violation checking
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

  const navigateQuestions = async (direction) => {
    if (!isValidSaveState()) {
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
          violations: stateRef.current.violations,
          lastSaveAttempt: new Date(),
        });
        setAutoSaveStatus("saved");
        setCurrentQuestionIndex(newIndex);
      } catch (error) {
        console.error("Failed to save progress while navigating:", error);
        setAutoSaveStatus("error");
        // Still allow navigation even if save fails
        setCurrentQuestionIndex(newIndex);
      }
    }
  };

  const getQuestionStatus = (questionId) => {
    if (markedQuestions.has(questionId)) return "marked";
    if (answers[questionId] !== null) return "answered";
    return "unanswered";
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
    const createMarkup = (content) => {
      return { __html: DOMPurify.sanitize(content) };
    };

    return (
      <div className="space-y-6">
        {/* Replace the parse function with dangerouslySetInnerHTML */}
        <div
          className="prose prose-lg max-w-none mb-6"
          dangerouslySetInnerHTML={createMarkup(question.text)}
        />

        {question.type === "multiple_choice" ? (
          <div className="space-y-3 mt-4">
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

                <div
                  className="ml-3 select-none prose"
                  dangerouslySetInnerHTML={createMarkup(option)}
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <RichTextEditor
              key={question.id} // Add this key prop
              content={answers[question.id]?.value || ""}
              allowImageUpload={false}
              onUploadStart={() => setIsUploadingImage(true)}
              onUploadEnd={() => setIsUploadingImage(false)}
              onChange={(value) =>
                handleAnswerInput(
                  question.id,
                  value,
                  "open_answer",
                  answers[question.id]?.images || []
                )
              }
              error={false}
              preventCopy={true}
            />

            {/* Add image upload section */}
            <div className="border-t pt-4 hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Attached Images
                </span>
                <FileUpload
                  onUploadComplete={(file) =>
                    handleQuestionImageUpload(file, question.id)
                  }
                  onError={(error) => toast.error(error)}
                  allowedTypes={["image/jpeg", "image/png", "image/gif"]}
                  maxSize={5242880} // 5MB
                  path={`assessments/${id}/submissions/${submissionId}/images`}
                  multiple={true}
                />
              </div>

              {/* Display uploaded images */}
              {answers[question.id]?.images &&
                answers[question.id].images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                    {answers[question.id].images.map((image, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={image.url}
                          alt={`Upload ${idx + 1}`}
                          className="rounded-lg w-full h-32 object-cover"
                        />
                        <button
                          onClick={() => {
                            const newImages = answers[
                              question.id
                            ].images.filter((_, i) => i !== idx);
                            handleAnswerInput(
                              question.id,
                              answers[question.id].value,
                              "open_answer",
                              newImages
                            );
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircleIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div className="flex justify-between text-sm text-gray-500 select-none">
              <span>
                Characters:{" "}
                {
                  (answers[question.id]?.value || "").replace(/<[^>]*>/g, "")
                    .length
                }
              </span>
              <span>Images: {(answers[question.id]?.images || []).length}</span>
              <span>Max points: {question.maxPoints || 10}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Add fullscreen warning if not in fullscreen
  if (!isFullScreen && !isUploadingImage) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Fullscreen Required</h1>
          <button
            onClick={enterFullScreen}
            className="px-4 py-2 bg-blue-600 rounded"
          >
            Enter Fullscreen
          </button>
        </div>
      </div>
    );
  }

  // Add Warning Modal Component
  const WarningModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center space-x-3 text-red-600 mb-4">
          <XCircleIcon className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Warning</h3>
        </div>
        <p className="text-gray-600 mb-6">{warningMessage}</p>
        <div className="flex justify-end">
          <button
            onClick={() => setShowWarningModal(false)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-gray-50"
      onCopy={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
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
              onTimeUp={() => handleSubmit(true)}
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
                onClick={(e) => handleSubmit(false)}
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
      {showWarningModal && <WarningModal />}
    </div>
  );
}
