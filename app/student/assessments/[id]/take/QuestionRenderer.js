"use client";

import { FlagIcon, PhotoIcon } from "@heroicons/react/24/outline";
import DOMPurify from "isomorphic-dompurify";
import RichTextEditor from "@/components/RichTextEditor";
import FileUpload from "@/components/FileUpload";

/**
 * QuestionRenderer Component
 * 
 * Renders different question types with their answer inputs
 */
export default function QuestionRenderer({
  question,
  questionIndex,
  totalQuestions,
  answer,
  isMarked,
  onAnswerChange,
  onMarkToggle,
  onImageUpload,
  uploadingImage,
  isUploadDisabled,
  onUploadStart,
  onUploadEnd,
}) {
  const createMarkup = (content) => {
    return { __html: DOMPurify.sanitize(content) };
  };

  const renderMultipleChoice = () => (
    <div className="space-y-3 mt-4">
      {question.options.map((option, idx) => (
        <label
          key={idx}
          className={`flex items-center p-4 rounded-lg border-2 transition-colors cursor-pointer ${
            answer?.value === idx
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:bg-gray-50"
          }`}
        >
          <input
            type="radio"
            name={`question-${question.id}`}
            value={idx}
            checked={answer?.value === idx}
            onChange={() => onAnswerChange(idx, "multiple_choice", [])}
            className="h-4 w-4 text-blue-600"
          />
          <div
            className="ml-3 select-none prose"
            dangerouslySetInnerHTML={createMarkup(option)}
          />
        </label>
      ))}
    </div>
  );

  const renderOpenAnswer = () => (
    <div className="space-y-4">
      <RichTextEditor
        key={question.id}
        content={answer?.value || ""}
        allowImageUpload={false}
        onUploadStart={onUploadStart}
        onUploadEnd={onUploadEnd}
        onChange={(value) =>
          onAnswerChange(value, "open_answer", answer?.images || [])
        }
        preventCopy={true}
      />

      {/* Image upload section */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700 flex items-center">
            <PhotoIcon className="h-5 w-5 mr-1" />
            Attach Images
          </h4>
          {uploadingImage && (
            <span className="text-sm text-blue-600">Uploading...</span>
          )}
        </div>

        <FileUpload
          onUploadComplete={onImageUpload}
          onUploadStart={onUploadStart}
          onUploadEnd={onUploadEnd}
          disabled={isUploadDisabled || uploadingImage}
          allowedTypes={["image/jpeg", "image/png"]}
          maxSize={2097152} // 2MB
          path={`question-images`}
        />

        {/* Display uploaded images */}
        {answer?.images?.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {answer.images.map((img, idx) => (
              <div key={idx} className="relative">
                <img
                  src={img.url}
                  alt={`Attachment ${idx + 1}`}
                  className="w-full h-24 object-cover rounded-md border"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Question header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-medium text-gray-500">
              Question {questionIndex + 1} of {totalQuestions}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              question.type === "multiple_choice"
                ? "bg-blue-100 text-blue-700"
                : "bg-purple-100 text-purple-700"
            }`}>
              {question.type === "multiple_choice" ? "Multiple Choice" : "Open Answer"}
            </span>
            {question.points && (
              <span className="text-sm text-gray-500">
                ({question.points} points)
              </span>
            )}
          </div>
        </div>

        {/* Mark for review button */}
        <button
          type="button"
          onClick={onMarkToggle}
          className={`flex items-center px-3 py-1.5 rounded-md text-sm 
                     transition-colors ${
            isMarked
              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <FlagIcon className="h-4 w-4 mr-1" />
          {isMarked ? "Marked" : "Mark for Review"}
        </button>
      </div>

      {/* Question text */}
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={createMarkup(question.text)}
      />

      {/* Answer input */}
      {question.type === "multiple_choice" 
        ? renderMultipleChoice() 
        : renderOpenAnswer()}
    </div>
  );
}
