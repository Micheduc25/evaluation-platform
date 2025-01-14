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
    await updateDoc(userRef, {
      ...userData,
      updatedAt: new Date(),
    });

    const updatedUser = await getUserDocument(uid);
    return updatedUser;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// Assessment helpers
export const createAssessment = async (assessmentData) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const docRef = doc(collection(db, "assessments"));

      // Ensure dates are proper Date objects for Firestore
      const dataToStore = {
        ...assessmentData,
        createdAt: new Date(),
        endDate:
          assessmentData.endDate instanceof Date
            ? assessmentData.endDate
            : new Date(assessmentData.endDate),
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
        console.log("Answer questionId:", answer);
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

    return {
      totalAssessments: assessmentsSnap.size,
      activeStudents: uniqueStudents.size,
      pendingReviews: submissionsSnap.docs.filter((doc) => !doc.data().isGraded)
        .length,
    };
  } catch (error) {
    console.error("Error getting teacher stats:", error);
    throw error;
  }
};

export const getAvailableAssessments = async (studentId) => {
  try {
    const now = new Date();
    const assessmentsRef = collection(db, "assessments");
    const q = query(
      assessmentsRef,
      where("endDate", ">=", now),
      orderBy("endDate", "asc")
    );

    const querySnapshot = await getDocs(q);
    const assessments = [];

    for (const doc of querySnapshot.docs) {
      const assessment = { id: doc.id, ...doc.data() };
      // Check if student has already submitted this assessment
      const submissionQuery = query(
        collection(db, "submissions"),
        where("assessmentId", "==", doc.id),
        where("studentId", "==", studentId),
        limit(1)
      );
      const submissionSnapshot = await getDocs(submissionQuery);

      if (submissionSnapshot.empty) {
        assessments.push(assessment);
      }
    }

    return assessments;
  } catch (error) {
    console.error("Error getting available assessments:", error);
    throw error;
  }
};

export const startAssessment = async (assessmentId, studentId) => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Check for existing in-progress submission

      const submissionQuery = query(
        collection(db, "submissions"),
        where("assessmentId", "==", assessmentId),
        where("studentId", "==", studentId),
        where("status", "==", "in_progress"),
        limit(1)
      );

      const submissionSnapshot = await getDocs(submissionQuery);
      if (!submissionSnapshot.empty) {
        return submissionSnapshot.docs[0].id;
      }

      // Verify assessment exists and hasn't expired
      const assessmentRef = doc(db, "assessments", assessmentId);
      const assessmentDoc = await transaction.get(assessmentRef);

      if (!assessmentDoc.exists()) {
        throw new Error("Assessment not found");
      }

      const now = new Date();
      if (now > assessmentDoc.data().endDate.toDate()) {
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
    const submissionsQuery = query(
      collection(db, "submissions"),
      where("studentId", "==", studentId)
    );

    const submissionsSnap = await getDocs(submissionsQuery);
    const submissions = submissionsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate statistics
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
    const now = new Date();
    const assessmentsQuery = query(
      collection(db, "assessments"),
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
    const submissionsQuery = query(
      collection(db, "submissions"),
      where("studentId", "==", studentId),
      where("status", "==", "completed"),
      orderBy("submittedAt", "desc"),
      limit(5)
    );

    const submissionsSnap = await getDocs(submissionsQuery);
    const submissions = [];

    for (const doc of submissionsSnap.docs) {
      const submission = doc.data();
      const assessment = await getAssessment(submission.assessmentId);
      submissions.push({
        id: doc.id,
        title: assessment.title,
        score: submission.score,
        totalPoints: assessment.totalPoints,
        submittedAt: submission.submittedAt,
      });
    }

    return submissions;
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
      submissions.push({
        id: doc.id,
        title: assessment.title,
        score: submission.score,
        totalPoints: assessment.totalPoints,
        submittedAt: submission.submittedAt,
        status: "pending_review",
      });
    }

    return submissions;
  } catch (error) {
    console.error("Error getting pending results:", error);
    throw error;
  }
};
