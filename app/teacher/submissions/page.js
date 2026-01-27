"use client";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ChevronDownIcon,
  AdjustmentsVerticalIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { getAllSubmissions, deleteSubmission, getUserAssessments } from "@/firebase/utils";

export default function AllSubmissionsPage() {
  const user = useSelector((state) => state.auth.user);
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    assessment: "all",
  });
  const [selectedSubmissions, setSelectedSubmissions] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({
    key: "submittedAt",
    direction: "desc",
  });

  useEffect(() => {
    const loadSubmissions = async () => {
      if (!user?.uid) return;
      try {
        setLoading(true);
        const [submissionsData, assessmentsData] = await Promise.all([
          getAllSubmissions(user.uid),
          getUserAssessments(user.uid, "teacher"),
        ]);
        setSubmissions(submissionsData);
        setAssessments(assessmentsData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, [user]);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  const handleDelete = async (submissionId) => {
    if (window.confirm("Are you sure you want to delete this submission?")) {
      try {
        await deleteSubmission(submissionId);
        // Update the submissions list after deletion
        setSubmissions((prev) => prev.filter((sub) => sub.id !== submissionId));
        setSelectedSubmissions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(submissionId);
          return newSet;
        });
      } catch (error) {
        console.error("Error deleting submission:", error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedSubmissions.size} submission(s)? This action cannot be undone.`
      )
    ) {
      try {
        setLoading(true);
        await Promise.all(
          Array.from(selectedSubmissions).map((id) => deleteSubmission(id))
        );
        setSubmissions((prev) =>
          prev.filter((sub) => !selectedSubmissions.has(sub.id))
        );
        setSelectedSubmissions(new Set());
      } catch (error) {
        console.error("Error performing bulk delete:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = filteredAndSortedSubmissions.map((sub) => sub.id);
      setSelectedSubmissions(new Set(allIds));
    } else {
      setSelectedSubmissions(new Set());
    }
  };

  const handleSelectSubmission = (id) => {
    setSelectedSubmissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredAndSortedSubmissions = submissions
    .filter((sub) => {
      if (filters.status !== "all" && sub.status !== filters.status)
        return false;
      if (
        filters.assessment !== "all" &&
        sub.assessmentId !== filters.assessment
      )
        return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          sub.studentName?.toLowerCase().includes(searchLower) ||
          sub.assessmentTitle?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      if (sortConfig.key === "submittedAt") {
        return (
          (new Date(a.submittedAt).getTime() -
            new Date(b.submittedAt).getTime()) *
          direction
        );
      }
      return (a[sortConfig.key] < b[sortConfig.key] ? -1 : 1) * direction;
    });

  const handleExportCSV = () => {
    if (filters.assessment === "all") {
      alert("Please select a specific assessment to export submissions with detailed answers.");
      return;
    }

    try {
      let headers = [
        "Student Name",
        "Assessment Title",
        "Status",
        "Score",
        "Total Points",
        "Submitted At",
      ];

      // Since we enforce assessment selection, we can always get the questions
      let questions = [];
      const assessment = assessments.find((a) => a.id === filters.assessment);
      
      if (assessment?.questions) {
        questions = assessment.questions;
        headers = [
          ...headers,
          ...questions.map((q, i) => {
            // Truncate question text for header if too long
            const text = q.text?.length > 50 ? q.text.substring(0, 50) + "..." : q.text || `Question ${i + 1}`;
            return `Q${i + 1}: ${text}`;
          }),
        ];
      }

      const csvContent = [
        headers.join(","),
        ...filteredAndSortedSubmissions.map((sub) => {
          const submittedAt = sub.submittedAt
            ? format(sub.submittedAt.toDate(), "yyyy-MM-dd HH:mm:ss")
            : "N/A";

          // Escape quotes in strings
          const safeString = (str) => {
            if (str === null || str === undefined) return '""';
            return `"${String(str).replace(/"/g, '""')}"`;
          };

          const row = [
            safeString(sub.studentName),
            safeString(sub.assessmentTitle),
            sub.status,
            sub.score,
            sub.totalPoints || 0,
            submittedAt,
          ];

          // Add answers
          if (questions.length > 0) {
            questions.forEach((question) => {
              const answer = sub.answers?.find((a) => a.questionId === question.id);
              let answerText = "";

              if (answer) {
                if (question.type === "multiple_choice") {
                  if (typeof answer.selectedAnswer === 'object' && answer.selectedAnswer !== null) {
                      answerText = answer.selectedAnswer.value || answer.selectedAnswer.label || JSON.stringify(answer.selectedAnswer);
                  } else {
                      answerText = answer.selectedAnswer || "";
                  }
                } else {
                  answerText = answer.text || answer.answer || "";
                }
              }
              row.push(safeString(answerText));
            });
          }

          return row.join(",");
        }),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);

      const date = format(new Date(), "yyyy-MM-dd");
      const assessmentTitle = assessment?.title || "assessment";
      const filename = `${assessmentTitle
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}_submissions_${date}.csv`;

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV");
    }
  };



  const StatusBadge = ({ status }) => {
    const colors = {
      pending_review: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      in_progress: "bg-blue-100 text-blue-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          colors[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status?.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  if (!user || user.role !== "teacher") {
    return <div>Access denied</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">All Submissions</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2">
            <AdjustmentsVerticalIcon className="h-5 w-5 text-gray-400" />
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              className="border rounded-md px-2 py-1"
            >
              <option value="all">All Status</option>
              <option value="pending_review">Pending Review</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filters.assessment}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, assessment: e.target.value }))
              }
              className="border rounded-md px-2 py-1"
            >
              <option value="all">All Assessments</option>
              {assessments.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>
                  {assessment.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search students or assessments..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full pl-10 pr-4 py-2 border rounded-md"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <button
              onClick={handleExportCSV}
              disabled={filters.assessment === "all"}
              title={filters.assessment === "all" ? "Select an assessment to export" : "Export CSV"}
              className={`flex items-center space-x-2 px-4 py-2 text-white rounded-md transition-colors whitespace-nowrap ${
                filters.assessment === "all"
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedSubmissions.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedSubmissions.size} submission
              {selectedSubmissions.size !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Delete Selected</span>
            </button>
          </div>
        )}

        {/* Submissions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedSubmissions.size > 0 &&
                        selectedSubmissions.size ===
                          filteredAndSortedSubmissions.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  {[
                    { key: "studentName", label: "Student" },
                    { key: "assessmentTitle", label: "Assessment" },
                    { key: "status", label: "Status" },
                    { key: "score", label: "Score" },
                    { key: "submittedAt", label: "Submitted" },
                    { label: "Actions", className: "text-center" },
                  ].map((column) => (
                    <th
                      key={column.key || "actions"}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer ${
                        column.className || ""
                      }`}
                      onClick={() => column.key && handleSort(column.key)}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{column.label}</span>
                        {column.key && (
                          <ChevronDownIcon
                            className={`h-4 w-4 transition-transform ${
                              sortConfig.key === column.key &&
                              sortConfig.direction === "desc"
                                ? "transform rotate-180"
                                : ""
                            }`}
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedSubmissions.map((submission, index) => (
                    <tr
                      key={submission.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedSubmissions.has(submission.id)}
                          onChange={() => handleSelectSubmission(submission.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {submission.studentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {submission.assessmentTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={submission.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {submission.score}/{submission.totalPoints || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submission.submittedAt
                          ? format(
                              submission.submittedAt?.toDate(),
                              "MMM d, yyyy HH:mm"
                            )
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDelete(submission.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-full 
                                     hover:bg-red-50 transition-colors"
                            title="Delete submission"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              submission.status !== "pending_review"
                                ? router.push(
                                    `/teacher/submissions/${submission.id}`
                                  )
                                : router.push(
                                    `/teacher/assessments/${submission.assessmentId}/submissions/${submission.id}/grade`
                                  )
                            }
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {submission.status === "pending_review"
                              ? "Grade"
                              : "View"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
