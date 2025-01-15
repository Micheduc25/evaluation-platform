"use client";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { getStudentClassrooms, joinClassroomByCode } from "@/firebase/utils";
import { UserGroupIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

export default function StudentClassroomsPage() {
  const user = useSelector((state) => state.auth.user);
  const [classrooms, setClassrooms] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadClassrooms();
  }, [user]);

  const loadClassrooms = async () => {
    if (!user) return;
    const data = await getStudentClassrooms(user.uid);
    setClassrooms(data);
  };

  const handleJoinClassroom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError("Please enter a join code");
      return;
    }

    setError("");
    setIsJoining(true);

    try {
      await joinClassroomByCode(joinCode.trim().toUpperCase(), user.uid);
      toast.success("Successfully joined classroom!");
      setJoinCode("");
      loadClassrooms();
    } catch (error) {
      setError(error.message || "Failed to join classroom");
      toast.error("Failed to join classroom");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">My Classrooms</h1>

        {/* Join Classroom Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Join a New Classroom</h2>
          <form onSubmit={handleJoinClassroom} className="space-y-4">
            <div>
              <label
                htmlFor="joinCode"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Classroom Code
              </label>
              <div className="flex gap-4">
                <input
                  id="joinCode"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="flex-1 rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength="6"
                  required
                />
                <button
                  type="submit"
                  disabled={isJoining}
                  className="flex items-center gap-2 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50"
                >
                  {isJoining ? (
                    "Joining..."
                  ) : (
                    <>
                      Join
                      <ArrowRightIcon className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
          </form>
        </div>

        {/* Classrooms Grid */}
        <div className="grid gap-6">
          {classrooms.map((classroom) => (
            <div
              key={classroom.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {classroom.name}
                  </h2>
                  <p className="text-gray-600 mt-2">{classroom.description}</p>
                  <div className="flex items-center gap-2 mt-4 text-gray-500">
                    <UserGroupIcon className="h-5 w-5" />
                    <span>{classroom.studentCount} students</span>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  Joined {classroom.joinedAt?.toDate().toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}

          {!classrooms.length && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No Classrooms Yet
              </h3>
              <p className="mt-2 text-gray-500">
                Join your first classroom using a classroom code.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
