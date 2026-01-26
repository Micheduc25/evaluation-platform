"use client";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { getClassroomDetails } from "@/firebase/utils";
import { getClassroomMaterials } from "@/firebase/materialsUtils";
import {
  UserGroupIcon,
  ArrowLeftIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";
import MaterialsList from "@/components/classroom/MaterialsList";

export default function StudentClassroomDetailsPage({ params }) {
  const user = useSelector((state) => state.auth.user);
  const router = useRouter();
  const [classroom, setClassroom] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClassroomData();
  }, [params.id]);

  const loadClassroomData = async () => {
    try {
      setIsLoading(true);
      const [classroomData, materialsData] = await Promise.all([
        getClassroomDetails(params.id),
        getClassroomMaterials(params.id),
      ]);
      setClassroom(classroomData);
      setMaterials(materialsData);
    } catch (error) {
      console.error("Error loading classroom:", error);
      toast.error("Failed to load classroom data");
    } finally {
      setIsLoading(false);
    }
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
      {/* Back Button */}
      <button
        onClick={() => router.push("/student/classrooms")}
        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 transition-colors"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Back to My Classrooms
      </button>

      {/* Classroom Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{classroom?.name}</h1>
        {classroom?.description && (
          <p className="text-gray-600 mt-2">{classroom.description}</p>
        )}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2 text-gray-500">
            <UserGroupIcon className="h-5 w-5" />
            <span>{classroom?.studentCount} students</span>
          </div>
        </div>
      </div>

      {/* Materials Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <DocumentIcon className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900">
            Course Materials
          </h2>
          <span className="text-sm text-gray-500">
            ({materials.length} {materials.length === 1 ? "file" : "files"})
          </span>
        </div>

        <MaterialsList
          materials={materials}
          isLoading={false}
          canDelete={false}
        />
      </div>
    </div>
  );
}
