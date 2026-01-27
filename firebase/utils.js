"use client";
import { db } from "./client";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  orderBy,
  limit,
  increment,
  runTransaction,
} from "firebase/firestore";

// User document helpers
export const serializeUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    createdAt: user.createdAt?.toDate?.()
      ? user.createdAt.toDate().toISOString()
      : user.createdAt instanceof Date
      ? user.createdAt.toISOString()
      : user.createdAt,
    lastLogin: user.lastLogin?.toDate?.()
      ? user.lastLogin.toDate().toISOString()
      : user.lastLogin instanceof Date
      ? user.lastLogin.toISOString()
      : user.lastLogin,
    updatedAt: user.updatedAt?.toDate?.()
      ? user.updatedAt.toDate().toISOString()
      : user.updatedAt instanceof Date
      ? user.updatedAt.toISOString()
      : user.updatedAt,
  };
};

export const createUserDocument = async (user, additionalData = {}) => {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    createdAt: new Date(),
    lastLogin: new Date(),
    role: "student", // default role
    emailVerified: user.emailVerified,
    ...additionalData,
  };

  try {
    await setDoc(userRef, userData);
    return { uid: user.uid, ...userData };
  } catch (error) {
    console.error("Error creating user document:", error);
    throw error;
  }
};

export const getUserDocument = async (uid) => {
  if (!uid) return null;

  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { uid, ...userSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user document:", error);
    throw error;
  }
};

export const updateUserProfile = async (uid, userData) => {
  if (!uid) return null;

  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, {
      ...userData,
      updatedAt: new Date(),
    }, { merge: true });

    const updatedUser = await getUserDocument(uid);
    return updatedUser;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// Assessment helpers
export const createAssessment = async (assessmentData) => {
  console.log(" creation assessmentData:", assessmentData);
  try {
    return await runTransaction(db, async (transaction) => {
      const docRef = doc(collection(db, "assessments"));

      // Ensure dates are proper Date objects for Firestore
      const dataToStore = {
        ...assessmentData,
        createdAt: new Date(),
        endDate:
          assessmentData.type === "tutorial"
            ? null // No end date for tutorials
            : assessmentData.endDate instanceof Date
            ? assessmentData.endDate
            : new Date(assessmentData.endDate),
        classroomId: assessmentData.classroomId,
        type: assessmentData.type || "assessment", // Add type field
      };

      transaction.set(docRef, dataToStore);
      return docRef.id;
    });
  } catch (error) {
    console.error("Error creating assessment:", error);
    throw error;
  }
};

