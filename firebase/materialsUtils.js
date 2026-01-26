"use client";
import { db } from "./client";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { uploadFile, deleteFile } from "./storage";

/**
 * Allowed file types for classroom materials
 */
export const ALLOWED_MATERIAL_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "text/plain",
];

/**
 * Maximum file size for materials (10MB)
 */
export const MAX_MATERIAL_SIZE = 10 * 1024 * 1024;

/**
 * Upload a material to a classroom
 * @param {string} classroomId - The classroom ID
 * @param {File} file - The file to upload
 * @param {Object} metadata - Additional metadata (title, description)
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} The created material document
 */
/**
 * Create a material document in Firestore (after file upload)
 * @param {string} classroomId - The classroom ID
 * @param {Object} fileData - The uploaded file data (url, path, metadata)
 * @param {Object} metadata - Additional metadata (title, description)
 * @returns {Promise<Object>} The created material document
 */
export const createClassroomMaterialDoc = async (
  classroomId,
  fileData,
  metadata
) => {
  try {
    const materialData = {
      classroomId,
      title: metadata.title || fileData.metadata?.customMetadata?.originalName || fileData.metadata?.name || "Untitled",
      description: metadata.description || "",
      fileName: fileData.metadata?.customMetadata?.originalName || fileData.metadata?.name || "file",
      fileType: fileData.metadata?.contentType || "application/octet-stream",
      fileSize: fileData.metadata?.size || 0,
      downloadUrl: fileData.url,
      storagePath: fileData.path,
      uploadedAt: new Date(),
      uploadedBy: metadata.uploadedBy,
    };

    const materialRef = await addDoc(
      collection(db, "classroom_materials"),
      materialData
    );

    return {
      id: materialRef.id,
      ...materialData,
    };
  } catch (error) {
    console.error("Error creating classroom material doc:", error);
    throw error;
  }
};

/**
 * Upload a material to a classroom
 * @param {string} classroomId - The classroom ID
 * @param {File} file - The file to upload
 * @param {Object} metadata - Additional metadata (title, description)
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} The created material document
 */
export const uploadClassroomMaterial = async (
  classroomId,
  file,
  metadata,
  onProgress
) => {
  try {
    // Upload file to Firebase Storage
    const storagePath = `classrooms/${classroomId}/materials`;
    const uploadResult = await uploadFile(file, storagePath, onProgress);

    // Create material document in Firestore
    return await createClassroomMaterialDoc(
      classroomId,
      uploadResult,
      metadata
    );
  } catch (error) {
    console.error("Error uploading classroom material:", error);
    throw error;
  }
};

/**
 * Get all materials for a classroom
 * @param {string} classroomId - The classroom ID
 * @returns {Promise<Array>} Array of material documents
 */
export const getClassroomMaterials = async (classroomId) => {
  try {
    const materialsQuery = query(
      collection(db, "classroom_materials"),
      where("classroomId", "==", classroomId),
      orderBy("uploadedAt", "desc")
    );

    const materialsSnap = await getDocs(materialsQuery);
    return materialsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting classroom materials:", error);
    throw error;
  }
};

/**
 * Delete a classroom material
 * @param {string} materialId - The material document ID
 * @param {string} storagePath - The storage path of the file
 * @returns {Promise<void>}
 */
export const deleteClassroomMaterial = async (materialId, storagePath) => {
  try {
    // Delete file from Storage
    if (storagePath) {
      await deleteFile(storagePath);
    }

    // Delete document from Firestore
    const materialRef = doc(db, "classroom_materials", materialId);
    await deleteDoc(materialRef);
  } catch (error) {
    console.error("Error deleting classroom material:", error);
    throw error;
  }
};

/**
 * Get file type icon name based on mime type
 * @param {string} fileType - The file's mime type
 * @returns {string} Icon identifier
 */
export const getFileTypeIcon = (fileType) => {
  if (fileType?.startsWith("image/")) return "image";
  if (fileType?.includes("pdf")) return "pdf";
  if (fileType?.includes("word")) return "word";
  if (fileType?.includes("powerpoint") || fileType?.includes("presentation"))
    return "powerpoint";
  if (fileType?.includes("excel") || fileType?.includes("spreadsheet"))
    return "excel";
  if (fileType?.includes("text/plain")) return "text";
  return "file";
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
