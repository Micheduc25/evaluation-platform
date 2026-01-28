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
  ChevronLeftIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import { deleteSubmission, getUserAssessments } from "@/firebase/utils";
import { getSubmissions, getAllAssessmentSubmissions } from "@/services/submissionService";

export default function AllSubmissionsPage() {
  const user = useSelector((state) => state.auth.user);
  const router = useRouter();
  
  // Data State
  const [submissions, setSubmissions] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDocs, setLastDocs] = useState([]); // Stack of lastDocs for pagination history
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filter State
  const [filters, setFilters] = useState({
    status: "all",
    assessment: "all",
  });
  
  // Selection State
  const [selectedSubmissions, setSelectedSubmissions] = useState(new Set());

  // Initial Data Load (Assessments)
  useEffect(() => {
    const loadAssessments = async () => {
      if (!user?.uid) return;
      try {
        const assessmentsData = await getUserAssessments(user.uid, "teacher");
        setAssessments(assessmentsData);
      } catch (error) {
        console.error("Error loading assessments:", error);
      }
    };
    loadAssessments();
  }, [user]);

  // Submissions Load (Triggered by user or filter change)
  useEffect(() => {
    if (!user?.uid) return;
    loadRefreshedSubmissions();
  }, [user, filters]);

  const loadRefreshedSubmissions = async () => {
     setPage(1);
     setLastDocs([]);
     await fetchSubmissions();
  };

  const fetchSubmissions = async (lastDoc = null) => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      const { submissions: newSubmissions, lastDoc: newLastDoc, hasMore: moreAvailable, totalCount: count } = await getSubmissions({
        teacherId: user.uid,
        assessmentId: filters.assessment,
        status: filters.status,
        pageSize: 10,
        lastDoc: lastDoc
      });
      
      setSubmissions(newSubmissions);
      setHasMore(moreAvailable);
      setTotalCount(count);
      setCurrentLastDoc(newLastDoc);
      
    } catch (error) {
      console.error("Error loading submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
     if (!submissions.length) return;
     const currentLastDoc = submissions[submissions.length - 1]; 
  };
  
  // Revised Pagination Logic
  // We will store `lastVisible` in state.
  const [currentLastDoc, setCurrentLastDoc] = useState(null);
  
  // Wrapped fetcher
  const executeFetch = async (startAfterDoc = null) => {
      setLoading(true);
      try {
          const result = await getSubmissions({
            teacherId: user.uid,
            assessmentId: filters.assessment,
            status: filters.status,
            pageSize: 10,
            lastDoc: startAfterDoc
          });
          setSubmissions(result.submissions);
          setCurrentLastDoc(result.lastDoc);
          setHasMore(result.hasMore);
          setTotalCount(result.totalCount);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleFilterChange = (key, value) => {
      setFilters(prev => ({ ...prev, [key]: value }));
      // Effect will trigger reload
  };

  const loadNext = () => {
      if(hasMore && currentLastDoc) {
          setLastDocs(prev => [...prev, currentLastDoc]); // Push the doc that ends the current page
          setPage(p => p + 1);
          executeFetch(currentLastDoc);
      }
  };

  const loadPrev = () => {
      if (page > 1) {
          const newHistory = [...lastDocs];
          newHistory.pop(); // Pop the one we used to get HERE.
          
          setLastDocs(newHistory);
          setPage(p => p - 1);
          executeFetch(newHistory.length > 0 ? newHistory[newHistory.length - 1] : null);
      }
  };


  const handleDelete = async (submissionId) => {
    if (window.confirm("Are you sure you want to delete this submission?")) {
      try {
        await deleteSubmission(submissionId);
        setSubmissions((prev) => prev.filter((sub) => sub.id !== submissionId));
        setTotalCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Error deleting submission:", error);
      }
    }
  };

  // Bulk delete only for visible items
  const handleBulkDelete = async () => {
     if (
      window.confirm(
        `Are you sure you want to delete ${selectedSubmissions.size} submission(s)?`
      )
    ) {
      try {
        setLoading(true);
        await Promise.all(
          Array.from(selectedSubmissions).map((id) => deleteSubmission(id))
        );
        // Refresh page
        executeFetch(page > 1 && lastDocs.length > 0 ? lastDocs[lastDocs.length - 1] : null);
        setSelectedSubmissions(new Set());
      } catch (error) {
        console.error("Error performing bulk delete:", error);
        setLoading(false);
      }
    }
  };
  
    const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = submissions.map((sub) => sub.id);
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

  const handleExportCSV = async () => {
    if (filters.assessment === "all") {
      alert("Please select a specific assessment to export submissions.");
      return;
    }

    try {
        setLoading(true);
        const exportData = await getAllAssessmentSubmissions(filters.assessment);
        
        if (!exportData || exportData.length === 0) {
            alert("No submissions found for this assessment.");
            setLoading(false);
            return;
        }

        // Define CSV headers
        const headers = ["Registration Number", "Student Name", "Mark", "Total Points"];
        
        // Define CSV rows
        const rows = exportData.map(sub => [
            `"${sub.registrationNumber}"`, // Quote strings to handle commas
            `"${sub.studentName}"`,
            sub.score,
            sub.totalPoints || "-"
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        // Create blob and download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        
        const assessmentTitle = assessments.find(a => a.id === filters.assessment)?.title || "Assessment";
        const cleanTitle = assessmentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.setAttribute("download", `${cleanTitle}_submissions.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Export failed:", error);
        alert("Failed to export CSV. Please try again.");
    } finally {
        setLoading(false);
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
  
  const totalPages = Math.ceil(totalCount / 10);

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
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="border rounded-md px-2 py-1"
            >
              <option value="all">All Status</option>
              {/* <option value="pending_review">Pending Review</option> */}
               {/* Firestore specific: if filtering by status, we need index with assessmentId. 
                   Since we have composite index limitation awareness, ensure these exist. 
                   Standard indexes should cover single field equality. 
               */}
              <option value="pending_review">Pending Review</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filters.assessment}
              onChange={(e) => handleFilterChange("assessment", e.target.value)}
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
          
           {/* Pagination Controls in Filter Bar */}
           <div className="flex items-center space-x-2 ml-auto">
               <span className="text-sm text-gray-500">
                 Page {page} {totalPages > 0 && `of ${totalPages}`}
               </span>
               <button 
                onClick={loadPrev} 
                disabled={page === 1 || loading}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
               >
                 <ChevronLeftIcon className="h-5 w-5" />
               </button>
               <button 
                onClick={loadNext} 
                disabled={!hasMore || loading}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
               >
                 <ChevronRightIcon className="h-5 w-5" />
               </button>
           </div>

          <div className="flex items-center ml-2">
            <button
              onClick={handleExportCSV}
              disabled={filters.assessment === "all" || loading}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Export CSV"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-1" />
              <span className="hidden sm:inline">Export CSV</span>
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
                        submissions.length > 0 &&
                        selectedSubmissions.size === submissions.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8">
                      <div className="flex justify-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : submissions.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="text-center py-8 text-gray-500">
                            No submissions found.
                        </td>
                    </tr>
                ) : (
                  submissions.map((submission, index) => (
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
                        {((page - 1) * 10) + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{submission.studentName}</div>
                        <div className="text-xs text-gray-500">{submission.studentEmail}</div>
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
                              typeof submission.submittedAt.toDate === 'function' ? submission.submittedAt.toDate() : new Date(submission.submittedAt),
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
