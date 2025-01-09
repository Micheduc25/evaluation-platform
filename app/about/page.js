export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        About the Platform
      </h1>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Our Mission
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            To provide a comprehensive and user-friendly platform for
            educational assessment, enabling educators to create and manage
            evaluations while helping students track their academic progress
            effectively.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Key Features
          </h2>
          <ul className="space-y-2 text-gray-600 dark:text-gray-300">
            <li>• Interactive quiz and exam creation</li>
            <li>• Real-time evaluation and grading</li>
            <li>• Comprehensive performance analytics</li>
            <li>• Multiple question types support</li>
            <li>• Secure and reliable testing environment</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm md:col-span-2">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Create",
                description:
                  "Teachers create customized evaluations with various question types",
              },
              {
                title: "Evaluate",
                description:
                  "Students take assessments in a controlled environment",
              },
              {
                title: "Track",
                description:
                  "Monitor progress and view detailed performance analytics",
              },
            ].map((step, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
