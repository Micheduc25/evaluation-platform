import { storage, auth } from "./client";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

export const uploadFile = async (file, path, onProgress) => {
  if (!file) return null;

  const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);

  // Add custom metadata
  const metadata = {
    customMetadata: {
      uploadedBy: auth.currentUser?.uid || "anonymous",
      contentType: file.type,
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  };

  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({
          url: downloadURL,
          path: uploadTask.snapshot.ref.fullPath,
          metadata: uploadTask.snapshot.metadata,
        });
      }
    );
  });
};

export const deleteFile = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    throw new Error(`Error deleting file: ${error.message}`);
  }
};

export const isValidFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.type);
};

export const getFileExtension = (filename) => {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
};
