"use client";
import { useState } from "react";
import {
  DocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  PresentationChartBarIcon,
  TableCellsIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { formatFileSize, getFileTypeIcon } from "@/firebase/materialsUtils";
import { toast } from "react-hot-toast";

/**
 * Get the appropriate icon component based on file type
 */
const FileTypeIcon = ({ fileType, className = "h-8 w-8" }) => {
  const iconType = getFileTypeIcon(fileType);
  const iconClass = `${className} text-gray-500`;

  switch (iconType) {
    case "pdf":
      return <DocumentTextIcon className={`${className} text-red-500`} />;
    case "word":
      return <DocumentTextIcon className={`${className} text-blue-600`} />;
    case "powerpoint":
      return (
        <PresentationChartBarIcon className={`${className} text-orange-500`} />
      );
    case "excel":
      return <TableCellsIcon className={`${className} text-green-600`} />;
    case "image":
      return <PhotoIcon className={`${className} text-purple-500`} />;
    default:
      return <DocumentIcon className={iconClass} />;
  }
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  if (!date) return "";
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Single material item component
 */
const MaterialItem = ({ material, canDelete, onDelete, isDeleting }) => {
  const handleDownload = () => {
    window.open(material.downloadUrl, "_blank");
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <FileTypeIcon fileType={material.fileType} />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">
            {material.title}
          </h4>
          {material.description && (
            <p className="text-sm text-gray-500 truncate">
              {material.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span>{formatFileSize(material.fileSize)}</span>
            <span>•</span>
            <span>{formatDate(material.uploadedAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <button
          onClick={handleDownload}
          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          title="Download"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
        </button>
        {canDelete && (
          <button
            onClick={() => onDelete(material)}
            disabled={isDeleting}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Delete"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * List component for displaying classroom materials
 */
export default function MaterialsList({
  materials = [],
  isLoading = false,
  canDelete = false,
  onDelete,
}) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (material) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${material.title}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(material.id);
    try {
      await onDelete(material);
      toast.success("Material deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete material");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!materials.length) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No Materials Yet
        </h3>
        <p className="mt-2 text-gray-500">
          {canDelete
            ? "Upload your first material to share with students."
            : "No materials have been shared for this class yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {materials.map((material) => (
        <MaterialItem
          key={material.id}
          material={material}
          canDelete={canDelete}
          onDelete={handleDelete}
          isDeleting={deletingId === material.id}
        />
      ))}
    </div>
  );
}