export const getAssessment = async (assessmentId) => {
  try {
    const docRef = doc(db, "assessments", assessmentId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error("Error getting assessment:", error);
    throw error;
  }
};

export const deleteAssessment = async (assessmentId) => {
  try {
    await deleteDoc(doc(db, "assessments", assessmentId));
    // Optional: Delete related submissions
    const submissionsQuery = query(
      collection(db, "submissions"),
      where("assessmentId", "==", assessmentId)
    );
    const submissionsSnap = await getDocs(submissionsQuery);
    const deletePromises = submissionsSnap.docs.map((doc) =>
      deleteDoc(doc.ref)
    );
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error deleting assessment:", error);
    throw error;
  }
};

export const updateAssessment = async (assessmentId, assessmentData) => {
  try {
    const docRef = doc(db, "assessments", assessmentId);

    // Ensure endDate is a proper Date object for Firestore
    const dataToUpdate = {
      ...assessmentData,
      endDate:
        assessmentData.endDate instanceof Date
          ? assessmentData.endDate
          : new Date(assessmentData.endDate),
      updatedAt: new Date(),
    };

    await updateDoc(docRef, dataToUpdate);
    return assessmentId;
  } catch (error) {
    console.error("Error updating assessment:", error);
    throw error;
  }
};

/**
 * Clones an existing assessment without any student submissions or associated data.
 * @param {string} sourceAssessmentId - The ID of the assessment to clone
 * @param {Object} overrides - Optional overrides for the cloned assessment
 * @param {string} overrides.title - Custom title for the clone
 * @param {string} overrides.classroomId - Target classroom for the clone
 * @param {Date|string} overrides.endDate - New end date for the clone
 * @param {string} overrides.createdBy - UID of the teacher creating the clone
 * @returns {Promise<{id: string, assessment: Object}>} The cloned assessment ID and data
 */
export const cloneAssessment = async (sourceAssessmentId, overrides = {}) => {
  try {
    // Fetch the source assessment
    const sourceAssessment = await getAssessment(sourceAssessmentId);
    if (!sourceAssessment) {
      throw new Error("Source assessment not found");
    }

    // Clone questions with fresh IDs
    const clonedQuestions = sourceAssessment.questions.map((question) => ({
      ...question,
      id: Date.now() + Math.random(), // Generate unique ID
    }));

    // Build the cloned assessment data
    const clonedData = {
      title: overrides.title || `[Clone] ${sourceAssessment.title}`,
      description: sourceAssessment.description || "",
      duration: sourceAssessment.duration,
      totalPoints: sourceAssessment.totalPoints,
      classroomId: overrides.classroomId || sourceAssessment.classroomId,
      type: sourceAssessment.type || "assessment",
      questions: clonedQuestions,
      createdBy: overrides.createdBy,
      createdAt: new Date(),
      endDate:
        overrides.endDate instanceof Date
          ? overrides.endDate
          : overrides.endDate
          ? new Date(overrides.endDate)
          : null,
      status: "active",
      submissionCount: 0, // Reset - no submissions for clone
    };

    // Create the new assessment document
    const docRef = doc(collection(db, "assessments"));
    await setDoc(docRef, clonedData);

    return {
      id: docRef.id,
      assessment: {
        id: docRef.id,
        ...clonedData,
        // Serialize dates for Redux/client usage
        createdAt: clonedData.createdAt.toISOString(),
        endDate: clonedData.endDate ? clonedData.endDate.toISOString() : null,
      },
    };
  } catch (error) {
    console.error("Error cloning assessment:", error);
    throw error;
  }
};

// Submission helpers

export const submitAssessment = async (submissionId, submissionData) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const submissionRef = doc(db, "submissions", submissionId);
      const assessmentRef = doc(db, "assessments", submissionData.assessmentId);

      const assessmentDoc = await transaction.get(assessmentRef);
      if (!assessmentDoc.exists()) {
        throw new Error("Assessment not found");
      }

      const assessmentData = assessmentDoc.data();
      let score = 0;
      let pendingGrading = false;

      console.log("questions:", submissionData.answers);

      for (const answer of submissionData.answers) {
        const question = assessmentData.questions.find(
          (q) => q.id === answer.questionId
        );

        if (question) {
          if (question.type === "multiple_choice") {
            if (
              answer.selectedAnswer &&
              question.correctAnswer === answer.selectedAnswer.value
            ) {
              score += question.points;
            }
          } else if (question.type === "open_answer") {
            pendingGrading = true;
          }
        }
      }

      // Update submission with score and status
      transaction.update(submissionRef, {
        ...submissionData,
        score,
        pendingGrading,
        status: pendingGrading ? "pending_review" : "completed",
        completedAt: new Date(),
      });

      // Update assessment submission count
      transaction.update(assessmentRef, {
        submissionCount: increment(1),
      });

      // Find and delete any other in-progress submissions
      const submissionsQuery = query(
        collection(db, "submissions"),
        where("assessmentId", "==", submissionData.assessmentId),
        where("studentId", "==", submissionData.studentId),
        where("status", "==", "in_progress")
      );

      const submissionsSnap = await getDocs(submissionsQuery);
      submissionsSnap.docs.forEach((doc) => {
        if (doc.id !== submissionId) {
          transaction.delete(doc.ref);
        }
      });

      return { score, pendingGrading };
    });
  } catch (error) {
    console.error("Error submitting assessment:", error);
    throw error;
  }
};

