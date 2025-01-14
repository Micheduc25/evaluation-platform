import Image from "next/image";
import Link from "next/link";
import {
  AcademicCapIcon,
  ChartBarIcon,
  ClockIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  DocumentCheckIcon,
} from "@heroicons/react/24/outline";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-32">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <span className="inline-block px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-semibold mb-6">
                Transform Education
              </span>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                Modern Student <br />
                <span className="text-blue-600">Evaluation Platform</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Create, manage, and conduct student evaluations with ease.
                Experience the future of educational assessment.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/auth/signup"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium transition-all transform hover:scale-105"
                >
                  Get Started Free
                </Link>
                <Link
                  href="/demo"
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-8 py-4 rounded-lg font-medium flex items-center gap-2"
                >
                  <ClockIcon className="h-5 w-5" />
                  Watch Demo
                </Link>
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="absolute inset-0 bg-blue-500 rounded-lg opacity-10 blur-3xl"></div>
              <Image
                src="/dashboard-mini.jpeg"
                alt="Platform Preview"
                width={600}
                height={400}
                className="rounded-lg shadow-2xl relative"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-gray-300">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Everything you need to manage student evaluations effectively
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all group"
              >
                <feature.icon className="h-12 w-12 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 dark:bg-blue-800">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Ready to transform your evaluation process?
          </h2>
          <Link
            href="/auth/signup"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-medium inline-block transition-all transform hover:scale-105"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>
    </div>
  );
}

const stats = [
  { value: "10K+", label: "Students" },
  { value: "500+", label: "Teachers" },
  { value: "50K+", label: "Evaluations" },
  { value: "98%", label: "Satisfaction" },
];

const features = [
  {
    icon: AcademicCapIcon,
    title: "Interactive Evaluations",
    description:
      "Create engaging quizzes and exams with multiple question types and real-time feedback.",
  },
  {
    icon: ChartBarIcon,
    title: "Performance Analytics",
    description:
      "Monitor student progress with detailed analytics and comprehensive reporting tools.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Secure & Reliable",
    description:
      "Built with modern security standards to protect sensitive academic data.",
  },
  {
    icon: UserGroupIcon,
    title: "Collaborative Learning",
    description:
      "Enable group assessments and peer reviews for better learning outcomes.",
  },
  {
    icon: DocumentCheckIcon,
    title: "Auto Grading",
    description:
      "Save time with automated grading and instant result generation.",
  },
  {
    icon: ClockIcon,
    title: "Real-time Results",
    description: "Instant feedback and results for both students and teachers.",
  },
];
