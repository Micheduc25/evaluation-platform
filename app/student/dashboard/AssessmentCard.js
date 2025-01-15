"use client";
import { ClockIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";

export default function AssessmentCard({ assessment, onStart, classroom }) {
  const handleStart = () => {
    onStart(assessment.id);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">{assessment.title}</h3>
          <p className="text-gray-600 text-sm mb-4">{assessment.description}</p>

          {classroom && (
            <div className="flex items-center text-sm text-gray-500 mb-3">
              <UserGroupIcon className="h-4 w-4 mr-1" />
              <span>{classroom.name}</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              {assessment.duration} minutes
            </span>
            <span>{assessment.totalPoints} points</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Due: {assessment.endDate.toDate().toLocaleDateString()}
            </span>
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Start Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