export const gradeOpenAnswerQuestion = async (
  submissionId,
  questionId,
  points,
  feedback = ""
) => {
  try {
    const submissionRef = doc(db, "submissions", submissionId);

    const submissionSnap = await getDoc(submissionRef);
    const submission = submissionSnap.data();

    // Update the answer with grading
    const updatedAnswers = submission.answers.map((answer) => {
      console.log(typeof answer.questionId, typeof questionId);

      if (answer.questionId === questionId) {
        return {
          ...answer,
          points,
          feedback,
          graded: true,
          gradedAt: new Date(),
        };
      }
      return answer;
    });

    // Calculate new total score
    const score = updatedAnswers.reduce(
      (total, answer) => total + (answer.points || 0),
      0
    );

    // Check if all questions that need grading are now graded
    const allGraded = updatedAnswers.every(
      (answer) =>
        answer.type === "multiple_choice" || // Multiple choice answers are auto-graded
        answer.graded === true // Open answers must be manually graded
    );

    const updateData = {
      answers: updatedAnswers,
      score,
      status: allGraded ? "completed" : "pending_review",
      pendingGrading: !allGraded,
      lastGradedAt: new Date(),
    };

    console.log("Update data:", updateData);

    if (allGraded) {
      updateData.completedAt = new Date();
    }

    await updateDoc(submissionRef, updateData);

    return {
      score,
      status: allGraded ? "completed" : "pending_review",
      allGraded,
    };
  } catch (error) {
    console.error("Error grading question:", error);
    throw error;
  }
};

// User helpers
export const getUserAssessments = async (userId, role) => {
  try {
    const assessmentsRef = collection(db, "assessments");
    let q;

    if (role === "teacher") {
      q = query(assessmentsRef, where("createdBy", "==", userId));
    } else {
      // For students, get assessments they can take
      q = query(assessmentsRef, where("endDate", ">=", new Date()));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting user assessments:", error);
    throw error;
  }
};

export const getTeacherStats = async (teacherId) => {
  try {
    const assessmentsQuery = query(
      collection(db, "assessments"),
      where("createdBy", "==", teacherId)
    );
    const submissionsQuery = query(
      collection(db, "submissions"),
      where("teacherId", "==", teacherId)
    );

    const [assessmentsSnap, submissionsSnap] = await Promise.all([
      getDocs(assessmentsQuery),
      getDocs(submissionsQuery),
    ]);

    const uniqueStudents = new Set(
      submissionsSnap.docs.map((doc) => doc.data().studentId)
    );
    console.log(submissionsSnap.docs.length);

    return {
      totalAssessments: assessmentsSnap.size,
      activeStudents: uniqueStudents.size,
      pendingReviews: submissionsSnap.docs.filter(
        (doc) => doc.data().pendingGrading
      ).length,
    };
  } catch (error) {
    console.error("Error getting teacher stats:", error);
    throw error;
  }
};

export const getAvailableAssessments = async (studentId) => {
  try {
    const membershipsQuery = query(
      collection(db, "classroom_memberships"),
      where("studentId", "==", studentId)
    );
    const memberships = await getDocs(membershipsQuery);
    const classroomIds = memberships.docs.map((doc) => doc.data().classroomId);

    if (classroomIds.length === 0) return { assessments: [], tutorials: [] };

    const now = new Date();
    const assessmentsQuery = query(
      collection(db, "assessments"),
      where("classroomId", "in", classroomIds)
    );

    const querySnapshot = await getDocs(assessmentsQuery);
    const assessments = [];
    const tutorials = [];

    for (const doc of querySnapshot.docs) {
      const item = { id: doc.id, ...doc.data() };

      // Check if student has already completed this item
      const submissionQuery = query(
        collection(db, "submissions"),
        where("assessmentId", "==", doc.id),
        where("studentId", "==", studentId),
        where("status", "!=", "in_progress"),
        limit(1)
      );
      const submissionSnapshot = await getDocs(submissionQuery);

      if (submissionSnapshot.empty) {
        if (item.type === "tutorial") {
          tutorials.push(item);
        } else {
          // Convert Firestore Timestamp to Date for proper comparison
          const endDate = item.endDate?.toDate ? item.endDate.toDate() : new Date(item.endDate);
          if (endDate >= now) {
            assessments.push(item);
          }
        }
      }
    }

    return { assessments, tutorials };
  } catch (error) {
    console.error("Error getting available assessments:", error);
    throw error;
  }
};

export const startAssessment = async (
  assessmentId,
  studentId,
  type = "assessment"
) => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Check for existing in-progress submission
      const inProgressQuery = query(
        collection(db, "submissions"),
        where("assessmentId", "==", assessmentId),
        where("studentId", "==", studentId),
        where("status", "==", "in_progress"),
        limit(1)
      );

      const inProgressSnapshot = await getDocs(inProgressQuery);
      if (!inProgressSnapshot.empty) {
        return inProgressSnapshot.docs[0].id;
      }

      // Check for COMPLETED or PENDING_REVIEW submission (One attempt policy)
      const completedQuery = query(
        collection(db, "submissions"),
        where("assessmentId", "==", assessmentId),
        where("studentId", "==", studentId),
        where("status", "in", ["completed", "pending_review"]),
        limit(1)
      );
      
      const completedSnapshot = await getDocs(completedQuery);
      if (!completedSnapshot.empty) {
         throw new Error("Assessment already submitted");
      }

      // Verify assessment exists and hasn't expired
      const assessmentRef = doc(db, "assessments", assessmentId);
      const assessmentDoc = await transaction.get(assessmentRef);

      if (!assessmentDoc.exists()) {
        throw new Error("Assessment not found");
      }

      const now = new Date();
      if (
        type === "assessment" &&
        now > assessmentDoc.data().endDate.toDate()
      ) {
        throw new Error("Assessment has expired");
      }

      // Create new submission
      const newSubmissionRef = doc(collection(db, "submissions"));
      transaction.set(newSubmissionRef, {
        assessmentId,
        studentId,
        startedAt: now,
        status: "in_progress",
        answers: [],
        score: 0,
        isGraded: false,
      });

      return newSubmissionRef.id;
    });
  } catch (error) {
    console.error("Error starting assessment:", error);
    throw error;
  }
};

