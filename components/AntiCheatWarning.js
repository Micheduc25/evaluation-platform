"use client";

import { XCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

/**
 * AntiCheatWarning Component
 * 
 * Displays a modal warning when anti-cheat violations are detected.
 * Shows the violation message and remaining attempts.
 */
export default function AntiCheatWarning({
  isOpen,
  message,
  onDismiss,
  severity = "warning", // "warning" | "critical"
}) {
  if (!isOpen) return null;

  const isCritical = severity === "critical";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className={`bg-white rounded-lg max-w-md w-full p-6 shadow-xl transform transition-all ${
          isCritical ? "border-2 border-red-500" : ""
        }`}
      >
        {/* Header */}
        <div className={`flex items-center space-x-3 mb-4 ${
          isCritical ? "text-red-600" : "text-yellow-600"
        }`}>
          {isCritical ? (
            <XCircleIcon className="h-8 w-8" />
          ) : (
            <ExclamationTriangleIcon className="h-8 w-8" />
          )}
          <h3 className="text-lg font-semibold">
            {isCritical ? "Critical Violation" : "Warning"}
          </h3>
        </div>

        {/* Message */}
        <p className="text-gray-600 mb-4">{message}</p>

        {/* Info box */}
        <div className={`p-3 rounded-lg mb-6 ${
          isCritical ? "bg-red-50 text-red-800" : "bg-yellow-50 text-yellow-800"
        }`}>
          <p className="text-sm">
            {isCritical 
              ? "Your assessment has been automatically submitted due to excessive violations."
              : "Please stay focused on the assessment. Further violations may result in automatic submission."
            }
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className={`px-6 py-2 rounded-md font-medium text-white transition-colors ${
              isCritical 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-yellow-600 hover:bg-yellow-700"
            }`}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ViolationBadge Component
 * 
 * Small badge showing violation count for a specific type.
 */
export function ViolationBadge({ type, count, limit }) {
  if (count === 0) return null;

  const percentage = (count / limit) * 100;
  let colorClass = "bg-green-100 text-green-800";
  
  if (percentage >= 66) {
    colorClass = "bg-red-100 text-red-800";
  } else if (percentage >= 33) {
    colorClass = "bg-yellow-100 text-yellow-800";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {type}: {count}/{limit}
    </span>
  );
}

/**
 * ViolationSummary Component
 * 
 * Shows a summary of all violations for teacher review.
 */
export function ViolationSummary({ violations, showDetails = true }) {
  if (!violations || Object.keys(violations).length === 0) {
    return (
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <p className="text-green-800 text-sm">No violations detected</p>
      </div>
    );
  }

  // Calculate totals
  const violationEntries = Array.isArray(violations)
    ? violations
    : Object.entries(violations).map(([type, count]) => ({ type, count }));

  const totalViolations = violationEntries.reduce(
    (sum, v) => sum + (typeof v.count === "number" ? v.count : 1),
    0
  );

  // Determine severity
  let severityClass = "bg-yellow-50 border-yellow-200";
  let severityText = "text-yellow-800";
  let severityLabel = "Moderate Concern";

  if (totalViolations >= 5) {
    severityClass = "bg-red-50 border-red-200";
    severityText = "text-red-800";
    severityLabel = "High Concern";
  } else if (totalViolations <= 2) {
    severityClass = "bg-green-50 border-green-200";
    severityText = "text-green-800";
    severityLabel = "Low Concern";
  }

  const formatType = (type) => {
    const labels = {
      tabSwitch: "Tab Switching",
      windowBlur: "Window Focus Lost",
      devTools: "Developer Tools",
      fullscreen: "Fullscreen Exit",
      windowMove: "Window Moved",
      copyPaste: "Copy/Paste Attempt",
      printScreen: "Screenshot Attempt",
    };
    return labels[type] || type.replace(/([A-Z])/g, " $1").trim();
  };

  return (
    <div className={`p-4 rounded-lg border ${severityClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className={`font-medium ${severityText}`}>
          Violations Detected ({totalViolations})
        </h4>
        <span className={`text-xs px-2 py-1 rounded-full ${severityClass} ${severityText} font-medium`}>
          {severityLabel}
        </span>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="space-y-2">
          {violationEntries.map((violation, index) => {
            const type = violation.type || violation[0];
            const count = violation.count || violation[1] || 1;
            
            if (count === 0) return null;

            return (
              <div 
                key={index}
                className={`flex items-center justify-between text-sm ${severityText}`}
              >
                <span className="flex items-center">
                  <span className="mr-2">•</span>
                  {formatType(type)}
                </span>
                <span className="font-medium">
                  {count} time{count !== 1 ? "s" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Forced submission indicator */}
      {totalViolations >= 5 && (
        <div className="mt-3 pt-3 border-t border-red-200">
          <p className="text-red-700 text-xs font-medium">
            ⚠️ Assessment may have been auto-submitted due to violations
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * RiskScoreBadge Component
 * 
 * Shows a visual risk score based on violations.
 */
export function RiskScoreBadge({ score, level }) {
  const colors = {
    low: "bg-green-100 text-green-800 border-green-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    critical: "bg-red-100 text-red-800 border-red-200",
  };

  const colorClass = colors[level] || colors.low;

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full border ${colorClass}`}>
      <div 
        className={`w-2 h-2 rounded-full mr-2 ${
          level === "low" ? "bg-green-500" :
          level === "medium" ? "bg-yellow-500" :
          level === "high" ? "bg-orange-500" :
          "bg-red-500"
        }`}
      />
      <span className="text-sm font-medium">
        Risk: {score}/100 ({level})
      </span>
    </div>
  );
}
