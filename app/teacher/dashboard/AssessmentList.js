import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { deleteAssessment } from "@/firebase/utils";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { removeAssessment } from "@/store/slices/assessmentSlice";
import { toast } from "react-hot-toast";

export default function AssessmentList({ assessments, isLoading }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState(null);

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
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Submissions
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {assessments.map((assessment) => (
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
                    {assessment.endDate &&
                      assessment.endDate.toDate().toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge
                    date={assessment.endDate && assessment.endDate.toDate()}
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
  const isActive = date > now;
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
