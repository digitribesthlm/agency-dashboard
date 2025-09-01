import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';

export default function Layout({ children }) {
  const { data: session } = useSession();
  const router = useRouter();
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Ad Input System';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                {brandName}
              </Link>
              {session && (
                <div className="hidden md:block">
                  <div className="ml-10 flex items-baseline space-x-4">
                    {session.user.role === 'admin' ? (
                      <>
                        <Link
                          href="/admin/dashboard"
                          className={`px-3 py-2 text-sm font-medium ${
                            router.pathname === '/admin/dashboard'
                              ? 'text-blue-600'
                              : 'text-gray-600 hover:text-blue-600'
                          }`}
                        >
                          Admin Dashboard
                        </Link>
                        <Link
                          href="/client/dashboard"
                          className={`px-3 py-2 text-sm font-medium ${
                            router.pathname === '/client/dashboard'
                              ? 'text-blue-600'
                              : 'text-gray-600 hover:text-blue-600'
                          }`}
                        >
                          Client Dashboard
                        </Link>
                        <Link
                          href="/client/create-ad"
                          className={`px-3 py-2 text-sm font-medium ${
                            router.pathname === '/client/create-ad'
                              ? 'text-blue-600'
                              : 'text-gray-600 hover:text-blue-600'
                          }`}
                        >
                          Create Ad
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/client/dashboard"
                          className={`px-3 py-2 text-sm font-medium ${
                            router.pathname === '/client/dashboard'
                              ? 'text-blue-600'
                              : 'text-gray-600 hover:text-blue-600'
                          }`}
                        >
                          Client Dashboard
                        </Link>
                        <Link
                          href="/client/create-ad"
                          className={`px-3 py-2 text-sm font-medium ${
                            router.pathname === '/client/create-ad'
                              ? 'text-blue-600'
                              : 'text-gray-600 hover:text-blue-600'
                          }`}
                        >
                          Create Ad
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6">
                {session ? (
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600 text-sm">
                      {session.user.email}
                    </span>
                    <button
                      onClick={() => signOut()}
                      className="text-gray-600 hover:text-blue-600 font-medium"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="text-gray-600 hover:text-blue-600 font-medium"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center space-y-8">
            <div className="text-center">
              <span className="text-xl font-bold text-blue-600">{brandName}</span>
              <p className="text-gray-600 text-sm mt-2">
                Simplifying digital advertising through smart automation.
              </p>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-8">
              <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                Privacy Policy
              </a>
              <span className="text-gray-300">|</span>
              <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                Terms of Service
              </a>
              <span className="text-gray-300">|</span>
              <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                Cookie Policy
              </a>
            </div>

            <div className="text-center text-gray-600 text-sm pt-8 border-t border-gray-200 w-full">
              {new Date().getFullYear()} {brandName}. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}