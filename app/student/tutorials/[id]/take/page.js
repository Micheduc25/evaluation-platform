"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  getAssessment,
  startAssessment,
  submitTutorial,
} from "@/firebase/utils";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import DOMPurify from "isomorphic-dompurify";
import RichTextEditor from "@/components/RichTextEditor";

export default function TakeTutorialPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useSelector((state) => state.auth.user);
  const [tutorial, setTutorial] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submissionId, setSubmissionId] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const initializeTutorial = async () => {
      try {
        const tutorialData = await getAssessment(id);
        if (!tutorialData || tutorialData.type !== "tutorial") {
          toast.error("Tutorial not found");
          router.push("/student/dashboard");
          return;
        }

        setTutorial(tutorialData);
        const submissionId = await startAssessment(id, user.uid, "tutorial");
        setSubmissionId(submissionId);
      } catch (error) {
        console.error("Error initializing tutorial:", error);
        toast.error("Failed to load tutorial");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      initializeTutorial();
    }
  }, [id, user]);

  const handleAnswerInput = (value) => {
    const currentQuestion = tutorial.questions[currentQuestionIndex];
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        value,
        type: currentQuestion.type,
        timestamp: new Date().toISOString(),
      },
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await submitTutorial(submissionId, {
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId: Number(questionId),
          selectedAnswer: answer,
        })),
        studentId: user.uid,
        completedAt: new Date(),
      });

      setIsCompleted(true);
      toast.success("Tutorial completed successfully!");
    } catch (error) {
      console.error("Error submitting tutorial:", error);
      toast.error("Failed to submit tutorial");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.createElement("div");
    printContent.className = "tutorial-print";

    // Add tutorial title and description
    printContent.innerHTML = `
      <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">${
        tutorial.title
      }</h1>
      <p style="margin-bottom: 32px;">${tutorial.description || ""}</p>
    `;

    // Add all questions and answers
    tutorial.questions.forEach((question, idx) => {
      const answer = answers[question.id];
      printContent.innerHTML += `
        <div style="margin-bottom: 24px; page-break-inside: avoid;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">Question ${
            idx + 1
          }</h2>
          <div style="margin-bottom: 16px;">${question.text}</div>
          ${
            answer
              ? `
            <div style="margin-left: 16px; padding: 8px; background: #f3f4f6;">
              <strong>Your Answer:</strong><br/>
              ${
                answer.type === "multiple_choice"
                  ? question.options[answer.value]
                  : answer.value
              }
            </div>
          `
              : ""
          }
        </div>
      `;
    });

    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${tutorial.title} - Tutorial Results</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            @media print {
              .tutorial-print { max-width: 100%; margin: 0 auto; }
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  const renderQuestion = (question) => {
    const createMarkup = (content) => ({ __html: DOMPurify.sanitize(content) });

    return (
      <div className="space-y-6">
        <div
          className="prose prose-lg max-w-none mb-6"
          dangerouslySetInnerHTML={createMarkup(question.text)}
        />

        {question.type === "multiple_choice" ? (
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <label
                key={idx}
                className={`flex items-center p-4 rounded-lg border-2 transition-colors cursor-pointer
                ${
                  answers[question.id]?.value === idx
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={answers[question.id]?.value === idx}
                  onChange={() => handleAnswerInput(idx)}
                  className="h-4 w-4 text-green-600"
                />
                <div
                  className="ml-3 prose"
                  dangerouslySetInnerHTML={createMarkup(option)}
                />
              </label>
            ))}
          </div>
        ) : (
          <RichTextEditor
            content={answers[question.id]?.value || ""}
            onChange={handleAnswerInput}
            preventCopy={false}
          />
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {tutorial?.title}
            </h1>
            <p className="text-gray-600 mt-1">
              Practice Mode - Take your time to learn
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full flex items-center">
              <BookOpenIcon className="h-5 w-5 mr-2" />
              Tutorial
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 text-green-700 bg-green-50 rounded-full hover:bg-green-100 transition-colors"
            >
              <PrinterIcon className="h-5 w-5 mr-2" />
              Print Tutorial
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Question Navigation */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold mb-4">Progress</h3>
            <div className="grid grid-cols-4 md:grid-cols-2 gap-2">
              {tutorial?.questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`p-2 rounded-lg text-center
                    ${
                      currentQuestionIndex === idx
                        ? "bg-green-100 text-green-700"
                        : answers[q.id]
                        ? "bg-green-50 text-green-600"
                        : "bg-gray-50 text-gray-700"
                    }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-lg shadow-sm p-6">
            {tutorial?.questions[currentQuestionIndex] && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-medium">
                    Question {currentQuestionIndex + 1} of{" "}
                    {tutorial.questions.length}
                  </h2>
                </div>

                {renderQuestion(tutorial.questions[currentQuestionIndex])}

                <div className="flex justify-between mt-8">
                  <button
                    onClick={() =>
                      setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                    }
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center px-4 py-2 text-gray-700 disabled:opacity-50"
                  >
                    <ChevronLeftIcon className="h-5 w-5 mr-2" />
                    Previous
                  </button>

                  {currentQuestionIndex === tutorial.questions.length - 1 ? (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "Completing..." : "Complete Tutorial"}
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        setCurrentQuestionIndex((prev) =>
                          Math.min(tutorial.questions.length - 1, prev + 1)
                        )
                      }
                      className="flex items-center px-4 py-2 text-gray-700"
                    >
                      Next
                      <ChevronRightIcon className="h-5 w-5 ml-2" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isCompleted && (
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => router.push("/student/dashboard")}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
