"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAssessmentResults } from "@/firebase/utils";
import { toast } from "react-hot-toast";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";

export default function AssessmentResultsPage() {
  const { submissionId } = useParams();
  const router = useRouter();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  if (!submissionId) {
    toast.error("Invalid submission ID");
    router.push("/student/dashboard");
  }

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await getAssessmentResults(submissionId);

        if (!data) {
          throw new Error("Submission not found");
        }
        setResults(data);
      } catch (error) {
        toast.error("Failed to load assessment results");
        router.push("/student/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [submissionId, router]);

  const getQuestionStatus = (question, answer) => {
    if (!answer) return { status: "unanswered", icon: null };

    if (question.type === "multiple_choice") {
      const isCorrect = answer.selectedAnswer?.value === question.correctAnswer;
      return {
        status: isCorrect ? "correct" : "incorrect",
        icon: isCorrect ? (
          <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
        ) : (
          <XCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
        ),
      };
    }

    // For open answer questions
    if (!answer.graded) {
      return {
        status: "pending",
        icon: <ClockIcon className="h-6 w-6 text-yellow-500 flex-shrink-0" />,
      };
    }

    const isGood = answer.points >= question.maxPoints / 2;
    return {
      status: isGood ? "good" : "needs_improvement",
      icon: isGood ? (
        <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
      ) : (
        <XCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
      ),
    };
  };

  const renderQuestionScore = (question, answer) => {
    if (!answer) return null;
    if (question.type === "multiple_choice") {
      return (
        <span className={answer.points > 0 ? "text-green-600" : "text-red-600"}>
          ({answer.points || 0}/{question.maxPoints} points)
        </span>
      );
    }
    if (answer.graded) {
      return (
        <span
          className={
            answer.points >= question.maxPoints / 2
              ? "text-green-600"
              : "text-red-600"
          }
        >
          ({answer.points || 0}/{question.maxPoints} points)
        </span>
      );
    }
    return <span className="text-yellow-600">(Pending review)</span>;
  };

  const renderQuestionContent = (question, answer) => {
    const isMultipleChoice = question.type === "multiple_choice";
    const isGraded = isMultipleChoice || answer?.graded;

    return (
      <>
        {/* Answer Display */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-600">Your Answer:</h4>
          <p className="mt-1 text-gray-800">
            {isMultipleChoice
              ? question.options?.[answer?.selectedAnswer?.value] || "No answer"
              : answer?.selectedAnswer?.value || "No answer provided"}
          </p>
        </div>

        {/* Show correct answer only for multiple choice or graded open answers */}
        {(isMultipleChoice || (isGraded && !answer?.pendingGrading)) && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-600">
              {isMultipleChoice ? "Correct Answer:" : "Sample Answer:"}
            </h4>
            <p className="mt-1 text-gray-800">
              {isMultipleChoice
                ? question.options?.[question.correctAnswer]
                : question.correctAnswer}
            </p>
          </div>
        )}

        {/* Feedback for graded open answers */}
        {!isMultipleChoice && answer?.feedback && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-600">
              Teacher's Feedback:
            </h4>
            <p className="mt-1 text-gray-800">{answer.feedback}</p>
          </div>
        )}

        {/* Pending message for ungraded open answers */}
        {!isMultipleChoice && answer?.pendingGrading && (
          <div className="mt-4 text-sm text-yellow-600">
            This answer is pending teacher review
          </div>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const { submission, assessment, details } = results;
  const isPending = submission.status === "pending_review";

  // Add pending review banner
  const PendingReviewBanner = () => (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex items-center">
        <ClipboardDocumentCheckIcon className="h-5 w-5 text-yellow-400 mr-2" />
        <div>
          <p className="text-sm text-yellow-700">
            This submission is pending teacher review. Check back later for
            complete results.
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Submitted on {submission.submittedAt.toDate().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {isPending && <PendingReviewBanner />}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {assessment.title} - {isPending ? "Pending Review" : "Results"}
        </h1>
        <p className="text-gray-600">{assessment.description}</p>

        {/* Score Overview */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          {!isPending && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-600">Score</h3>
              <p className="text-2xl font-bold text-blue-900">
                {details.percentage}%
              </p>
              <p className="text-sm text-blue-600">
                {details.totalScore}/{details.maxScore} points
              </p>
            </div>
          )}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Time Spent</h3>
            <p className="text-2xl font-bold text-gray-900">
              {Math.floor(details.timeSpent / 60)}m {details.timeSpent % 60}s
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Questions</h3>
            <p className="text-2xl font-bold text-gray-900">
              {details.totalQuestions}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Status</h3>
            <p className="text-2xl font-bold text-gray-900">
              {isPending ? "Pending" : "Completed"}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-6">Question Analysis</h2>
        <div className="space-y-6">
          {assessment.questions.map((question, index) => {
            const answer = submission.answers.find(
              (a) => a.questionId === question.id
            );

            const { status, icon } = getQuestionStatus(question, answer);

            return (
              <div
                key={question.id}
                className={`p-4 rounded-lg border ${
                  status === "pending"
                    ? "border-yellow-200"
                    : status === "correct" || status === "good"
                    ? "border-green-200"
                    : "border-red-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">
                      Question {index + 1}{" "}
                      {renderQuestionScore(question, answer)}
                    </h3>
                    <p
                      className="mt-2 text-gray-700 prose prose-lg"
                      dangerouslySetInnerHTML={{ __html: question.text }}
                    ></p>
                    {renderQuestionContent(question, answer)}
                  </div>
                  {icon}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end space-x-4">
        <button
          onClick={() => router.push("/student/dashboard")}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
