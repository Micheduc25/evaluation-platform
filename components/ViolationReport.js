"use client";

import { useState, useMemo } from "react";
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { analyzeSubmission, calculateRiskScore } from "@/services/antiCheatService";
import { RiskScoreBadge, ViolationSummary } from "@/components/AntiCheatWarning";

/**
 * ViolationReport Component
 * 
 * Comprehensive violation report for teachers to review submission integrity
 */
export default function ViolationReport({ submission, assessment }) {
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Analyze submission
  const analysis = useMemo(() => {
    return analyzeSubmission(submission, assessment);
  }, [submission, assessment]);

  const { riskScore, overallRisk, anomalies, summary, recommendations } = analysis;

  // Calculate timing stats
  const timingStats = useMemo(() => {
    if (!submission?.answers) return null;

    const times = submission.answers
      .filter(a => a.timeSpent)
      .map(a => a.timeSpent);

    if (times.length === 0) return null;

    return {
      total: times.reduce((a, b) => a + b, 0),
      min: Math.min(...times),
      max: Math.max(...times),
      avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    };
  }, [submission]);

  // Export report as JSON
  const handleExport = () => {
    const reportData = {
      submissionId: submission?.id,
      studentId: submission?.studentId,
      assessmentId: assessment?.id,
      exportedAt: new Date().toISOString(),
      analysis,
      rawViolations: submission?.violations,
      timingStats,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `violation-report-${submission?.id || "unknown"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!submission) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
        No submission data available
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ChartBarIcon className="h-6 w-6 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Integrity Analysis Report
          </h2>
        </div>
        <div className="flex items-center space-x-3">
          <RiskScoreBadge score={riskScore} level={overallRisk} />
          <button
            onClick={handleExport}
            className="flex items-center px-3 py-1.5 text-sm border rounded-md 
                       hover:bg-gray-50 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex px-6 space-x-6">
          {["overview", "anomalies", "timing", "recommendations"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === "overview" && (
          <OverviewTab
            analysis={analysis}
            submission={submission}
            timingStats={timingStats}
          />
        )}
        {activeTab === "anomalies" && (
          <AnomaliesTab anomalies={anomalies} />
        )}
        {activeTab === "timing" && (
          <TimingTab 
            submission={submission} 
            assessment={assessment}
            timingStats={timingStats}
          />
        )}
        {activeTab === "recommendations" && (
          <RecommendationsTab 
            recommendations={recommendations}
            overallRisk={overallRisk}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Overview Tab
 */
function OverviewTab({ analysis, submission, timingStats }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-700">{analysis.summary}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Risk Score"
          value={`${analysis.riskScore}/100`}
          color={
            analysis.overallRisk === "critical" ? "red" :
            analysis.overallRisk === "high" ? "orange" :
            analysis.overallRisk === "medium" ? "yellow" : "green"
          }
        />
        <StatCard
          label="Total Anomalies"
          value={analysis.anomalies.length}
          color={analysis.anomalies.length > 0 ? "yellow" : "green"}
        />
        <StatCard
          label="Time Spent"
          value={timingStats ? `${Math.round(timingStats.total / 60)}m` : "N/A"}
          color="blue"
        />
        <StatCard
          label="Forced Submit"
          value={submission.forcedSubmission ? "Yes" : "No"}
          color={submission.forcedSubmission ? "red" : "green"}
        />
      </div>

      {/* Violations Summary */}
      {submission.violations && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Violation Breakdown
          </h3>
          <ViolationSummary violations={submission.violations} showDetails />
        </div>
      )}
    </div>
  );
}

/**
 * Anomalies Tab
 */
function AnomaliesTab({ anomalies }) {
  const [filter, setFilter] = useState("all");

  const filteredAnomalies = anomalies.filter(a => 
    filter === "all" || a.severity === filter
  );

  if (anomalies.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <p className="text-gray-600">No anomalies detected</p>
        <p className="text-sm text-gray-400 mt-1">
          This submission appears to be legitimate
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center space-x-2">
        <FunnelIcon className="h-4 w-4 text-gray-400" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm border rounded-md px-2 py-1"
        >
          <option value="all">All Severities</option>
          <option value="high">High Only</option>
          <option value="medium">Medium Only</option>
          <option value="low">Low Only</option>
        </select>
      </div>

      {/* Anomaly List */}
      <div className="space-y-3">
        {filteredAnomalies.map((anomaly, index) => (
          <AnomalyCard key={index} anomaly={anomaly} />
        ))}
      </div>
    </div>
  );
}

/**
 * Timing Tab
 */
function TimingTab({ submission, assessment, timingStats }) {
  if (!timingStats) {
    return (
      <div className="text-center py-8 text-gray-500">
        No timing data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timing Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Time"
          value={formatTime(timingStats.total)}
          color="blue"
        />
        <StatCard
          label="Avg per Question"
          value={formatTime(timingStats.avg)}
          color="blue"
        />
        <StatCard
          label="Fastest"
          value={formatTime(timingStats.min)}
          color={timingStats.min < 3 ? "yellow" : "green"}
        />
        <StatCard
          label="Slowest"
          value={formatTime(timingStats.max)}
          color="blue"
        />
      </div>

      {/* Per-Question Timing */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Time per Question
        </h3>
        <div className="space-y-2">
          {submission.answers?.map((answer, index) => {
            const question = assessment?.questions?.find(
              q => q.id === answer.questionId
            );
            const isSuspicious = answer.timeSpent < 3;

            return (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isSuspicious ? "bg-yellow-50" : "bg-gray-50"
                }`}
              >
                <span className="text-sm text-gray-600">
                  Q{index + 1}: {question?.text?.slice(0, 50) || "Question"}...
                </span>
                <span className={`text-sm font-medium ${
                  isSuspicious ? "text-yellow-700" : "text-gray-700"
                }`}>
                  {formatTime(answer.timeSpent || 0)}
                  {isSuspicious && " ⚠️"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Recommendations Tab
 */
function RecommendationsTab({ recommendations, overallRisk }) {
  return (
    <div className="space-y-4">
      {/* Risk-based action */}
      <div className={`p-4 rounded-lg ${
        overallRisk === "critical" ? "bg-red-50 border border-red-200" :
        overallRisk === "high" ? "bg-orange-50 border border-orange-200" :
        overallRisk === "medium" ? "bg-yellow-50 border border-yellow-200" :
        "bg-green-50 border border-green-200"
      }`}>
        <h3 className={`font-medium mb-2 ${
          overallRisk === "critical" ? "text-red-800" :
          overallRisk === "high" ? "text-orange-800" :
          overallRisk === "medium" ? "text-yellow-800" :
          "text-green-800"
        }`}>
          Suggested Action
        </h3>
        <p className={`text-sm ${
          overallRisk === "critical" ? "text-red-700" :
          overallRisk === "high" ? "text-orange-700" :
          overallRisk === "medium" ? "text-yellow-700" :
          "text-green-700"
        }`}>
          {overallRisk === "critical" 
            ? "Immediate review required. Consider invalidating this submission."
            : overallRisk === "high"
            ? "Manual review recommended before accepting grade."
            : overallRisk === "medium"
            ? "Review the flagged items but likely acceptable."
            : "No action required. Submission appears legitimate."}
        </p>
      </div>

      {/* Recommendations List */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Specific Recommendations
          </h3>
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <li 
                key={index}
                className="flex items-start text-sm text-gray-600"
              >
                <span className="mr-2">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({ label, value, color }) {
  const colors = {
    red: "bg-red-50 text-red-700 border-red-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[color] || colors.blue}`}>
      <p className="text-xs uppercase tracking-wide opacity-75">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}

/**
 * Anomaly Card Component
 */
function AnomalyCard({ anomaly }) {
  const severityColors = {
    high: "border-red-200 bg-red-50",
    medium: "border-yellow-200 bg-yellow-50",
    low: "border-gray-200 bg-gray-50",
  };

  const severityTextColors = {
    high: "text-red-700",
    medium: "text-yellow-700",
    low: "text-gray-700",
  };

  return (
    <div className={`p-4 rounded-lg border ${severityColors[anomaly.severity]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <ExclamationTriangleIcon 
            className={`h-5 w-5 mr-2 ${severityTextColors[anomaly.severity]}`} 
          />
          <div>
            <p className={`font-medium ${severityTextColors[anomaly.severity]}`}>
              {anomaly.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
            </p>
            <p className="text-sm text-gray-600 mt-1">{anomaly.message}</p>
            {anomaly.questionId && (
              <p className="text-xs text-gray-400 mt-1">
                Question ID: {anomaly.questionId}
              </p>
            )}
          </div>
        </div>
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          anomaly.severity === "high" ? "bg-red-100 text-red-700" :
          anomaly.severity === "medium" ? "bg-yellow-100 text-yellow-700" :
          "bg-gray-100 text-gray-700"
        }`}>
          {anomaly.severity}
        </span>
      </div>
    </div>
  );
}

/**
 * Format time in seconds to human-readable
 */
function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
