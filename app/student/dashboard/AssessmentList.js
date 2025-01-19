"use client";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { getStudentClassrooms } from "@/firebase/utils";
import AssessmentCard from "./AssessmentCard";

export default function AssessmentList({ assessments, onStartAssessment }) {
  const user = useSelector((state) => state.auth.user);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState("all");
  const [filteredAssessments, setFilteredAssessments] = useState(assessments);

  useEffect(() => {
    loadClassrooms();
  }, [user]);

  useEffect(() => {
    filterAssessments();
  }, [selectedClassroom, assessments]);

  const loadClassrooms = async () => {
    if (!user) return;
    const data = await getStudentClassrooms(user.uid);
    setClassrooms(data);
  };

  const filterAssessments = () => {
    if (selectedClassroom === "all") {
      setFilteredAssessments(assessments);
    } else {
      setFilteredAssessments(
        assessments.filter(
          (assessment) => assessment.classroomId === selectedClassroom
        )
      );
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Available Assessments</h2>
        <select
          value={selectedClassroom}
          onChange={(e) => setSelectedClassroom(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Classrooms</option>
          {classrooms.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>
              {classroom.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssessments.map((assessment) => (
          <AssessmentCard
            key={assessment.id}
            assessment={assessment}
            onStart={onStartAssessment}
            classroom={classrooms.find((c) => c.id === assessment.classroomId)}
          />
        ))}
        {filteredAssessments.length === 0 && (
          <div className="col-span-full text-center py-8 bg-white rounded-lg">
            <p className="text-gray-500">
              No assessments available for this classroom.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