export const getStudentStats = async (studentId) => {
  try {
    const classroomIds = await getStudentClassroomIds(studentId);
    if (classroomIds.length === 0) {
      return {
        completedExams: 0,
        averageScore: 0,
        totalSubmissions: 0,
      };
    }

    // Get all submissions from the student
    const submissionsQuery = query(
      collection(db, "submissions"),
      where("studentId", "==", studentId)
    );
    const submissionsSnap = await getDocs(submissionsQuery);

    // Filter submissions to only include those from enrolled classrooms
    const submissions = [];
    for (const doc of submissionsSnap.docs) {
      const submission = doc.data();
      const assessment = await getAssessment(submission.assessmentId);
      if (assessment && classroomIds.includes(assessment.classroomId)) {
        submissions.push({ ...submission, id: doc.id });
      }
    }

    const completedSubmissions = submissions.filter(
      (sub) => sub.status === "completed"
    );
    const totalScore = completedSubmissions.reduce(
      (sum, sub) => sum + sub.score,
      0
    );
    const averageScore =
      completedSubmissions.length > 0
        ? Math.round(totalScore / completedSubmissions.length)
        : 0;

    return {
      completedExams: completedSubmissions.length,
      averageScore,
      totalSubmissions: submissions.length,
    };
  } catch (error) {
    console.error("Error getting student stats:", error);
    throw error;
  }
};

export const getStudentUpcomingExams = async (studentId) => {
  try {
    const classroomIds = await getStudentClassroomIds(studentId);
    if (classroomIds.length === 0) return [];

    const now = new Date();
    const assessmentsQuery = query(
      collection(db, "assessments"),
      where("classroomId", "in", classroomIds),
      where("endDate", ">=", now),
      orderBy("endDate", "asc"),
      limit(5)
    );

    const submissionsQuery = query(
      collection(db, "submissions"),
      where("studentId", "==", studentId)
    );

    const [assessmentsSnap, submissionsSnap] = await Promise.all([
      getDocs(assessmentsQuery),
      getDocs(submissionsQuery),
    ]);

    const submittedAssessments = new Set(
      submissionsSnap.docs.map((doc) => doc.data().assessmentId)
    );

    return assessmentsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((assessment) => !submittedAssessments.has(assessment.id));
  } catch (error) {
    console.error("Error getting upcoming exams:", error);
    throw error;
  }
};

