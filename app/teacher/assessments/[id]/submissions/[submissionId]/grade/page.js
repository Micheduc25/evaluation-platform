"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/firebase/client";
import { gradeOpenAnswerQuestion } from "@/firebase/utils";
import { toast } from "react-hot-toast";

export default function GradingInterface({ submissionId, assessmentId }) {
  const [submission, setSubmission] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log("submission data ======>", submissionId, assessmentId);
    const fetchData = async () => {
      try {
        const [submissionDoc, assessmentDoc] = await Promise.all([
          getDoc(doc(db, "submissions", submissionId)),
          getDoc(doc(db, "assessments", assessmentId)),
        ]);

        setSubmission(submissionDoc.data());
        setAssessment(assessmentDoc.data());
      } catch (error) {
        toast.error("Error loading submission");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [submissionId, assessmentId]);

  const handleGrade = async (questionId, points, feedback) => {
    setSaving(true);
    try {
      const result = await gradeOpenAnswerQuestion(
        submissionId,
        questionId,
        points,
        feedback
      );

      // Update local state
      setSubmission((prev) => ({
        ...prev,
        answers: prev.answers.map((answer) =>
          answer.questionId === questionId
            ? { ...answer, points, feedback, graded: true }
            : answer
        ),
        score: result.score,
        status: result.status,
      }));

      toast.success("Grade saved successfully");

      if (result.status === "completed") {
        router.push(`/teacher/assessments/${assessmentId}/submissions`);
      }
    } catch (error) {
      toast.error("Failed to save grade");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Grade Submission</h2>

        {submission.answers.map((answer, index) => {
          const question = assessment.questions.find(
            (q) => q.id === answer.questionId
          );
          if (question?.type !== "open_answer") return null;

          return (
            <div key={answer.questionId} className="mb-8 p-4 border rounded">
              <div className="mb-4">
                <h3 className="font-medium">Question {index + 1}</h3>
                <p className="text-gray-600">{question.text}</p>
              </div>

              <div className="mb-4">
                <h4 className="font-medium">Student's Answer:</h4>
                <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded">
                  {answer.selectedAnswer}
                </p>
              </div>

              <div className="mb-4">
                <h4 className="font-medium">Sample Answer:</h4>
                <p className="text-gray-600">{question.correctAnswer}</p>
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
                    defaultValue={answer.points}
                    onChange={(e) => {
                      const points = Math.min(
                        Math.max(0, parseInt(e.target.value) || 0),
                        question.maxPoints
                      );
                      handleGrade(
                        answer.questionId,
                        points,
                        answer.feedback || ""
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
                    defaultValue={answer.feedback}
                    onChange={(e) =>
                      handleGrade(
                        answer.questionId,
                        answer.points || 0,
                        e.target.value
                      )
                    }
                    className="w-full p-2 border rounded"
                    rows="3"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
