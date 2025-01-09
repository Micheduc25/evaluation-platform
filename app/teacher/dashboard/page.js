"use client";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  getUserAssessments,
  getTeacherStats,
  getPendingSubmissions,
} from "@/firebase/utils";
import { setLoading, setError } from "@/store/slices/assessmentSlice";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AssessmentList from "./AssessmentList";
import PendingSubmissions from "./PendingSubmissions";
import CreateAssessmentModal from "./CreateAssessmentModal";
import {
  ClockIcon,
  DocumentCheckIcon,
  UserGroupIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

export default function TeacherDashboard() {
  const user = useSelector((state) => state.auth.user);
  const router = useRouter();
  const dispatch = useDispatch();
  const [dashboardState, setDashboardState] = useState({
    assessments: [],
    stats: null,
    pendingSubmissions: [],
    recentActivity: [],
    loading: true,
    error: null,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.uid) return;

      try {
        setDashboardState((prev) => ({ ...prev, loading: true, error: null }));

        const [assessmentData, statsData, pendingData] = await Promise.all([
          getUserAssessments(user.uid, "teacher"),
          getTeacherStats(user.uid),
          getPendingSubmissions(user.uid),
        ]);

        setDashboardState({
          assessments: assessmentData,
          stats: statsData,
          pendingSubmissions: pendingData,
          recentActivity: pendingData.slice(0, 5),
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error loading dashboard:", error);
        setDashboardState((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      }
    };

    loadDashboardData();
  }, [user, refreshTrigger]);

  const handleRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const QuickStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {[
        {
          title: "Total Assessments",
          value: dashboardState.stats?.totalAssessments || 0,
          icon: DocumentCheckIcon,
          color: "blue",
        },
        {
          title: "Active Students",
          value: dashboardState.stats?.activeStudents || 0,
          icon: UserGroupIcon,
          color: "green",
        },
        {
          title: "Pending Reviews",
          value: dashboardState.pendingSubmissions.length,
          icon: ClockIcon,
          color: "yellow",
        },
      ].map((stat, idx) => (
        <div key={idx} className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">{stat.title}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
            <stat.icon className={`h-8 w-8 text-${stat.color}-500`} />
          </div>
        </div>
      ))}
    </div>
  );

  const RecentActivity = () => (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <button
          onClick={handleRefresh}
          className="text-blue-600 text-sm hover:underline"
        >
          Refresh
        </button>
      </div>
      {dashboardState.recentActivity.length > 0 ? (
        <div className="space-y-4">
          {dashboardState.recentActivity.map((submission) => (
            <div
              key={submission.id}
              className="flex items-center justify-between border-b pb-4"
            >
              <div>
                <p className="font-medium">{submission.studentName}</p>
                <p className="text-sm text-gray-500">
                  Submitted {submission.assessmentTitle}
                </p>
              </div>
              <Link
                href={`/teacher/assessments/${submission.assessmentId}/submissions/${submission.id}/grade`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Grade Now
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No recent activity</p>
      )}
    </div>
  );

  if (!user || user.role !== "teacher") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <ExclamationCircleIcon className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-gray-600 mt-2">Teacher privileges required.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.displayName}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create New Assessment
        </button>
      </div>

      <QuickStats stats={dashboardState.stats} />
      <RecentActivity
        activities={dashboardState.recentActivity}
        onRefresh={handleRefresh}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Your Assessments</h2>
          <AssessmentList
            assessments={dashboardState.assessments}
            onUpdate={handleRefresh}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Pending Reviews</h2>
          <PendingSubmissions
            submissions={dashboardState.pendingSubmissions}
            loading={dashboardState.loading}
            error={dashboardState.error}
            onGrade={handleRefresh}
          />
        </div>
      </div>

      {isModalOpen && (
        <CreateAssessmentModal
          onClose={() => setIsModalOpen(false)}
          onAssessmentCreated={(newAssessment) => {
            handleRefresh();
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
