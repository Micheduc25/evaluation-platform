"use client";
import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import {
  uploadClassroomMaterial,
  createClassroomMaterialDoc,
  ALLOWED_MATERIAL_TYPES,
  MAX_MATERIAL_SIZE,
} from "@/firebase/materialsUtils";
import { toast } from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/24/outline";

/**
 * Form component for teachers to upload classroom materials
 */
export default function MaterialUploadForm({
  classroomId,
  teacherId,
  onUploadComplete,
  onCancel,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelected = (result) => {
    setSelectedFile(result);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsUploading(true);
    try {
      const material = await uploadClassroomMaterial(
        classroomId,
        selectedFile,
        {
          title: title.trim() || selectedFile.name,
          description: description.trim(),
          uploadedBy: teacherId,
        },
        setUploadProgress
      );

      toast.success("Material uploaded successfully!");
      setTitle("");
      setDescription("");
      setSelectedFile(null);
      if (onUploadComplete) onUploadComplete(material);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save material");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Upload New Material
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter material title (optional, defaults to filename)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a brief description (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File
          </label>
          <FileUpload
            onFileSelect={handleFileSelected}
            onError={(error) => toast.error(error)}
            allowedTypes={ALLOWED_MATERIAL_TYPES}
            maxSize={MAX_MATERIAL_SIZE}
            path={`classrooms/${classroomId}/materials`}
            autoUpload={false}
          />
        </div>

        {isUploading && (
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isUploading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isUploading || !selectedFile}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? "Uploading..." : "Upload Material"}
          </button>
        </div>
      </form>
    </div>
  );
}
