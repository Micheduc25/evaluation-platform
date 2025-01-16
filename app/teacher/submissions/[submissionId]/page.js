"use client";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useParams, useRouter } from "next/navigation";
import { getAssessmentResults } from "@/firebase/utils";
import { format } from "date-fns";

export default function SubmissionDetailsPage() {
  const user = useSelector((state) => state.auth.user);
  const router = useRouter();
  const params = useParams();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      if (!user?.uid || !params.submissionId) return;
      try {
        setLoading(true);
        const data = await getAssessmentResults(params.submissionId);
        setResults(data);
      } catch (error) {
        console.error("Error loading submission results:", error);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [user, params.submissionId]);

  if (!user || user.role !== "teacher") {
    return <div>Access denied</div>;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Submission not found</div>
      </div>
    );
  }

  const { submission, assessment, details } = results;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{assessment.title}</h1>
        <div className="space-x-4">
          {submission.status === "pending_review" && (
            <button
              onClick={() =>
                router.push(
                  `/teacher/assessments/${assessment.id}/submissions/${params.submissionId}/grade`
                )
              }
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Grade Submission
            </button>
          )}
          <button
            onClick={() => router.push("/teacher/submissions")}
            className="text-gray-600 hover:text-gray-800"
          >
            Back to All Submissions
          </button>
        </div>
      </div>

      {/* Submission Overview */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Submission Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium">
              {submission.status.replace("_", " ").toUpperCase()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Score</p>
            <p className="font-medium">
              {submission.score} / {details.maxScore} ({details.percentage}%)
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Submitted</p>
            <p className="font-medium">
              {format(submission.submittedAt?.toDate(), "MMM d, yyyy HH:mm")}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Time Spent</p>
            <p className="font-medium">
              {Math.round(details.timeSpent / 60)} minutes
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Tab Violations</p>
            <p
              className={`font-medium ${
                details.tabViolations > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {details.tabViolations || 0} times
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Submission Type</p>
            <p
              className={`font-medium ${
                details.forcedSubmission ? "text-amber-600" : "text-green-600"
              }`}
            >
              {details.forcedSubmission ? "Forced" : "Normal"}
            </p>
          </div>
        </div>
      </div>

      {/* Questions and Answers */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Questions and Answers</h2>
        <div className="space-y-6">
          {assessment.questions.map((question, index) => {
            const answer = submission.answers.find(
              (a) => a.questionId === question.id
            );
            const isCorrect =
              question.type === "multiple_choice" &&
              answer?.selectedAnswer?.value === question.correctAnswer;

            return (
              <div
                key={question.id}
                className="border rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">
                    Question {index + 1}{" "}
                    <span className="text-sm text-gray-500">
                      ({question.points} points)
                    </span>
                  </h3>
                  {question.type === "multiple_choice" && (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isCorrect
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  )}
                </div>
                <p className="text-gray-700 mb-2">{question.text}</p>

                {question.type === "multiple_choice" ? (
                  <div className="ml-4 space-y-2">
                    {question.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`flex items-center space-x-2 ${
                          answer?.selectedAnswer?.value === optIndex
                            ? "font-medium"
                            : ""
                        }`}
                      >
                        <span
                          className={`w-4 h-4 inline-block rounded-full ${
                            answer?.selectedAnswer?.value === optIndex
                              ? "bg-blue-600"
                              : "border border-gray-300"
                          }`}
                        />
                        <span>{option}</span>
                        {option === question.correctAnswer && (
                          <span className="text-green-600 text-sm">
                            (Correct Answer)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ml-4">
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {answer?.selectedAnswer?.value || "No answer provided"}
                    </p>
                    {answer?.feedback && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-sm font-medium text-gray-500">
                          Feedback:
                        </p>
                        <p className="text-gray-700">{answer.feedback}</p>
                      </div>
                    )}
                    {answer?.points !== undefined && (
                      <p className="mt-2 text-sm font-medium">
                        Points awarded: {answer.points} / {question.points}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
