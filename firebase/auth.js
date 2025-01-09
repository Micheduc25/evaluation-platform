import { auth } from "./config";
import { setCookie } from "cookies-next";

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Set role cookie after successful login
    setCookie("role", user.role, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });

    return user;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    // Clear role cookie on logout
    setCookie("role", "", {
      maxAge: -1,
      path: "/",
    });
  } catch (error) {
    throw error;
  }
};
