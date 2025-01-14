"use client";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getStudentStats,
  getStudentUpcomingExams,
  getStudentRecentResults,
  getAvailableAssessments,
  getStudentPendingResults,
} from "@/firebase/utils";
import AssessmentCard from "./AssessmentCard";
import {
  BookOpenIcon,
  ClockIcon,
  ChartBarIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function DashboardPage() {
  const { user, loading } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [availableAssessments, setAvailableAssessments] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [pendingResults, setPendingResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const [stats, available, upcoming, results, pending] =
          await Promise.all([
            getStudentStats(user.uid),
            getAvailableAssessments(user.uid),
            getStudentUpcomingExams(user.uid),
            getStudentRecentResults(user.uid),
            getStudentPendingResults(user.uid),
          ]);

        setStats(stats);
        setAvailableAssessments(available);
        setUpcomingExams(upcoming);
        setRecentResults(results);
        setPendingResults(pending);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const handleStartAssessment = (assessmentId) => {
    router.push(`/student/assessments/${assessmentId}/take`);
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 text-black">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.displayName || "Student"}!
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Track your academic progress and upcoming evaluations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats &&
          [
            {
              icon: CheckCircleIcon,
              label: "Completed Exams",
              value: stats.completedExams,
              color: "text-green-600",
            },
            {
              icon: ClockIcon,
              label: "Upcoming Exams",
              value: upcomingExams.length,
              color: "text-orange-600",
            },
            {
              icon: ChartBarIcon,
              label: "Average Score",
              value: `${stats.averageScore}%`,
              color: "text-blue-600",
            },
            {
              icon: BookOpenIcon,
              label: "Total Submissions",
              value: stats.totalSubmissions,
              color: "text-purple-600",
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
            >
              <div className="flex items-center">
                <stat.icon className={`h-8 w-8 ${stat.color} mr-3`} />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Available Assessments Section */}
      <div className="mt-8 mb-6">
        <h2 className="text-xl font-semibold mb-4">Available Assessments</h2>
        {availableAssessments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
            {availableAssessments.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                onStart={handleStartAssessment}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-lg">
            <p className="text-gray-500">
              No assessments available at the moment.
            </p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Exams */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Upcoming Exams</h2>
          <div className="space-y-4">
            {upcomingExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{exam.title}</h3>
                  <p className="text-sm text-gray-600">
                    {exam.endDate.toDate().toLocaleDateString()} at{" "}
                    {exam.endDate.toDate().toLocaleTimeString()}
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {exam.duration} minutes
                </span>
              </div>
            ))}
            {upcomingExams.length === 0 && (
              <p className="text-center text-gray-500">No upcoming exams</p>
            )}
          </div>
        </div>

        {/* Recent Results */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Assessment Results</h2>
          <div className="space-y-4">
            {/* Pending Results */}
            {pendingResults.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Pending Review
                </h3>
                {pendingResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg mb-2 hover:bg-yellow-100 cursor-pointer"
                    onClick={() => router.push(`/student/results/${result.id}`)}
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {result.title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        <span>
                          Submitted{" "}
                          {result.submittedAt.toDate().toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-yellow-600">
                      Pending Review
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Completed Results */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Completed
              </h3>
              {recentResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => router.push(`/student/results/${result.id}`)}
                >
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {result.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {result.submittedAt.toDate().toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-lg font-semibold ${
                      (result.score / result.totalPoints) * 100 >= 90
                        ? "text-green-600"
                        : (result.score / result.totalPoints) * 100 >= 80
                        ? "text-blue-600"
                        : "text-orange-600"
                    }`}
                  >
                    {Math.round((result.score / result.totalPoints) * 100)}%
                  </span>
                </div>
              ))}
            </div>

            {pendingResults.length === 0 && recentResults.length === 0 && (
              <p className="text-center text-gray-500">No results available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
