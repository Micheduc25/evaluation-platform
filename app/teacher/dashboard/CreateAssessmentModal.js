"use client";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { createAssessment } from "@/firebase/utils";
import { toast } from "react-hot-toast";
import QuestionEditor from "../assessments/[id]/edit/QuestionEditor";

export default function CreateAssessmentModal({
  onClose,
  onAssessmentCreated,
}) {
  const user = useSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: 60,
    totalPoints: 100,
    endDate: "",
    questions: [],
  });
  const [errors, setErrors] = useState({});

  // Close modal with escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.endDate) newErrors.endDate = "End date is required";
    if (formData.duration < 15)
      newErrors.duration = "Minimum duration is 15 minutes";
    if (formData.totalPoints < 1)
      newErrors.totalPoints = "Total points must be positive";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (formData.questions.length === 0) {
      newErrors.questions = "At least one question is required";
    }

    formData.questions.forEach((question, index) => {
      if (!question.text.trim()) {
        newErrors[`question_${index}`] = "Question text is required";
      }
      if (
        question.type == "multiple_choice" &&
        question.options.some((opt) => !opt.trim())
      ) {
        newErrors[`question_${index}_options`] = "All options must be filled";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    } else {
      toast.error("Please fix all errors before continuing");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) {
      toast.error("Please complete all questions");
      return;
    }

    setLoading(true);
    try {
      const pointsPerQuestion = Math.floor(
        formData.totalPoints / formData.questions.length
      );
      const assessmentData = {
        ...formData,
        questions: formData.questions.map((q) => ({
          ...q,
          points: pointsPerQuestion,
        })),
        createdBy: user.uid,
        createdAt: new Date(),
        endDate: new Date(formData.endDate),
        status: "active",
        submissionCount: 0,
      };

      const assessmentId = await createAssessment(assessmentData);
      toast.success("Assessment created successfully");
      onAssessmentCreated({ id: assessmentId, ...assessmentData });
      onClose();
    } catch (error) {
      console.error("Error creating assessment:", error);
      toast.error(error.message || "Failed to create assessment");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: Date.now(),
          text: "",
          type: "multiple_choice",
          points: 10,
          options: ["", ""],
          correctAnswer: "",
        },
      ],
    }));
  };

  const updateQuestion = (index, updatedQuestion) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index ? updatedQuestion : q
      ),
    }));
    if (errors[`question_${index}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`question_${index}`];
        delete newErrors[`question_${index}_options`];
        return newErrors;
      });
    }
  };

  const removeQuestion = (index) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
          &#8203;
        </span>

        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  Create New Assessment
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 mt-4 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / 2) * 100}%` }}
                ></div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-black">
              {currentStep === 1 ? (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      className={`w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        errors.title ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter assessment title"
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe your assessment"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        min="1"
                        required
                        className={`w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                          errors.duration ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      {errors.duration && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.duration}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Total Points
                      </label>
                      <input
                        type="number"
                        name="totalPoints"
                        value={formData.totalPoints}
                        onChange={handleChange}
                        min="1"
                        required
                        className={`w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                          errors.totalPoints
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.totalPoints && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.totalPoints}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      type="datetime-local"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                      className={`w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        errors.endDate ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.endDate && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.endDate}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium">Questions</h4>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Add Question
                    </button>
                  </div>

                  {formData.questions.map((question, index) => (
                    <QuestionEditor
                      key={question.id}
                      question={question}
                      onChange={(q) => updateQuestion(index, q)}
                      onDelete={() => removeQuestion(index)}
                      error={
                        errors[`question_${index}`] ||
                        errors[`question_${index}_options`]
                      }
                    />
                  ))}

                  {errors.questions && (
                    <p className="text-sm text-red-500">{errors.questions}</p>
                  )}
                </div>
              )}

              <div className="flex justify-between mt-8">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Previous
                  </button>
                )}

                {currentStep === 1 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 disabled:bg-green-300"
                  >
                    {loading ? "Creating..." : "Create Assessment"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
