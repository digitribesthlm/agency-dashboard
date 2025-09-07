import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';

export default function Layout({ children }) {
  const { data: session } = useSession();
  const router = useRouter();
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Ad Input System';

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {/* Header Navigation */}
      <div className="navbar bg-base-100 shadow-sm border-b border-base-300">
        <div className="navbar-start">
          {/* Mobile menu button */}
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              {session && (
                <>
                  <li>
                    <Link href="/campaigns" className={router.pathname === '/campaigns' ? 'active' : ''}>
                      Performance Max Ads
                    </Link>
                  </li>
                  <li>
                    <Link href="/client/create-ad" className={router.pathname === '/client/create-ad' ? 'active' : ''}>
                      Create Performance Max Ad
                    </Link>
                  </li>
                  {session.user.role === 'admin' && (
                    <li>
                      <Link href="/changes" className={router.pathname === '/changes' ? 'active' : ''}>
                        Changes
                      </Link>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
          
          {/* Brand Logo */}
          <Link href="/" className="btn btn-ghost text-xl font-bold text-primary">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-content font-bold text-sm">AI</span>
              </div>
              {brandName}
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="navbar-center hidden lg:flex">
          {session && (
            <ul className="menu menu-horizontal px-1">
              <li>
                <Link 
                  href="/campaigns" 
                  className={`btn btn-ghost ${router.pathname === '/campaigns' ? 'btn-active' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Performance Max Ads
                </Link>
              </li>
              <li>
                <Link 
                  href="/client/create-ad" 
                  className={`btn btn-ghost ${router.pathname === '/client/create-ad' ? 'btn-active' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Performance Max Ad
                </Link>
              </li>
              {session.user.role === 'admin' && (
                <li>
                  <Link 
                    href="/changes" 
                    className={`btn btn-ghost ${router.pathname === '/changes' ? 'btn-active' : ''}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Changes
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Right side - User menu */}
        <div className="navbar-end">
          {session ? (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                  <span className="text-sm font-semibold">
                    {session.user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                <li className="menu-title">
                  <span>{session.user.email}</span>
                </li>
                <li className="menu-title">
                  <span className="text-xs text-base-content/60">
                    {session.user.role === 'admin' ? 'Administrator' : 'User'}
                  </span>
                </li>
                <div className="divider my-1"></div>
                <li>
                  <button onClick={() => signOut()} className="text-error">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="footer footer-center p-10 bg-base-200 text-base-content border-t border-base-300 mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center space-y-6">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-content font-bold text-sm">AI</span>
              </div>
              <span className="text-xl font-bold text-primary">{brandName}</span>
            </div>
            
            <p className="text-base-content/70 text-sm max-w-md text-center">
              Simplifying digital advertising through smart automation and intelligent asset management.
            </p>

            {/* Navigation Links */}
            <div className="flex flex-wrap justify-center items-center gap-6">
              <a href="#" className="link link-hover text-sm">
                Privacy Policy
              </a>
              <div className="divider divider-horizontal"></div>
              <a href="#" className="link link-hover text-sm">
                Terms of Service
              </a>
              <div className="divider divider-horizontal"></div>
              <a href="#" className="link link-hover text-sm">
                Cookie Policy
              </a>
            </div>

            {/* Copyright */}
            <div className="text-base-content/60 text-sm pt-4 border-t border-base-300 w-full text-center">
              © {new Date().getFullYear()} {brandName}. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}