export const getStudentRecentResults = async (studentId) => {
  try {
    const classroomIds = await getStudentClassroomIds(studentId);
    if (classroomIds.length === 0) return [];

    const submissionsQuery = query(
      collection(db, "submissions"),
      where("studentId", "==", studentId),
      where("status", "==", "completed"),
      orderBy("submittedAt", "desc")
    );

    const submissionsSnap = await getDocs(submissionsQuery);
    const submissions = [];

    for (const doc of submissionsSnap.docs) {
      const submission = doc.data();
      const assessment = await getAssessment(submission.assessmentId);

      // Only include results from enrolled classrooms
      if (assessment && classroomIds.includes(assessment.classroomId)) {
        submissions.push({
          id: doc.id,
          title: assessment.title,
          score: submission.score,
          totalPoints: assessment.totalPoints,
          submittedAt: submission.submittedAt,
        });
      }
    }

    return submissions.slice(0, 5); // Return only the 5 most recent results
  } catch (error) {
    console.error("Error getting recent results:", error);
    throw error;
  }
};

export const getPendingSubmissions = async (teacherId) => {
  try {
    // First get all assessments created by this teacher
    const assessmentsQuery = query(
      collection(db, "assessments"),
      where("createdBy", "==", teacherId)
    );
    const assessmentsSnap = await getDocs(assessmentsQuery);
    const assessmentIds = assessmentsSnap.docs.map((doc) => doc.id);

    // Then get all pending submissions for these assessments
    const submissionsQuery = query(
      collection(db, "submissions"),
      where("assessmentId", "in", assessmentIds),
      where("status", "==", "pending_review"),
      orderBy("submittedAt", "desc")
    );

    const submissionsSnap = await getDocs(submissionsQuery);
    const submissions = [];

    // Get student details and assessment titles for each submission
    for (const submission of submissionsSnap.docs) {
      const submissionData = submission.data();
      const [studentDoc, assessmentDoc] = await Promise.all([
        getDoc(doc(db, "users", submissionData.studentId)),
        getDoc(doc(db, "assessments", submissionData.assessmentId)),
      ]);

      submissions.push({
        id: submission.id,
        ...submissionData,
        studentName: studentDoc.data()?.displayName || "Unknown Student",
        assessmentTitle: assessmentDoc.data()?.title || "Unknown Assessment",
      });
    }

    return submissions;
  } catch (error) {
    console.error("Error getting pending submissions:", error);
    throw error;
  }
};

export const getAllSubmissions = async (teacherId) => {
  try {
    // First get all assessments created by this teacher
    const assessmentsQuery = query(
      collection(db, "assessments"),
      where("createdBy", "==", teacherId)
    );
    const assessmentsSnap = await getDocs(assessmentsQuery);
    const assessmentIds = assessmentsSnap.docs.map((doc) => doc.id);

    if (assessmentIds.length === 0) return [];

    // Get all submissions for these assessments
    const submissionsQuery = query(
      collection(db, "submissions"),
      where("assessmentId", "in", assessmentIds)
    );

    const submissionsSnap = await getDocs(submissionsQuery);
    const submissions = [];

    // Get student details and assessment details for each submission
    for (const submissionDoc of submissionsSnap.docs) {
      const submissionData = submissionDoc.data();
      const [studentDoc, assessmentDoc] = await Promise.all([
        getDoc(doc(db, "users", submissionData.studentId)),
        getDoc(doc(db, "assessments", submissionData.assessmentId)),
      ]);

      submissions.push({
        id: submissionDoc.id,
        ...submissionData,
        studentName: studentDoc.data()?.displayName || "Unknown Student",
        assessmentTitle: assessmentDoc.data()?.title || "Unknown Assessment",
        totalPoints: assessmentDoc.data()?.totalPoints || 0,
      });
    }

    return submissions;
  } catch (error) {
    console.error("Error getting all submissions:", error);
    throw error;
  }
};

export const getSubmission = async (assessmentId, studentId) => {
  try {
    if (!assessmentId || !studentId) {
      throw new Error("Assessment ID and student ID are required");
    }

    const submissionQuery = query(
      collection(db, "submissions"),
      where("assessmentId", "==", assessmentId),
      where("studentId", "==", studentId),
      limit(1)
    );
    const submissionSnap = await getDocs(submissionQuery);

    if (submissionSnap.empty) {
      return null;
    }

    const submission = submissionSnap.docs[0].data();
    return { id: submissionSnap.docs[0].id, ...submission };
  } catch (error) {
    console.error("Error getting submission:", error);
    throw error;
  }
};

