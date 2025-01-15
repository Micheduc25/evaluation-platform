"use client";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from 'next/navigation';
import {
  getTeacherClassrooms,
  createClassroom,
  deleteClassroom,
  updateClassroom,
} from "@/firebase/utils";
import {
  PlusIcon,
  UserGroupIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";

export default function ClassroomsPage() {
  const user = useSelector((state) => state.auth.user);
  const router = useRouter();
  const [classrooms, setClassrooms] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadClassrooms();
  }, [user]);

  const loadClassrooms = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await getTeacherClassrooms(user.uid);
      setClassrooms(data);
    } catch (error) {
      toast.error("Failed to load classrooms");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClassroom) {
        await updateClassroom(editingClassroom.id, formData);
        toast.success("Classroom updated successfully");
      } else {
        await createClassroom(user.uid, formData);
        toast.success("Classroom created successfully");
      }
      setIsModalOpen(false);
      setEditingClassroom(null);
      setFormData({ name: "", description: "" });
      loadClassrooms();
    } catch (error) {
      toast.error("Error saving classroom");
    }
  };

  const handleDelete = async (classroomId) => {
    setIsDeleting(true);
    try {
      await deleteClassroom(classroomId);
      toast.success("Classroom deleted successfully");
      loadClassrooms();
    } catch (error) {
      toast.error("Error deleting classroom");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Classrooms</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors duration-200"
        >
          <PlusIcon className="h-5 w-5" />
          Create Classroom
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : classrooms.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No Classrooms Yet
          </h3>
          <p className="mt-2 text-gray-500">
            Create your first classroom to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map((classroom) => (
            <div
              key={classroom.id}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200 group"
              onClick={() => router.push(`/teacher/classrooms/${classroom.id}`)}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {classroom.name}
                  </h2>
                  <p className="text-gray-600">{classroom.description}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <UserGroupIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {classroom.studentCount} students
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Code: </span>
                      <span className="font-mono text-blue-600">
                        {classroom.joinCode}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => {
                      setEditingClassroom(classroom);
                      setFormData({
                        name: classroom.name,
                        description: classroom.description,
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(classroom.id)}
                    disabled={isDeleting}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors duration-200"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex justify-end text-gray-400 group-hover:text-blue-500">
                <span className="text-sm">Click to manage students →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">
              {editingClassroom ? "Edit Classroom" : "Create New Classroom"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Classroom Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  rows="3"
                />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingClassroom(null);
                    setFormData({ name: "", description: "" });
                  }}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                >
                  {editingClassroom ? "Save Changes" : "Create Classroom"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
