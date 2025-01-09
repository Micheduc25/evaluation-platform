"use client";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "@/store/slices/authSlice";
import { updateUserProfile } from "@/firebase/utils";

export default function ProfilePage() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const updatedUser = await updateUserProfile(user.uid, formData);
      dispatch(setUser(updatedUser));
      setMessage("Profile updated successfully!");
    } catch (error) {
      setMessage("Error updating profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div>Please login to view your profile</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Display Name</label>
          <input
            type="text"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            className="w-full p-2 border rounded text-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            disabled
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? "Updating..." : "Update Profile"}
        </button>
        {message && (
          <p
            className={`mt-4 ${
              message.includes("Error") ? "text-red-500" : "text-green-500"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
