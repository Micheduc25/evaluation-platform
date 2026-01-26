/**
 * @jest-environment jsdom
 */

import {
  uploadClassroomMaterial,
  getClassroomMaterials,
  deleteClassroomMaterial,
  getFileTypeIcon,
  formatFileSize,
  ALLOWED_MATERIAL_TYPES,
  MAX_MATERIAL_SIZE,
} from "@/firebase/materialsUtils";

// Mock Firebase modules
jest.mock("@/firebase/client", () => ({
  db: {},
}));

jest.mock("@/firebase/storage", () => ({
  uploadFile: jest.fn().mockResolvedValue({
    url: "https://storage.example.com/test-file.pdf",
    path: "classrooms/classroom1/materials/test-file.pdf",
    metadata: { size: 1024 },
  }),
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: "material1" }),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  doc: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({
    docs: [
      {
        id: "material1",
        data: () => ({
          classroomId: "classroom1",
          title: "Test Material",
          description: "Test description",
          fileName: "test.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
          downloadUrl: "https://storage.example.com/test.pdf",
          storagePath: "classrooms/classroom1/materials/test.pdf",
          uploadedAt: new Date(),
        }),
      },
    ],
  }),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
}));

describe("Classroom Materials Utilities", () => {
  describe("Constants", () => {
    it("should have correct allowed material types", () => {
      expect(ALLOWED_MATERIAL_TYPES).toContain("application/pdf");
      expect(ALLOWED_MATERIAL_TYPES).toContain("image/jpeg");
      expect(ALLOWED_MATERIAL_TYPES).toContain("image/png");
    });

    it("should have max material size of 10MB", () => {
      expect(MAX_MATERIAL_SIZE).toBe(10 * 1024 * 1024);
    });
  });

  describe("getFileTypeIcon", () => {
    it("should return pdf for PDF files", () => {
      expect(getFileTypeIcon("application/pdf")).toBe("pdf");
    });

    it("should return word for Word documents", () => {
      expect(getFileTypeIcon("application/msword")).toBe("word");
      expect(
        getFileTypeIcon(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      ).toBe("word");
    });

    it("should return powerpoint for PowerPoint files", () => {
      expect(getFileTypeIcon("application/vnd.ms-powerpoint")).toBe(
        "powerpoint"
      );
      expect(
        getFileTypeIcon(
          "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
      ).toBe("powerpoint");
    });

    it("should return excel for Excel files", () => {
      expect(getFileTypeIcon("application/vnd.ms-excel")).toBe("excel");
      expect(
        getFileTypeIcon(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
      ).toBe("excel");
    });

    it("should return image for image files", () => {
      expect(getFileTypeIcon("image/jpeg")).toBe("image");
      expect(getFileTypeIcon("image/png")).toBe("image");
      expect(getFileTypeIcon("image/gif")).toBe("image");
    });

    it("should return file for unknown types", () => {
      expect(getFileTypeIcon("application/unknown")).toBe("file");
      expect(getFileTypeIcon(null)).toBe("file");
      expect(getFileTypeIcon(undefined)).toBe("file");
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("should format kilobytes correctly", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(2048)).toBe("2 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("should format megabytes correctly", () => {
      expect(formatFileSize(1048576)).toBe("1 MB");
      expect(formatFileSize(5242880)).toBe("5 MB");
    });

    it("should handle null and undefined", () => {
      expect(formatFileSize(null)).toBe("0 B");
      expect(formatFileSize(undefined)).toBe("0 B");
    });
  });

  describe("getClassroomMaterials", () => {
    it("should return array of materials", async () => {
      const materials = await getClassroomMaterials("classroom1");

      expect(Array.isArray(materials)).toBe(true);
      expect(materials.length).toBeGreaterThan(0);
      expect(materials[0]).toHaveProperty("id");
      expect(materials[0]).toHaveProperty("title");
      expect(materials[0]).toHaveProperty("downloadUrl");
    });
  });
});
