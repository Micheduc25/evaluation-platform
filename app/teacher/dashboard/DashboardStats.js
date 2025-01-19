export default function DashboardStats({ stats }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 h-fit">
      <StatCard
        title="Total Assessments"
        value={stats.totalAssessments}
        icon="📝"
      />
      <StatCard
        title="Active Students"
        value={stats.activeStudents}
        icon="👥"
      />
      <StatCard
        title="Pending Reviews"
        value={stats.pendingReviews}
        icon="⏳"
      />
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}
