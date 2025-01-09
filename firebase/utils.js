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
    const docRef = await addDoc(collection(db, "assessments"), {
      ...assessmentData,
      createdAt: new Date(),
    });
    return docRef.id;
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
    await updateDoc(docRef, {
      ...assessmentData,
      updatedAt: new Date(),
    });
    return assessmentId;
  } catch (error) {
    console.error("Error updating assessment:", error);
    throw error;
  }
};

// Submission helpers

export const submitAssessment = async (submissionId, submissionData) => {
  try {
    const submissionRef = doc(db, "submissions", submissionId);
    const assessmentRef = doc(db, "assessments", submissionData.assessmentId);

    // Calculate score for multiple choice questions
    const assessment = await getDoc(assessmentRef);
    const assessmentData = assessment.data();

    console.log("Assessment Data:=======>", assessmentData);

    console.log("Submission Data:=======>", submissionData);

    let score = 0;
    let pendingGrading = false;

    submissionData.answers.forEach((answer) => {
      const question = assessmentData.questions.find(
        (q) => q.id === answer.questionId
      );

      console.log("Question:=======>", question);
      if (question) {
        if (question.type === "multiple_choice") {
          if (question.correctAnswer === answer.selectedAnswer.value) {
            score += question.points;
          }
        } else if (question.type === "open_answer") {
          pendingGrading = true;
        }
      }
    });

    // Update submission with score and status
    await updateDoc(submissionRef, {
      ...submissionData,
      score,
      pendingGrading,
      status: pendingGrading ? "pending_review" : "completed",
      completedAt: new Date(),
    });

    // Update assessment submission count
    await updateDoc(assessmentRef, {
      submissionCount: increment(1),
    });

    return { score, pendingGrading };
  } catch (error) {
    console.error("Error submitting assessment:", error);
    throw error;
  }
};

export const gradeOpenAnswerQuestion = async (
  submissionId,
  questionId,
  points,
  feedback
) => {
  try {
    const submissionRef = doc(db, "submissions", submissionId);
    const submissionSnap = await getDoc(submissionRef);
    const submission = submissionSnap.data();

    // Update the answer with grading
    const updatedAnswers = submission.answers.map((answer) => {
      if (answer.questionId === questionId) {
        return { ...answer, points, feedback, graded: true };
      }
      return answer;
    });

    // Calculate new total score
    const score = updatedAnswers.reduce(
      (total, answer) => total + (answer.points || 0),
      0
    );

    // Check if all open answers are graded
    const allGraded = updatedAnswers.every(
      (answer) => answer.type === "multiple_choice" || answer.graded
    );

    await updateDoc(submissionRef, {
      answers: updatedAnswers,
      score,
      status: allGraded ? "completed" : "pending_review",
      pendingGrading: !allGraded,
      gradedAt: new Date(),
    });

    return { score, status: allGraded ? "completed" : "pending_review" };
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
    const assessment = await getAssessment(assessmentId);
    if (!assessment) throw new Error("Assessment not found");

    const now = new Date();
    if (now > assessment.endDate.toDate()) {
      throw new Error("Assessment has expired");
    }

    // check if submission already exists
    const submissionQuery = query(
      collection(db, "submissions"),
      where("assessmentId", "==", assessmentId),
      where("studentId", "==", studentId),
      limit(1)
    );

    const submissionSnapshot = await getDocs(submissionQuery);
    console.log("Submission Query:=======>", submissionSnapshot);
    if (!submissionSnapshot.empty) {
      throw new Error("You have already started this assessment");
    }

    // Create a submission document with initial state
    const submission = await addDoc(collection(db, "submissions"), {
      assessmentId,
      studentId,
      startedAt: now,
      status: "in_progress",
      answers: [],
      score: 0,
      isGraded: false,
    });

    return submission.id;
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

      console.log("Submission:=======>", submissions);
    }

    return submissions;
  } catch (error) {
    console.error("Error getting pending submissions:", error);
    throw error;
  }
};
