import Link from "next/link";

export default function QuickActionCard({
  title,
  count,
  href,
  icon: Icon,
  color,
}) {
  return (
    <Link
      href={href}
      className={`bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 group`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className={`text-${color}-600 font-medium`}>{title}</p>
          <p className="text-2xl font-bold mt-1">{count}</p>
        </div>
        <Icon
          className={`h-8 w-8 text-${color}-500 group-hover:translate-x-1 transition-transform`}
        />
      </div>
    </Link>
  );
}
