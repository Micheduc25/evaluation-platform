
import { db } from "../firebase/client";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  getCountFromServer,
} from "firebase/firestore";

/**
 * Fetches submissions with pagination, filtering, and efficient related data loading.
 * avoiding N+1 queries by batching user and assessment lookups.
 *
 * @param {Object} options
 * @param {string} options.teacherId - Required for security/scoping
 * @param {string} [options.assessmentId] - Filter by specific assessment
 * @param {string} [options.status] - Filter by status (pending_review, completed, etc.)
 * @param {number} [options.pageSize=10] - Number of items to fetch
 * @param {Object} [options.lastDoc] - The last document from the previous page for pagination
 * @returns {Promise<{submissions: Array, lastDoc: Object, hasMore: boolean, totalCount: number}>}
 */
export const getSubmissions = async ({
  teacherId,
  assessmentId = null,
  status = "all",
  pageSize = 10,
  lastDoc = null,
}) => {
  try {
    const submissionsRef = collection(db, "submissions");
    let constraints = [];
    let countConstraints = []; // Separate constraints for counting (no limit/startAfter)

    // 1. Base Filters
    if (assessmentId && assessmentId !== "all") {
      const c = where("assessmentId", "==", assessmentId);
      constraints.push(c);
      countConstraints.push(c);
    } else {
         const assessmentsRef = collection(db, "assessments");
         const assessmentsQ = query(assessmentsRef, where("createdBy", "==", teacherId));
         const assessmentsSnap = await getDocs(assessmentsQ);
         const assessmentIds = assessmentsSnap.docs.map(doc => doc.id);
         
         if (assessmentIds.length === 0) {
             return { submissions: [], lastDoc: null, hasMore: false, totalCount: 0 };
         }
         
         if (assessmentIds.length > 30) {
              const c = where("assessmentId", "in", assessmentIds.slice(0, 30));
              constraints.push(c);
              countConstraints.push(c);
         } else {
             const c = where("assessmentId", "in", assessmentIds);
             constraints.push(c);
             countConstraints.push(c);
         }
    }

    if (status !== "all") {
      const c = where("status", "==", status);
      constraints.push(c);
      countConstraints.push(c);
    }

    // 2. Sorting
    constraints.push(orderBy("submittedAt", "desc"));
    // Count query doesn't need ordering

    // 3. Pagination
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    constraints.push(limit(pageSize));

    const q = query(submissionsRef, ...constraints);
    
    // Execute data fetch and count fetch in parallel
    // We strictly need count only on first load or filter change, but for UI simplicity we fetch it.
    // Optimization: If lastDoc is present, we might skip count if we cached it, but let's be robust first.
    
    const countQuery = query(submissionsRef, ...countConstraints);
    
    const [snapshot, countSnapshot] = await Promise.all([
        getDocs(q),
        getCountFromServer(countQuery)
    ]);

    const totalCount = countSnapshot.data().count;

    if (snapshot.empty) {
      return { submissions: [], lastDoc: null, hasMore: false, totalCount };
    }

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    const rawSubmissions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 4. Batched Data Fetching
    const studentIds = [...new Set(rawSubmissions.map((s) => s.studentId))];
    const uniqueAssessmentIds = [...new Set(rawSubmissions.map((s) => s.assessmentId))];

    // Fetch Students
    const studentPromises = studentIds.map((uid) =>
       getDoc(doc(db, "users", uid)).then(snap => ({id: uid, ...snap.data()}))
    );
    
    // Fetch Assessments
    const assessmentPromises = uniqueAssessmentIds.map((aid) =>
       getDoc(doc(db, "assessments", aid)).then(snap => ({id: aid, ...snap.data()}))
    );

    const [students, assessments] = await Promise.all([
      Promise.all(studentPromises),
      Promise.all(assessmentPromises)
    ]);

    const studentMap = students.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
    }, {});

    const assessmentMap = assessments.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
    }, {});

    // 5. Merge Data
    const enrichedSubmissions = rawSubmissions.map((sub) => {
        const student = studentMap[sub.studentId] || {};
        const assessment = assessmentMap[sub.assessmentId] || {};
        return {
            ...sub,
            studentName: student.displayName || "Unknown Student",
            studentEmail: student.email,
            registrationNumber: student.registrationNumber || "N/A",
            assessmentTitle: assessment.title || "Unknown Assessment",
            totalPoints: assessment.totalPoints || 0
        };
    });

    return {
      submissions: enrichedSubmissions,
      lastDoc: lastVisible,
      hasMore: snapshot.docs.length === pageSize,
      totalCount
    };

  } catch (error) {
    console.error("Error in getSubmissions service:", error);
    throw error;
  }
};

/**
 * Fetches all submissions for a specific assessment for CSV export.
 * Warning: Does not implement pagination. Use with caution on large datasets or implement batching if needed.
 * 
 * @param {string} assessmentId 
 * @returns {Promise<Array>} Array of enriched submission objects
 */
export const getAllAssessmentSubmissions = async (assessmentId) => {
    try {
        const submissionsRef = collection(db, "submissions");
        const q = query(
            submissionsRef, 
            where("assessmentId", "==", assessmentId),
            orderBy("submittedAt", "desc")
        );

        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return [];
        }

        const rawSubmissions = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Batch fetch students
        const studentIds = [...new Set(rawSubmissions.map((s) => s.studentId))];
        const studentPromises = studentIds.map((uid) =>
            getDoc(doc(db, "users", uid)).then(snap => ({id: uid, ...snap.data()}))
        );
        const students = await Promise.all(studentPromises);
        const studentMap = students.reduce((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
        }, {});

        // Combine data
        return rawSubmissions.map(sub => {
            const student = studentMap[sub.studentId] || {};
            return {
                ...sub,
                studentName: student.displayName || "Unknown Student",
                studentEmail: student.email,
                registrationNumber: student.registrationNumber || "N/A",
                // Score is already in sub
            };
        });

    } catch (error) {
        console.error("Error fetching all submissions for export:", error);
        throw error;
    }
};
