import { ClockIcon, AcademicCapIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";

export default function AssessmentCard({ assessment, onStart }) {
  const endDate = assessment.endDate.toDate();
  const timeLeft = formatDistanceToNow(endDate, { addSuffix: true });

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 flex flex-col">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {assessment.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{assessment.description}</p>
        </div>
        <AcademicCapIcon className="h-6 w-6 text-blue-500" />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center text-sm text-gray-500">
          <ClockIcon className="h-4 w-4 mr-2" />
          <span>Due {timeLeft}</span>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <span className="mr-2">•</span>
          <span>{assessment.duration} minutes</span>
          <span className="mx-2">•</span>
          <span>{assessment.totalPoints} points</span>
        </div>
      </div>
      <div className="flex-grow"></div>
      <button
        onClick={() => onStart(assessment.id)}
        className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        Start Assessment
      </button>
    </div>
  );
}
