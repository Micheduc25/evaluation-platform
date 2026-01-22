"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

/**
 * AssessmentNavigation Component
 * 
 * Provides question navigation with visual status indicators
 */
export default function AssessmentNavigation({
  currentIndex,
  totalQuestions,
  questions,
  getQuestionStatus,
  onNavigate,
  onPrevious,
  onNext,
}) {
  const getStatusColor = (status) => {
    switch (status) {
      case "answered":
        return "bg-green-500 text-white";
      case "marked":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-200 text-gray-600";
    }
  };

  return (
    <div className="mt-6">
      {/* Previous/Next buttons */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="flex items-center px-4 py-2 text-gray-600 bg-white border 
                     rounded-md hover:bg-gray-50 disabled:opacity-50 
                     disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1" />
          Previous
        </button>

        <span className="text-sm text-gray-500">
          Question {currentIndex + 1} of {totalQuestions}
        </span>

        <button
          onClick={onNext}
          disabled={currentIndex === totalQuestions - 1}
          className="flex items-center px-4 py-2 text-gray-600 bg-white border 
                     rounded-md hover:bg-gray-50 disabled:opacity-50 
                     disabled:cursor-not-allowed"
        >
          Next
          <ChevronRightIcon className="h-5 w-5 ml-1" />
        </button>
      </div>

      {/* Question grid */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Question Navigator
        </h3>
        <div className="flex flex-wrap gap-2">
          {questions.map((question, index) => {
            const status = getQuestionStatus(question.id);
            const isActive = index === currentIndex;

            return (
              <button
                key={question.id}
                onClick={() => onNavigate(index)}
                className={`w-10 h-10 rounded-md font-medium text-sm 
                           transition-all ${getStatusColor(status)} 
                           ${isActive ? "ring-2 ring-blue-500 ring-offset-2" : ""}
                           hover:opacity-80`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded bg-green-500 mr-1" />
            Answered
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded bg-yellow-500 mr-1" />
            Marked for Review
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded bg-gray-200 mr-1" />
            Not Answered
          </div>
        </div>
      </div>
    </div>
  );
}
