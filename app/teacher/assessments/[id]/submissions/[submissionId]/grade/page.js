"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/firebase/client";
import { gradeOpenAnswerQuestion } from "@/firebase/utils";
import { toast } from "react-hot-toast";
import { PencilIcon, CheckIcon } from "@heroicons/react/24/outline";
import DomPurify from "dompurify";

export default function GradingInterface() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id;
  const submissionId = params.submissionId;

  const [submission, setSubmission] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localGrades, setLocalGrades] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!assessmentId || !submissionId) {
        toast.error("Invalid URL parameters");
        router.push("/teacher/dashboard");
        return;
      }

      try {
        setLoading(true);
        const [submissionDoc, assessmentDoc] = await Promise.all([
          getDoc(doc(db, "submissions", submissionId)),
          getDoc(doc(db, "assessments", assessmentId)),
        ]);

        if (!submissionDoc.exists() || !assessmentDoc.exists()) {
          throw new Error("Submission or assessment not found");
        }

        setSubmission(submissionDoc.data());
        setAssessment(assessmentDoc.data());
      } catch (error) {
        toast.error(error.message || "Error loading submission");
        console.error(error);
        router.push("/teacher/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [assessmentId, submissionId, router]);

  const handleLocalGradeChange = (questionId, field, value) => {
    setLocalGrades((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
        modified: true,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveGrade = async (questionId) => {
    const gradeData = localGrades[questionId];

    console.log(gradeData);

    if (!gradeData?.modified) return;

    setSaving(true);
    try {
      await gradeOpenAnswerQuestion(
        submissionId,
        Number(questionId),
        parseInt(gradeData.points),
        gradeData.feedback
      );

      // Update local submission state
      setSubmission((prev) => ({
        ...prev,
        answers: prev.answers.map((answer) =>
          answer.questionId === questionId
            ? {
                ...answer,
                points: parseInt(gradeData.points),
                feedback: gradeData.feedback,
                graded: true,
              }
            : answer
        ),
      }));

      setLocalGrades((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], modified: false },
      }));

      toast.success("Grade saved successfully");
    } catch (error) {
      toast.error("Failed to save grade");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      console.log(localGrades);
      const modifiedQuestions = [];
      for (const [questionId, data] of Object.entries(localGrades)) {
        if (data.modified) {
          modifiedQuestions.push([questionId, data]);
        }
      }

      // Save each modified question one by one
      for (const [questionId, data] of modifiedQuestions) {
        await gradeOpenAnswerQuestion(
          submissionId,
          Number(questionId),
          parseInt(data.points),
          data.feedback
        );
      }

      // Update local submission state after all saves are complete
      setSubmission((prev) => ({
        ...prev,
        answers: prev.answers.map((answer) => {
          const gradeData = localGrades[answer.questionId];
          if (gradeData?.modified) {
            return {
              ...answer,
              points: parseInt(gradeData.points),
              feedback: gradeData.feedback,
              graded: true,
            };
          }
          return answer;
        }),
      }));

      // Clear modified flags
      setLocalGrades((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          updated[key] = { ...updated[key], modified: false };
        });
        return updated;
      });

      setHasUnsavedChanges(false);
      toast.success("All changes saved successfully");

      // Check if all questions are now graded
      const allGraded = submission.answers.every(
        (answer) =>
          answer.graded ||
          (localGrades[answer.questionId] &&
            !localGrades[answer.questionId].modified)
      );

      if (allGraded) {
        const shouldRedirect = window.confirm(
          "All questions have been graded. Return to submissions list?"
        );
        if (shouldRedirect) {
          router.push(`/teacher/assessments/${assessmentId}/submissions`);
        }
      }
    } catch (error) {
      toast.error("Failed to save some changes");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 ">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Grade Submission</h2>
          {hasUnsavedChanges && (
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <CheckIcon className="h-4 w-4" />
              )}
              Save All Changes
            </button>
          )}
        </div>

        {submission.answers.map((answer, index) => {
          const question = assessment.questions.find(
            (q) => q.id === answer.questionId
          );
          if (question?.type !== "open_answer") return null;

          const localGrade = localGrades[answer.questionId] || {};
          const isModified = localGrade.modified;

          return (
            <div
              key={answer.questionId}
              className="mb-8 p-4 border rounded relative"
            >
              <div className="mb-4">
                <h3 className="font-medium">Question {index + 1}</h3>
                <p
                  className="text-gray-600 prose prose-lg"
                  dangerouslySetInnerHTML={{
                    __html: DomPurify.sanitize(question.text),
                  }}
                ></p>
              </div>

              <div className="mb-4">
                <h4 className="font-medium">Student's Answer:</h4>
                <p
                  className="whitespace-pre-wrap bg-gray-50 p-3 rounded prose prose-lg"
                  dangerouslySetInnerHTML={{
                    __html: DomPurify.sanitize(
                      `${
                        answer.selectedAnswer?.value ||
                        answer.selectedAnswer ||
                        "No answer provided"
                      }`
                    ),
                  }}
                ></p>
              </div>

              <div className="mb-4">
                <h4 className="font-medium">Sample Answer:</h4>
                <p
                  className="text-gray-600 prose prose-lg"
                  dangerouslySetInnerHTML={{
                    __html: DomPurify.sanitize(question.correctAnswer),
                  }}
                ></p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Points (max: {question.maxPoints})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={question.maxPoints}
                    value={localGrade.points ?? answer.points ?? 0}
                    onChange={(e) => {
                      const points = Math.min(
                        Math.max(0, parseInt(e.target.value) || 0),
                        question.maxPoints
                      );
                      handleLocalGradeChange(
                        answer.questionId,
                        "points",
                        points
                      );
                    }}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Feedback
                  </label>
                  <textarea
                    value={localGrade.feedback ?? answer.feedback ?? ""}
                    onChange={(e) =>
                      handleLocalGradeChange(
                        answer.questionId,
                        "feedback",
                        e.target.value
                      )
                    }
                    className="w-full p-2 border rounded"
                    rows="3"
                  />
                </div>
              </div>

              {isModified && (
                <button
                  onClick={() => handleSaveGrade(answer.questionId)}
                  disabled={saving}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  Save Changes
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
