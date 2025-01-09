import { useState, useEffect } from "react";
import { TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import { RadioGroup, Radio, Label } from "@headlessui/react";

export default function QuestionEditor({
  question,
  onChange,
  onDelete,
  error,
}) {
  const [localQuestion, setLocalQuestion] = useState(question);
  const [localError, setLocalError] = useState("");
  const [questionType, setQuestionType] = useState(
    question.type || "multiple_choice"
  );

  useEffect(() => {
    setLocalQuestion(question);
  }, [question]);

  const handleQuestionChange = (e) => {
    const newQuestion = { ...localQuestion, text: e.target.value };
    setLocalQuestion(newQuestion);
    onChange(newQuestion);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...localQuestion.options];
    newOptions[index] = value;
    const newQuestion = { ...localQuestion, options: newOptions };
    setLocalQuestion(newQuestion);
    onChange(newQuestion);
  };

  const handleCorrectAnswerChange = (index) => {
    const newQuestion = { ...localQuestion, correctAnswer: index };
    setLocalQuestion(newQuestion);
    onChange(newQuestion);
  };

  const addOption = () => {
    if (localQuestion.options.length >= 6) {
      setLocalError("Maximum 6 options allowed");
      return;
    }
    const newOptions = [...localQuestion.options, ""];
    const newQuestion = { ...localQuestion, options: newOptions };
    setLocalQuestion(newQuestion);
    onChange(newQuestion);
    setLocalError("");
  };

  const removeOption = (index) => {
    if (localQuestion.options.length <= 2) {
      setLocalError("Minimum 2 options required");
      return;
    }
    const newOptions = localQuestion.options.filter((_, i) => i !== index);
    const newQuestion = {
      ...localQuestion,
      options: newOptions,
      correctAnswer:
        localQuestion.correctAnswer >= index
          ? Math.max(0, localQuestion.correctAnswer - 1)
          : localQuestion.correctAnswer,
    };
    setLocalQuestion(newQuestion);
    onChange(newQuestion);
    setLocalError("");
  };

  const handleQuestionTypeChange = (type) => {
    setQuestionType(type);
    const newQuestion = {
      ...localQuestion,
      type,
      options: type === "multiple_choice" ? ["", ""] : [],
      correctAnswer: type === "multiple_choice" ? 0 : "",
      maxPoints: type === "open_answer" ? 10 : localQuestion.points,
    };
    setLocalQuestion(newQuestion);
    onChange(newQuestion);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm mb-4 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 mr-4">
          <textarea
            value={localQuestion.text}
            onChange={handleQuestionChange}
            className={`w-full p-3 border rounded-md transition-colors ${
              error?.includes("text")
                ? "border-red-500 bg-red-50"
                : "border-gray-300"
            }`}
            placeholder="Enter your question here..."
            rows="2"
          />
          {error?.includes("text") && (
            <p className="mt-1 text-sm text-red-500">
              Question text is required
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
          title="Delete question"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
        <RadioGroup
          value={questionType}
          onChange={handleQuestionTypeChange}
          className="ml-4"
        >
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Question Type
          </Label>
          <div className="flex space-x-4">
            <Radio value="multiple_choice">
              {({ checked }) => (
                <span
                  className={`${
                    checked ? "bg-blue-50 text-blue-700" : "bg-gray-50"
                  } px-3 py-1 rounded-full cursor-pointer`}
                >
                  Multiple Choice
                </span>
              )}
            </Radio>
            <Radio value="open_answer">
              {({ checked }) => (
                <span
                  className={`${
                    checked ? "bg-blue-50 text-blue-700" : "bg-gray-50"
                  } px-3 py-1 rounded-full cursor-pointer`}
                >
                  Open Answer
                </span>
              )}
            </Radio>
          </div>
        </RadioGroup>
      </div>

      {questionType === "multiple_choice" ? (
        <div className="space-y-3">
          {localQuestion.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-3">
              <input
                type="radio"
                name={`correct-${localQuestion.id}`}
                checked={localQuestion.correctAnswer === index}
                onChange={() => handleCorrectAnswerChange(index)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                className={`flex-1 p-2 border rounded-md transition-colors ${
                  error?.includes("options")
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300"
                }`}
                placeholder={`Option ${index + 1}`}
              />
              {localQuestion.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                  title="Remove option"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Sample Answer (for grading reference)
          </label>
          <textarea
            value={localQuestion.correctAnswer || ""}
            onChange={(e) =>
              onChange({ ...localQuestion, correctAnswer: e.target.value })
            }
            className="w-full p-2 border rounded-md"
            rows="3"
            placeholder="Enter a sample answer"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Points
            </label>
            <input
              type="number"
              value={localQuestion.maxPoints || 10}
              onChange={(e) =>
                onChange({
                  ...localQuestion,
                  maxPoints: parseInt(e.target.value),
                })
              }
              className="mt-1 w-24 p-2 border rounded-md"
              min="1"
            />
          </div>
        </div>
      )}

      {localError && <p className="mt-2 text-sm text-red-500">{localError}</p>}

      {error?.includes("options") && (
        <p className="mt-2 text-sm text-red-500">All options must be filled</p>
      )}

      <button
        type="button"
        onClick={addOption}
        disabled={localQuestion.options.length >= 6}
        className="mt-3 flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PlusIcon className="h-4 w-4 mr-1.5" />
        Add Option
      </button>
    </div>
  );
}