"use client";
import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { createAssessment, getTeacherClassrooms } from "@/firebase/utils";
import { toast } from "react-hot-toast";
import { validateImportJson, parseJsonString } from "@/services/jsonImportService";
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

export default function JsonImportModal({ onClose, onAssessmentCreated }) {
  const user = useSelector((state) => state.auth.user);
  const [activeTab, setActiveTab] = useState("file"); // "file" or "paste"
  const [jsonContent, setJsonContent] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [endDate, setEndDate] = useState("");
  const fileInputRef = useRef(null);

  // Load classrooms on mount
  useState(() => {
    const loadClassrooms = async () => {
      if (!user) return;
      const data = await getTeacherClassrooms(user.uid);
      setClassrooms(data);
      if (data.length > 0) {
        setSelectedClassroomId(data[0].id);
      }
    };
    loadClassrooms();
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      toast.error("Please upload a valid JSON file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setJsonContent(content);
      validateContent(content);
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (e) => {
    const content = e.target.value;
    setJsonContent(content);
    // Debounce validation could be added here, but for now validate on change is fine for reasonable sizes
    try {
        if (content.trim()) {
             validateContent(content);
        } else {
            setParsedData(null);
            setValidationResult(null);
        }
    } catch (err) {
        // Ignore parse errors while typing
    }
  };

  const validateContent = (content) => {
    try {
      const parsed = parseJsonString(content);
      const result = validateImportJson(parsed);
      setValidationResult(result);
      if (result.isValid) {
        setParsedData(result.data);
        // Pre-fill end date if present in JSON and valid
        if (result.data.endDate && !isNaN(new Date(result.data.endDate).getTime())) {
             // Format specifically for datetime-local input: YYYY-MM-DDThh:mm
             try {
                const date = new Date(result.data.endDate);
                const isoString = date.toISOString().slice(0, 16);
                setEndDate(isoString);
             } catch (e) {
                 console.log("Date parsing error", e);
             }
        }
      } else {
        setParsedData(null);
      }
    } catch (e) {
      setValidationResult({ isValid: false, errors: [e.message] });
      setParsedData(null);
    }
  };

  const handleCreate = async () => {
    if (!parsedData || !selectedClassroomId) return;
    
    // Additional validation for assessment type
    if (parsedData.type === 'assessment' && !endDate && !parsedData.endDate) {
        toast.error("End date is required for assessments");
        return;
    }

    setLoading(true);
    try {
      const assessmentData = {
        title: parsedData.title,
        description: parsedData.description || "",
        type: parsedData.type || "assessment",
        questions: parsedData.questions,
        classroomId: selectedClassroomId,
        createdBy: user.uid,
        status: "active",
        submissionCount: 0,
        totalPoints: parsedData.totalPoints || parsedData.questions.reduce((sum, q) => sum + (q.points || q.maxPoints || 0), 0),
        duration: parsedData.duration || 60,
        // Use selected end date, or fall back to JSON provided, or default for tutorial
        endDate: parsedData.type === 'tutorial' 
            ? new Date() 
            : new Date(endDate || parsedData.endDate)
      };

      const assessmentId = await createAssessment(assessmentData);
      toast.success(`${parsedData.type === 'tutorial' ? 'Tutorial' : 'Assessment'} imported successfully`);
      
      onAssessmentCreated({
        id: assessmentId,
        ...assessmentData,
        endDate: assessmentData.endDate ? assessmentData.endDate.toISOString() : null,
      });
      onClose();
    } catch (error) {
      console.error("Error creating assessment from import:", error);
      toast.error("Failed to import: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Import Assessment/Tutorial</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("file")}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "file"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Upload File
                </button>
                <button
                  onClick={() => setActiveTab("paste")}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "paste"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Paste JSON
                </button>
              </nav>
            </div>

            <div className="mt-4">
              {activeTab === "file" ? (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Click to upload JSON file
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />
                  {/* Show filename if uploaded? No need, we show preview immediately */}
                </div>
              ) : (
                <div>
                  <textarea
                    rows={10}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md font-mono"
                    placeholder='Paste your JSON here...'
                    value={jsonContent}
                    onChange={handlePasteChange}
                  />
                </div>
              )}
            </div>

            {/* Validation & Preview Section */}
            {validationResult && (
              <div className={`mt-4 p-4 rounded-md ${validationResult.isValid ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {validationResult.isValid ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-400" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${validationResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
                      {validationResult.isValid ? 'Valid JSON' : 'Validation Errors'}
                    </h3>
                    <div className={`mt-2 text-sm ${validationResult.isValid ? 'text-green-700' : 'text-red-700'}`}>
                      {validationResult.isValid ? (
                        <div>
                          <p><span className="font-semibold">Title:</span> {parsedData.title}</p>
                          <p><span className="font-semibold">Type:</span> {parsedData.type}</p>
                          <p><span className="font-semibold">Questions:</span> {parsedData.questions.length}</p>
                          <p><span className="font-semibold">Total Points:</span> {parsedData.totalPoints || parsedData.questions.reduce((a, b) => a + (b.points || b.maxPoints || 0), 0)}</p>
                        </div>
                      ) : (
                        <ul className="list-disc list-inside space-y-1">
                          {validationResult.errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Configuration Section (only if valid) */}
            {parsedData && (
              <div className="mt-6 space-y-4 border-t pt-4">
                  <h4 className="font-medium text-gray-900">Import Settings</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assign to Classroom</label>
                    <select
                      value={selectedClassroomId}
                      onChange={(e) => setSelectedClassroomId(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      {classrooms.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {parsedData.type === 'assessment' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Date</label>
                      <input
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                  )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              disabled={!parsedData || loading || !selectedClassroomId}
              onClick={handleCreate}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Importing...' : 'Import'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
