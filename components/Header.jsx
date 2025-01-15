'use client'

import { Fragment } from 'react'
import { useSelector } from 'react-redux'
import { useRouter, usePathname } from 'next/navigation'
import { Disclosure, DisclosurePanel, DisclosureButton, Menu, MenuButton, Transition, MenuItems, MenuItem } from '@headlessui/react'
import { Bars3Icon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { auth } from '@/firebase/client'
import { useDispatch } from 'react-redux'
import { logout } from '@/store/slices/authSlice'

// Define navigation based on auth state and role
const publicNavigation = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
]

const privateNavigation = {
  student: [
    { name: 'Dashboard', href: '/student/dashboard' },
    // { name: 'My Evaluations', href: '/student/evaluation' },
    { name: 'My Classes', href: '/student/classrooms' },
  ],
  teacher: [
    { name: 'Dashboard', href: '/teacher/dashboard' },
    // { name: 'Create Exam', href: '/teacher/create-exam' },
    { name: 'My Classes', href: '/teacher/classrooms' },
  ],
  admin: [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Users', href: '/admin/users' },
    { name: 'Settings', href: '/admin/settings' },
  ],
}

export default function Header() {
  const { user, loading } = useSelector((state) => state.auth)
  const router = useRouter()
  const dispatch = useDispatch()
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await auth.signOut()
      dispatch(logout())
      router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Determine current navigation items
  const currentNavigation = user 
    ? [...publicNavigation, ...(privateNavigation[user.role] || [])]
    : publicNavigation

  return (
    <Disclosure as="nav" className="bg-white shadow-sm">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              {/* Left side - Logo and Navigation */}
              <div className="flex">
                <Link href="/" className="flex flex-shrink-0 items-center">
                  <img src="/logo.svg" alt="EvalMaster Logo" className="h-8 w-8 mr-2" />
                  <span className="text-xl font-bold text-blue-600">EvalMaster</span>
                </Link>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {currentNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                        pathname === item.href
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Right side - User Menu */}
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {loading ? (
                  <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
                ) : user ? (
                  <Menu as="div" className="relative ml-3">
                    <MenuButton className="flex items-center">
                      <span className="mr-2 text-sm text-gray-700">{user.displayName}</span>
                      <UserCircleIcon className="h-8 w-8 text-gray-400" aria-hidden="true" />
                    </MenuButton>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <MenuItem>
                          {({ focus }) => (
                            <Link
                              href="/profile"
                              className={`block px-4 py-2 text-sm text-gray-700 ${
                                focus ? 'bg-gray-100' : ''
                              }`}
                            >
                              Profile
                            </Link>
                          )}
                        </MenuItem>
                        <MenuItem>
                          {({ focus }) => (
                            <button
                              onClick={handleLogout}
                              className={`block w-full px-4 py-2 text-left text-sm text-gray-700 ${
                                focus ? 'bg-gray-100' : ''
                              }`}
                            >
                              Sign out
                            </button>
                          )}
                        </MenuItem>
                      </MenuItems>
                    </Transition>
                  </Menu>
                ) : (
                  <div className="flex items-center space-x-4">
                    <Link
                      href="/auth/login"
                      className="text-gray-700 hover:text-gray-900"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <div className="flex items-center sm:hidden">
                <DisclosureButton className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                  {open ? (
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                  )}
                </DisclosureButton>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          <DisclosurePanel className="sm:hidden">
            <div className="space-y-1 pb-3 pt-2">
              {currentNavigation.map((item) => (
                <DisclosureButton
                  key={item.name}
                  as={Link}
                  href={item.href}
                  className={`block border-l-4 py-2 pl-3 pr-4 text-base font-medium ${
                    pathname === item.href
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  {item.name}
                </DisclosureButton>
              ))}
              {!user && (
                <div className="border-t border-gray-200 pt-4">
                  <DisclosureButton
                    as={Link}
                    href="/auth/login"
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  >
                    Sign in
                  </DisclosureButton>
                  <DisclosureButton
                    as={Link}
                    href="/auth/signup"
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  >
                    Sign up
                  </DisclosureButton>
                </div>
              )}
            </div>
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  )
}
