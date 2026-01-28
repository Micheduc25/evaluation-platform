"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSubmissions } from "@/services/submissionService";
import { format } from "date-fns";
import { useSelector } from "react-redux";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

export default function SubmissionsList({ params }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const assessmentId = params.id;
  const user = useSelector((state) => state.auth.user);

  // Pagination State
  const [page, setPage] = useState(1);
  const [lastDocs, setLastDocs] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [currentLastDoc, setCurrentLastDoc] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (user?.uid) {
        setPage(1);
        setLastDocs([]);
        fetchSubmissions();
    }
  }, [assessmentId, user]);

  const fetchSubmissions = async (lastDoc = null) => {
    try {
      setLoading(true);
      const { submissions: newSubmissions, lastDoc: newLastDoc, hasMore: moreAvailable, totalCount: count } = await getSubmissions({
        teacherId: user.uid,
        assessmentId: assessmentId,
        pageSize: 10,
        lastDoc: lastDoc
      });

      setSubmissions(newSubmissions);
      setCurrentLastDoc(newLastDoc);
      setHasMore(moreAvailable);
      setTotalCount(count);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadNext = () => {
      if(hasMore && currentLastDoc) {
          setLastDocs(prev => [...prev, currentLastDoc]);
          setPage(p => p + 1);
          fetchSubmissions(currentLastDoc);
      }
  };

  const loadPrev = () => {
      if (page > 1) {
          const newHistory = [...lastDocs];
          newHistory.pop();
          setLastDocs(newHistory);
          setPage(p => p - 1);
          fetchSubmissions(newHistory.length > 0 ? newHistory[newHistory.length - 1] : null);
      }
  };

  const handleGradeSubmission = (submissionId) => {
    router.push(
      `/teacher/assessments/${assessmentId}/submissions/${submissionId}/grade`
    );
  };

  // Status Badge Component (Consistent with other pages)
  const StatusBadge = ({ status }) => {
    const colors = {
      pending_review: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      in_progress: "bg-blue-100 text-blue-800",
    };

    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
        ${colors[status] || "bg-gray-100 text-gray-800"}`}
      >
        {status?.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  if (loading && page === 1) return <div className="p-8 text-center">Loading...</div>;

  const totalPages = Math.ceil(totalCount / 10);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Submissions</h1>
          
           {/* Pagination Controls */}
           <div className="flex items-center space-x-2">
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
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {submissions.length === 0 ? (
                <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">No submissions found.</td>
                </tr>
            ) : (
                submissions.map((submission) => (
              <tr key={submission.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {submission.studentName}
                  </div>
                  <div className="text-xs text-gray-500">
                      {submission.studentEmail}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={submission.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {submission.score}/{submission.totalPoints || "?"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {submission.submittedAt ? format(
                      typeof submission.submittedAt.toDate === 'function' ? submission.submittedAt.toDate() : new Date(submission.submittedAt),
                       "PPp"
                       ) : "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {submission.status === "pending_review" && (
                    <button
                      onClick={() => handleGradeSubmission(submission.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Grade
                    </button>
                  )}
                  {submission.status === "completed" && (
                    <span className="text-green-600 text-xs">Graded</span>
                  )}
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
