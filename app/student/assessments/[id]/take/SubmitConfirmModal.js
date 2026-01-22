"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

/**
 * SubmitConfirmModal Component
 * 
 * Confirmation modal before submitting assessment
 */
export default function SubmitConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  unansweredCount,
  markedCount,
  submitting,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4 text-blue-600">
          <ExclamationTriangleIcon className="h-8 w-8" />
          <h3 className="text-lg font-semibold">Submit Assessment?</h3>
        </div>

        {/* Warning content */}
        <div className="mb-6 space-y-3">
          <p className="text-gray-600">
            Are you sure you want to submit your assessment? This action cannot be undone.
          </p>

          {/* Status summary */}
          {(unansweredCount > 0 || markedCount > 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
              {unansweredCount > 0 && (
                <div className="flex items-center text-yellow-700 text-sm">
                  <span className="mr-2">⚠️</span>
                  <span>
                    You have <strong>{unansweredCount}</strong> unanswered 
                    question{unansweredCount !== 1 ? "s" : ""}.
                  </span>
                </div>
              )}
              {markedCount > 0 && (
                <div className="flex items-center text-yellow-700 text-sm">
                  <span className="mr-2">🚩</span>
                  <span>
                    You have <strong>{markedCount}</strong> question{markedCount !== 1 ? "s" : ""} 
                    {" "}marked for review.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 
                       hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md 
                       hover:bg-blue-700 disabled:opacity-50 
                       flex items-center"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 
                               border-white border-t-transparent mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Assessment"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