// New function to handle incomplete assessments
export const handleIncompleteAssessment = async (
  submissionId,
  answers,
  timeSpent
) => {
  try {
    const submissionRef = doc(db, "submissions", submissionId);
    const submission = await getDoc(submissionRef);

    if (!submission.exists()) return;

    const data = submission.data();
    if (data.status !== "in_progress") return;

    await updateDoc(submissionRef, {
      answers: Object.entries(answers).map(([questionId, answer]) => ({
        questionId: Number(questionId),
        selectedAnswer: answer,
        timeSpent: timeSpent[questionId] || 0,
      })),
      lastSaved: new Date(),
      status: "incomplete",
      totalTimeSpent: Object.values(timeSpent).reduce((a, b) => a + b, 0),
    });
  } catch (error) {
    console.error("Error handling incomplete assessment:", error);
  }
};

// New function to fetch detailed assessment results
export const getAssessmentResults = async (submissionId) => {
  try {
    const submissionRef = doc(db, "submissions", submissionId);
    const submissionSnap = await getDoc(submissionRef);

    if (!submissionSnap.exists()) {
      throw new Error("Submission not found");
    }

    const submissionData = submissionSnap.data();
    const assessmentSnap = await getDoc(
      doc(db, "assessments", submissionData.assessmentId)
    );

    if (!assessmentSnap.exists()) {
      throw new Error("Assessment not found");
    }

    const assessmentData = assessmentSnap.data();

    return {
      submission: {
        id: submissionSnap.id,
        ...submissionData,
      },
      assessment: {
        id: assessmentSnap.id,
        ...assessmentData,
      },
      details: {
        totalQuestions: assessmentData.questions.length,
        completedAt: submissionData.completedAt,
        totalScore: submissionData.score,
        maxScore: assessmentData.totalPoints,
        forcedSubmission: submissionData.forcedSubmission || false,
        tabViolations: submissionData.tabViolations || 0,
        percentage: Math.round(
          (submissionData.score / assessmentData.totalPoints) * 100
        ),
        timeSpent: submissionData.totalTimeSpent || 0,
      },
    };
  } catch (error) {
    console.error("Error fetching assessment results:", error);
    throw error;
  }
};

// New function to fetch pending results for a student
export const getStudentPendingResults = async (studentId) => {
  try {
    const classroomIds = await getStudentClassroomIds(studentId);
    if (classroomIds.length === 0) return [];

    const submissionsQuery = query(
      collection(db, "submissions"),
      where("studentId", "==", studentId),
      where("status", "==", "pending_review"),
      orderBy("submittedAt", "desc")
    );

    const submissionsSnap = await getDocs(submissionsQuery);
    const submissions = [];

    for (const doc of submissionsSnap.docs) {
      const submission = doc.data();
      const assessment = await getAssessment(submission.assessmentId);

      // Only include results from enrolled classrooms
      if (assessment && classroomIds.includes(assessment.classroomId)) {
        submissions.push({
          id: doc.id,
          title: assessment.title,
          score: submission.score,
          totalPoints: assessment.totalPoints,
          submittedAt: submission.submittedAt,
          status: "pending_review",
        });
      }
    }

    return submissions;
  } catch (error) {
    console.error("Error getting pending results:", error);
    throw error;
  }
};

// Classroom Management Functions

export const getStudentClassroomIds = async (studentId) => {
  try {
    const membershipsQuery = query(
      collection(db, "classroom_memberships"),
      where("studentId", "==", studentId)
    );
    const memberships = await getDocs(membershipsQuery);

    return memberships.docs.map((doc) => doc.data().classroomId);
  } catch (error) {
    console.error("Error getting student classrooms:", error);
    throw error;
  }
};

export const createClassroom = async (teacherId, classroomData) => {
  try {
    const classroomRef = doc(collection(db, "classrooms"));

    // Generate a unique join code using timestamp and random elements
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    const joinCode = (timestamp.slice(-3) + random).toUpperCase();

    await setDoc(classroomRef, {
      ...classroomData,
      teacherId,
      joinCode,
      createdAt: new Date(),
      updatedAt: new Date(),
      studentCount: 0,
    });

    return { id: classroomRef.id, joinCode };
  } catch (error) {
    console.error("Error creating classroom:", error);
    throw error;
  }
};

