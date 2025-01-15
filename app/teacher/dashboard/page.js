"use client";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  getUserAssessments,
  getTeacherStats,
  getPendingSubmissions,
} from "@/firebase/utils";
import AssessmentList from "./AssessmentList";
import DashboardStats from "./DashboardStats";
import CreateAssessmentModal from "./CreateAssessmentModal";
import PendingSubmissions from "./PendingSubmissions";
import Link from "next/link";
import { ArrowRightIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import QuickActionCard from "./QuickActionCard";

export default function TeacherDashboard() {
  const user = useSelector((state) => state.auth.user);
  const [assessments, setAssessments] = useState([]);
  const [stats, setStats] = useState(null);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [assessmentData, statsData, pendingSubmissions] =
          await Promise.all([
            getUserAssessments(user.uid, "teacher"),
            getTeacherStats(user.uid),
            getPendingSubmissions(user.uid),
          ]);
        setAssessments(assessmentData);
        setStats(statsData);
        setPendingSubmissions(pendingSubmissions);

        console.log("stats =====>", statsData);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) loadDashboardData();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      {loading ? (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : !user || user.role !== "teacher" ? (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h2 className="text-xl font-semibold text-gray-800">Access Denied</h2>
          <p className="text-gray-600 mt-2">Teacher privileges required.</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Create New Assessment
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <QuickActionCard
              title="View All Submissions"
              count={stats?.totalSubmissions || 0}
              href="/teacher/submissions"
              icon={ClipboardIcon}
              color="blue"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DashboardStats stats={stats} />
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Pending Reviews</h2>
                <Link
                  href="/teacher/submissions"
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                >
                  View All
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
              <PendingSubmissions
                submissions={pendingSubmissions}
                teacherId={user.uid}
              />
            </div>
          </div>

          <div className="mt-8">
            <AssessmentList assessments={assessments} />
          </div>

          {isModalOpen && (
            <CreateAssessmentModal
              onClose={() => setIsModalOpen(false)}
              onAssessmentCreated={(newAssessment) => {
                setAssessments([...assessments, newAssessment]);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
