"use client";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  getClassroomDetails,
  removeStudentFromClassroom,
  getClassroomStudents,
} from "@/firebase/utils";
import {
  UserGroupIcon,
  TrashIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function ClassroomDetailsPage({ params }) {
  const user = useSelector((state) => state.auth.user);
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);

  useEffect(() => {
    loadClassroomData();
  }, [params.id]);

  useEffect(() => {
    handleSearch();
  }, [searchQuery, students]);

  const loadClassroomData = async () => {
    try {
      setIsLoading(true);
      const [classroomData, studentsData] = await Promise.all([
        getClassroomDetails(params.id),
        getClassroomStudents(params.id),
      ]);
      setClassroom(classroomData);
      setStudents(studentsData);
    } catch (error) {
      toast.error("Failed to load classroom data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setIsSearching(true);
    try {
      const query = searchQuery.toLowerCase().trim();
      const results = students.filter((student) => {
        return (
          student.displayName?.toLowerCase().includes(query) ||
          student.email?.toLowerCase().includes(query)
        );
      });
      setFilteredStudents(results);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Error while searching students");
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      await removeStudentFromClassroom(params.id, studentId);
      toast.success("Student removed successfully");
      loadClassroomData();
    } catch (error) {
      toast.error("Failed to remove student");
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Classroom Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {classroom?.name}
            </h1>
            <p className="text-gray-600 mt-2">{classroom?.description}</p>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 text-gray-500">
                <UserGroupIcon className="h-5 w-5" />
                <span>{classroom?.studentCount} students</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Join Code: </span>
                <span className="font-mono text-blue-600 font-semibold">
                  {classroom?.joinCode}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Student Management Section */}
      <div className="bg-white rounded-lg shadow-sm">
        {/* Search and Actions Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {selectedStudents.length > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {selectedStudents.length} selected
                </span>
                <button
                  onClick={() => setSelectedStudents([])}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Students List */}
        <div className="divide-y divide-gray-200">
          {isSearching ? (
            <div className="p-8 text-center text-gray-500">Searching...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery
                ? "No students found matching your search."
                : "No students in this classroom."}
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div
                key={student.id}
                className={`p-4 flex items-center justify-between hover:bg-gray-50 ${
                  selectedStudents.includes(student.id)
                    ? "bg-blue-50"
                    : "bg-white"
                }`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => toggleStudentSelection(student.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {student.displayName || "Unnamed Student"}
                    </h3>
                    <p className="text-sm text-gray-500">{student.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      (window.location.href = `mailto:${student.email}`)
                    }
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <EnvelopeIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleRemoveStudent(student.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