export const updateClassroom = async (classroomId, updateData) => {
  try {
    const classroomRef = doc(db, "classrooms", classroomId);
    await updateDoc(classroomRef, {
      ...updateData,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating classroom:", error);
    throw error;
  }
};

export const deleteClassroom = async (classroomId) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const classroomRef = doc(db, "classrooms", classroomId);

      // Delete all memberships
      const membershipsQuery = query(
        collection(db, "classroom_memberships"),
        where("classroomId", "==", classroomId)
      );
      const memberships = await getDocs(membershipsQuery);
      memberships.forEach((membershipDoc) => {
        transaction.delete(membershipDoc.ref);
      });

      // Delete the classroom
      transaction.delete(classroomRef);
    });
  } catch (error) {
    console.error("Error deleting classroom:", error);
    throw error;
  }
};

export const addStudentToClassroom = async (classroomId, studentId) => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Check if membership already exists
      const membershipQuery = query(
        collection(db, "classroom_memberships"),
        where("classroomId", "==", classroomId),
        where("studentId", "==", studentId)
      );
      const membershipDocs = await getDocs(membershipQuery);

      if (!membershipDocs.empty) {
        throw new Error("Student is already in this classroom");
      }

      // Create new membership
      const membershipRef = doc(collection(db, "classroom_memberships"));
      transaction.set(membershipRef, {
        classroomId,
        studentId,
        joinedAt: new Date(),
      });

      // Update student count
      const classroomRef = doc(db, "classrooms", classroomId);
      transaction.update(classroomRef, {
        studentCount: increment(1),
      });
    });
  } catch (error) {
    console.error("Error adding student to classroom:", error);
    throw error;
  }
};

export const removeStudentFromClassroom = async (classroomId, studentId) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const membershipQuery = query(
        collection(db, "classroom_memberships"),
        where("classroomId", "==", classroomId),
        where("studentId", "==", studentId)
      );
      const membershipDocs = await getDocs(membershipQuery);

      if (membershipDocs.empty) {
        throw new Error("Student is not in this classroom");
      }

      // Delete membership
      transaction.delete(membershipDocs.docs[0].ref);

      // Update student count
      const classroomRef = doc(db, "classrooms", classroomId);
      transaction.update(classroomRef, {
        studentCount: increment(-1),
      });
    });
  } catch (error) {
    console.error("Error removing student from classroom:", error);
    throw error;
  }
};

export const joinClassroomByCode = async (joinCode, studentId) => {
  try {
    const classroomQuery = query(
      collection(db, "classrooms"),
      where("joinCode", "==", joinCode)
    );
    const classroomDocs = await getDocs(classroomQuery);

    if (classroomDocs.empty) {
      throw new Error("Invalid join code");
    }

    const classroomId = classroomDocs.docs[0].id;
    await addStudentToClassroom(classroomId, studentId);

    return classroomId;
  } catch (error) {
    console.error("Error joining classroom:", error);
    throw error;
  }
};

export const getTeacherClassrooms = async (teacherId) => {
  try {
    const classroomsQuery = query(
      collection(db, "classrooms"),
      where("teacherId", "==", teacherId)
    );
    const classrooms = await getDocs(classroomsQuery);

    return classrooms.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting teacher classrooms:", error);
    throw error;
  }
};

export const getStudentClassrooms = async (studentId) => {
  try {
    const membershipsQuery = query(
      collection(db, "classroom_memberships"),
      where("studentId", "==", studentId)
    );
    const memberships = await getDocs(membershipsQuery);

    const classrooms = await Promise.all(
      memberships.docs.map(async (classRoomDoc) => {
        const classroomDoc = await getDoc(
          doc(db, "classrooms", classRoomDoc.data().classroomId)
        );
        return {
          id: classroomDoc.id,
          ...classroomDoc.data(),
        };
      })
    );

    return classrooms;
  } catch (error) {
    console.error("Error getting student classrooms:", error);
    throw error;
  }
};

// Add these new functions to your existing utils.js file

