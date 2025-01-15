"use client";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { getTeacherClassrooms } from "@/firebase/utils";
import { ClockIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { deleteAssessment } from "@/firebase/utils";
import {
  PencilIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { removeAssessment } from "@/store/slices/assessmentSlice";
import { toast } from "react-hot-toast";

export default function AssessmentList({ assessments, isLoading }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const user = useSelector((state) => state.auth.user);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState("all");
  const [filteredAssessments, setFilteredAssessments] = useState(assessments);

  useEffect(() => {
    loadClassrooms();
  }, [user]);

  useEffect(() => {
    filterAssessments();
  }, [selectedClassroom, assessments]);

  const loadClassrooms = async () => {
    if (!user) return;
    const data = await getTeacherClassrooms(user.uid);
    setClassrooms(data);
  };

  const filterAssessments = () => {
    if (selectedClassroom === "all") {
      setFilteredAssessments(assessments);
    } else {
      setFilteredAssessments(
        assessments.filter(
          (assessment) => assessment.classroomId === selectedClassroom
        )
      );
    }
  };

  const handleEdit = (id) => {
    router.push(`/teacher/assessments/${id}/edit`);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this assessment?")) {
      try {
        setDeletingId(id);
        await deleteAssessment(id);
        dispatch(removeAssessment(id));
        toast.success("Assessment deleted successfully");
      } catch (error) {
        console.error("Error deleting assessment:", error);
        toast.error("Failed to delete assessment");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatEndDate = (endDate) => {
    if (!endDate) return "";
    // Handle both Firestore Timestamp and ISO string formats
    const date =
      typeof endDate === "string" ? new Date(endDate) : endDate?.toDate();
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortedAssessments = () => {
    if (!assessments) return [];

    return [...assessments].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle date fields
      if (["endDate", "createdAt"].includes(sortField)) {
        aVal = typeof aVal === "string" ? new Date(aVal) : aVal?.toDate();
        bVal = typeof bVal === "string" ? new Date(bVal) : bVal?.toDate();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUpIcon className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 inline ml-1" />
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assessments?.length) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">
          No assessments found. Create your first assessment to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="overflow-x-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Your Assessments</h2>
          <select
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Classrooms</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900"
                onClick={() => handleSort("title")}
              >
                Title <SortIcon field="title" />
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900"
                onClick={() => handleSort("endDate")}
              >
                Due Date <SortIcon field="endDate" />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900"
                onClick={() => handleSort("submissionCount")}
              >
                Submissions <SortIcon field="submissionCount" />
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {getSortedAssessments().map((assessment) => (
              <tr
                key={assessment.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {assessment.title}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500">
                    {formatEndDate(assessment.endDate)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge
                    date={
                      typeof assessment.endDate === "string"
                        ? new Date(assessment.endDate)
                        : assessment.endDate?.toDate()
                    }
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 font-medium">
                    {assessment.submissionCount || 0}
                  </div>
                </td>
                <td className="px-6 py-4 text-right space-x-3">
                  <button
                    onClick={() => handleEdit(assessment.id)}
                    className="text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
                    disabled={deletingId === assessment.id}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(assessment.id)}
                    className="text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
                    disabled={deletingId === assessment.id}
                  >
                    {deletingId === assessment.id ? (
                      <div className="h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <TrashIcon className="h-5 w-5" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ date }) {
  const now = new Date();
  const isActive = date && date > now;
  const status = isActive ? "Active" : "Expired";
  const colors = {
    Active: "bg-green-50 text-green-700 ring-green-600/20",
    Expired: "bg-red-50 text-red-700 ring-red-600/20",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${colors[status]}`}
    >
      {status}
    </span>
  );
}
