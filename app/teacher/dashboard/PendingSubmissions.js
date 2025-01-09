"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, isValid } from "date-fns";
import { ClockIcon, UserCircleIcon } from "@heroicons/react/24/outline";

export default function PendingSubmissions({
  submissions = [],
  onGrade,
  loading = false,
  error = null,
}) {
  const router = useRouter();

  const handleGrade = (assessmentId, submissionId) => {
    router.push(
      `/teacher/assessments/${assessmentId}/submissions/${submissionId}/grade`
    );
    if (onGrade) onGrade();
  };

  const formatSubmissionDate = (date) => {
    const submissionDate = date?.toDate?.() || new Date(date);
    return isValid(submissionDate)
      ? format(submissionDate, "MMM d, yyyy 'at' h:mm a")
      : "Date not available";
  };

  const renderSubmissionCard = (submission) => (
    <div
      key={submission.id}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UserCircleIcon className="h-5 w-5 text-gray-400" />
            <span className="font-medium">
              {submission.studentName || "Unknown Student"}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-900">
            {submission.assessmentTitle || "Untitled Assessment"}
          </h3>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <ClockIcon className="h-4 w-4" />
            <span>{formatSubmissionDate(submission.submittedAt)}</span>
          </div>
          {submission.score !== undefined && (
            <p className="text-sm text-gray-600">
              Current Score: {submission.score}/{submission.totalPoints || "—"}
            </p>
          )}
        </div>
        <button
          onClick={() => handleGrade(submission.assessmentId, submission.id)}
          className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-full 
                   hover:bg-blue-100 transition-colors font-medium"
        >
          Grade Now
        </button>
      </div>
      {submission.questions?.length > 0 && (
        <div className="mt-3 text-xs text-gray-500">
          {submission.questions.length} question
          {submission.questions.length !== 1 ? "s" : ""} to review
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (!submissions?.length) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <ClockIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No pending submissions to review</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map(renderSubmissionCard)}
      {submissions.length > 5 && (
        <Link
          href="/teacher/submissions"
          className="block text-center py-2 text-sm text-blue-600 hover:underline 
                   bg-blue-50 rounded-lg mt-4 font-medium"
        >
          View All {submissions.length} Submissions
        </Link>
      )}
    </div>
  );
}
