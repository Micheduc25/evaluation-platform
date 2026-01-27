"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { updateAssessment, getTeacherClassrooms } from "@/firebase/utils";
import { updateAssessment as updateAssessmentState } from "@/store/slices/assessmentSlice";
import QuestionEditor from "./QuestionEditor";
import { toast } from "react-hot-toast";
import { PlusIcon } from "@heroicons/react/24/outline";

export default function EditAssessmentForm({ assessment }) {
  const user = useSelector((state) => state.auth.user);
  const [classrooms, setClassrooms] = useState([]);
  const [formData, setFormData] = useState({
    title: assessment?.title || "",
    description: assessment?.description || "",
    type: assessment?.type || "assessment",
    classroomId: assessment?.classroomId || "",
    duration: assessment?.duration || 60,
    endDate: assessment?.endDate
      ? new Date(
          assessment.endDate.toDate().getTime() -
            assessment.endDate.toDate().getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 16)

      : "",
    startDate: assessment?.startDate
      ? new Date(
          assessment.startDate.toDate().getTime() -
            assessment.startDate.toDate().getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 16)
      : "",
    questions: assessment?.questions || [],
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    const loadClassrooms = async () => {
      if (user?.uid) {
        const data = await getTeacherClassrooms(user.uid);
        setClassrooms(data);
      }
    };
    loadClassrooms();
  }, [user]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    
    if (formData.type === "assessment") {
        if (!formData.startDate) {
            newErrors.startDate = "Start date is required";
        }
        if (!formData.endDate) {
        newErrors.endDate = "Due date is required";
        }
        if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
            newErrors.endDate = "Due date must be after start date";
        }
        if (formData.duration < 15) {
            newErrors.duration = "Minimum duration is 15 minutes";
        }
    }
    if (formData.questions.length === 0) {
      newErrors.questions = "At least one question is required";
    }

    let totalAssignedPoints = 0;
    formData.questions.forEach((question, index) => {
      if (!question.text.trim()) {
        newErrors[`question_${index}`] = "Question text is required";
      }

      if (question.type === "multiple_choice") {
        if (!question.points || question.points < 1) {
          newErrors[`question_${index}_points`] =
            "Points must be greater than 0";
        }
        totalAssignedPoints += question.points || 1;

        if (question.options.some((opt) => !opt.trim())) {
          newErrors[`question_${index}_options`] = "All options must be filled";
        }
      } else if (question.type === "open_answer") {
        totalAssignedPoints += question.maxPoints || 1;
      }
    });

    if (totalAssignedPoints > assessment.totalPoints) {
      newErrors.totalPoints = `Total assigned points (${totalAssignedPoints}) cannot exceed total assessment points (${assessment.totalPoints})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }

    setIsSubmitting(true);

    try {
      // Add timezone offset back when creating the Date object
      let endDate = null;
      let startDate = null;
      if (formData.type === "assessment") {
        if (formData.endDate) {
            endDate = new Date(formData.endDate);
        }
        if (formData.startDate) {
            startDate = new Date(formData.startDate);
        }
      }

      const updatedAssessment = {
        ...formData,
        startDate, // For Firebase
        endDate, // For Firebase
        duration: formData.type === "assessment" ? Number(formData.duration) : null,
      };

      await updateAssessment(assessment.id, updatedAssessment);

      // Create a serializable version for Redux
      const serializedAssessment = {
        ...updatedAssessment,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
      };

      dispatch(
        updateAssessmentState({
          id: assessment.id,
          ...serializedAssessment,
        })
      );

      toast.success("Assessment updated successfully");
      router.push("/teacher/dashboard");
    } catch (error) {
      console.error("Error updating assessment:", error);
      if (error.code === "resource-exhausted") {
        toast.error("Daily quota exceeded. Please try again tomorrow.");
      } else {
        toast.error(error.message || "Failed to update assessment");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
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
          options: [""],
          correctAnswer: 0,
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
    // Clear question-related errors
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
    <form
      onSubmit={handleSubmit}
      className="relative min-h-screen pb-20"
    >
      <div className="space-y-6 max-w-4xl mx-auto p-6 text-black">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <div>
            <label className="block text-sm font-medium text-gray-700">
                Classroom
            </label>
            <select
                name="classroomId"
                value={formData.classroomId}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
                <option value="">Select a classroom</option>
                {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                </option>
                ))}
            </select>
            </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`mt-1 block w-full rounded-md border p-2 ${
                errors.title ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 border p-2"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
                Type
            </label>
            <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
                <option value="assessment">Assessment</option>
                <option value="tutorial">Tutorial</option>
            </select>
          </div>

        {formData.type === "assessment" && (
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Duration (minutes)
                    </label>
                    <input
                        type="number"
                        name="duration"
                        value={formData.duration}
                        onChange={handleInputChange}
                        min="15"
                        className={`w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        errors.duration ? "border-red-500" : "border-gray-300"
                        }`}
                    />
                    {errors.duration && (
                        <p className="mt-1 text-sm text-red-500">{errors.duration}</p>
                    )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date and Time
                  </label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md border p-2 ${
                      errors.startDate ? "border-red-500" : "border-gray-300"
                    }`}
                    required
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>
                  )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                    Due Date and Time
                    </label>
                    <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md border p-2 ${
                        errors.endDate ? "border-red-500" : "border-gray-300"
                    }`}
                    required
                    />
                    {errors.endDate && (
                    <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>
                    )}
                </div>
            </div>
        )}

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">
                Questions
              </label>
            </div>

            {errors.questions && (
              <p className="text-sm text-red-500">{errors.questions}</p>
            )}

            {formData.questions.map((question, index) => (
              <QuestionEditor
                key={question.id}
                question={question}
                questionNumber={index + 1}
                onChange={(updatedQuestion) =>
                  updateQuestion(index, updatedQuestion)
                }
                onDelete={() => removeQuestion(index)}
                error={
                  errors[`question_${index}`] ||
                  errors[`question_${index}_options`]
                }
              />
            ))}
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Add Question button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-center shadow-lg">
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Question
        </button>
      </div>
    </form>
  );
}
