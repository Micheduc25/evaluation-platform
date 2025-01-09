"use client";
import { useState } from "react";
import {
  ClipboardDocumentIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

export default function EvaluationPage() {
  const [activeTab, setActiveTab] = useState("available");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Evaluations
      </h1>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        {[
          { id: "available", label: "Available", icon: ClipboardDocumentIcon },
          { id: "ongoing", label: "Ongoing", icon: DocumentTextIcon },
          { id: "completed", label: "Completed", icon: DocumentCheckIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-2 border-b-2 ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-5 w-5 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Evaluation List */}
      <div className="grid gap-4">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Sample Evaluation {item}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Duration: 60 minutes • Questions: 25 • Total Points: 100
                </p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Start Evaluation
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