export const getClassroomDetails = async (classroomId) => {
  try {
    const classroomRef = doc(db, "classrooms", classroomId);
    const classroomDoc = await getDoc(classroomRef);

    if (!classroomDoc.exists()) {
      throw new Error("Classroom not found");
    }

    return {
      id: classroomDoc.id,
      ...classroomDoc.data(),
    };
  } catch (error) {
    console.error("Error getting classroom details:", error);
    throw error;
  }
};

export const getClassroomStudents = async (classroomId) => {
  try {
    const membershipsQuery = query(
      collection(db, "classroom_memberships"),
      where("classroomId", "==", classroomId)
    );

    const membershipsSnap = await getDocs(membershipsQuery);
    const studentIds = membershipsSnap.docs.map((doc) => doc.data().studentId);

    if (studentIds.length === 0) return [];

    const studentsData = await Promise.all(
      studentIds.map(async (studentId) => {
        const userDoc = await getDoc(doc(db, "users", studentId));
        return {
          id: userDoc.id,
          ...userDoc.data(),
        };
      })
    );

    return studentsData;
  } catch (error) {
    console.error("Error getting classroom students:", error);
    throw error;
  }
};

export const saveAssessmentProgress = async (submissionId, progressData) => {
  try {
    const submissionRef = doc(db, "submissions", submissionId);

    // We can directly call updateDoc here.
    // The Firestore Security Rules (lines 74-75) enforce that:
    // (isStudent(resource.data.studentId) && resource.data.status == 'in_progress')
    // Therefore, if the status is not 'in_progress', this update will fail with "permission-denied",
    // which serves the same purpose as the manual check but without the extra Read cost.
    
    await updateDoc(submissionRef, {
      answers: progressData.answers,
      currentQuestionIndex: progressData.currentQuestionIndex,
      timeSpentPerQuestion: progressData.timeSpentPerQuestion,
      violations: progressData.violations,
      lastSaved: new Date(),
      status: "in_progress", // Reinforcing status
    });

    return true;
  } catch (error) {
    // If it fails (e.g. permission denied because status != in_progress), we log it.
    console.error("Error saving assessment progress:", error);
    // throw error; // Optional: we can return false or throw. Original returned false on check fail.
    // If it's a permission error, it means we couldn't save.
    return false;
  }
};

export const getAssessmentProgress = async (submissionId) => {
  try {
    const submissionRef = doc(db, "submissions", submissionId);
    const submissionDoc = await getDoc(submissionRef);

    if (
      !submissionDoc.exists() ||
      submissionDoc.data().status !== "in_progress"
    ) {
      return null;
    }

    const data = submissionDoc.data();
    return {
      answers: data.answers || {},
      currentQuestionIndex: data.currentQuestionIndex || 0,
      timeSpentPerQuestion: data.timeSpentPerQuestion || {},
      violations: data.violations,
      lastSaved: data.lastSaved?.toDate() || new Date(),
    };
  } catch (error) {
    console.error("Error retrieving assessment progress:", error);
    throw error;
  }
};

// New functions to handle file uploads

export const uploadAssessmentImage = async (file, assessmentId) => {
  try {
    const result = await uploadFile(file, `assessments/${assessmentId}/images`);
    return result;
  } catch (error) {
    console.error("Error uploading assessment image:", error);
    throw error;
  }
};

export const deleteAssessmentImage = async (imagePath) => {
  try {
    await deleteFile(imagePath);
  } catch (error) {
    console.error("Error deleting assessment image:", error);
    throw error;
  }
};

export const deleteSubmission = async (submissionId) => {
  try {
    const submissionRef = doc(db, "submissions", submissionId);
    await deleteDoc(submissionRef);
    return true;
  } catch (error) {
    console.error("Error deleting submission:", error);
    throw error;
  }
};

// Add this new function for submitting tutorials
export const submitTutorial = async (submissionId, submissionData) => {
  try {
    const submissionRef = doc(db, "submissions", submissionId);
    await updateDoc(submissionRef, {
      ...submissionData,
      type: "tutorial",
      status: "completed",
      completedAt: new Date(),
    });

    return {
      success: true,
      submissionId,
      completedAt: new Date(),
    };
  } catch (error) {
    console.error("Error submitting tutorial:", error);
    throw error;
  }
};
