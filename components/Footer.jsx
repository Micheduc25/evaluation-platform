
import { GlobeAltIcon } from '@heroicons/react/24/outline'

const navigation = {
  main: [
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Help', href: '/help' },
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
  ]
}

export default function Footer() {
  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-7xl overflow-hidden px-6 py-8 sm:py-12 lg:px-8">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-4" aria-label="Footer">
          {navigation.main.map((item) => (
            <a key={item.name} href={item.href} className="text-sm leading-6 text-gray-600 hover:text-gray-900">
              {item.name}
            </a>
          ))}
        </nav>
        <div className="mt-6 flex justify-center gap-x-4">
          <GlobeAltIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
        </div>
        <p className="mt-4 text-center text-sm leading-5 text-gray-500">
          &copy; {new Date().getFullYear()} Student Evaluation Platform. All rights reserved.
        </p>
      </div>
    </footer>
  )
}