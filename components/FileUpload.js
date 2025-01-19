import { useState, useRef } from "react";
import { uploadFile, isValidFileType } from "@/firebase/storage";
import Image from "next/image";
import { XCircleIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";

const FileUpload = ({
  onUploadComplete,
  onError,
  allowedTypes = ["image/jpeg", "image/png", "image/gif"],
  maxSize = 5242880, // 5MB
  path = "uploads",
  multiple = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const validateFile = (file) => {
    if (!isValidFileType(file, allowedTypes)) {
      throw new Error("Invalid file type");
    }
    if (file.size > maxSize) {
      throw new Error("File size too large");
    }
    return true;
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer?.files || e.target.files);
    if (!files.length) return;

    try {
      setUploading(true);

      for (const file of files) {
        validateFile(file);

        // Show preview for images
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreview(reader.result);
          };
          reader.readAsDataURL(file);
        }

        const result = await uploadFile(file, path, setProgress);
        if (onUploadComplete) onUploadComplete(result);
      }
    } catch (error) {
      if (onError) onError(error.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const removePreview = () => {
    setPreview(null);
    fileInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center bg-white
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}
          ${uploading ? "opacity-50" : ""}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleDrop}
          accept={allowedTypes.join(",")}
          multiple={multiple}
          disabled={uploading}
        />

        {preview ? (
          <div className="relative inline-block">
            <Image
              src={preview}
              alt="Preview"
              width={200}
              height={200}
              className="rounded-lg object-cover"
            />
            <button
              onClick={removePreview}
              className="absolute -top-2 -right-2 bg-white rounded-full shadow-md"
            >
              <XCircleIcon className="w-6 h-6 text-gray-500 hover:text-red-500" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="text-gray-600">
              Drag and drop your files here or
              <button
                onClick={(e) => {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }}
                className="text-blue-500 hover:text-blue-600 mx-1"
                disabled={uploading}
              >
                browse
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Supported formats: {allowedTypes.join(", ")}
            </p>
            <p className="text-sm text-gray-500">
              Max file size: {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
            <div className="w-full max-w-xs mx-auto">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div className="text-xs font-semibold text-blue-600 w-full text-center">
                    {Math.round(progress)}%
                  </div>
                </div>
                <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-200">
                  <div
                    style={{ width: `${progress}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
