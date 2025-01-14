"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { updateAssessment } from "@/firebase/utils";
import { updateAssessment as updateAssessmentState } from "@/store/slices/assessmentSlice";
import QuestionEditor from "./QuestionEditor";
import { toast } from "react-hot-toast";
import { PlusIcon } from "@heroicons/react/24/outline";

export default function EditAssessmentForm({ assessment }) {
  const [formData, setFormData] = useState({
    title: assessment?.title || "",
    description: assessment?.description || "",
    endDate: assessment?.endDate?.toDate().toISOString().split("T")[0] || "",
    questions: assessment?.questions || [],
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const dispatch = useDispatch();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.endDate) {
      newErrors.endDate = "Due date is required";
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
      const updatedAssessment = {
        ...formData,
        endDate: new Date(formData.endDate),
        updatedAt: new Date(),
      };

      await updateAssessment(assessment.id, updatedAssessment);
      dispatch(
        updateAssessmentState({ id: assessment.id, ...updatedAssessment })
      );
      toast.success("Assessment updated successfully");
      router.push("/teacher/dashboard");
    } catch (error) {
      console.error("Error updating assessment:", error);
      toast.error(error.message || "Failed to update assessment");
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
      className="space-y-6 max-w-4xl mx-auto p-6 text-black"
    >
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
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
            Due Date
          </label>
          <input
            type="date"
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

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700">
              Questions
            </label>
            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              Add Question
            </button>
          </div>

          {errors.questions && (
            <p className="text-sm text-red-500">{errors.questions}</p>
          )}

          {formData.questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
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
    </form>
  );
}
