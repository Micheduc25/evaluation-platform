"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAssessment } from "@/firebase/utils";
import EditAssessmentForm from "./EditAssessmentForm";

export default function EditAssessmentPage() {
  const { id } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const data = await getAssessment(id);
        if (!data) {
          throw new Error("Assessment not found");
        }
        setAssessment(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [id]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      <h1>Edit Assessment</h1>
      <EditAssessmentForm assessment={assessment} />
    </div>
  );
}
