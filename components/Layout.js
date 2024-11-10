import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';

const Layout = ({ children }) => {
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <nav className="bg-base-200 shadow-lg">
        <div className="navbar max-w-7xl mx-auto px-4">
          <div className="flex-1">
            <Link href="/" className="btn btn-ghost normal-case text-xl">
              Agency Dashboard
            </Link>
          </div>
          <div className="flex-none gap-4">
            {status === 'loading' ? (
              <span className="loading loading-spinner loading-md"></span>
            ) : status === 'authenticated' ? (
              <>
                {router.pathname !== '/client/dashboard' && (
                  <Link href="/client/dashboard" className="btn btn-primary">
                    Dashboard
                  </Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="btn btn-outline"
                >
                  Logout
                </button>
              </>
            ) : (
              router.pathname !== '/login' && (
                <Link href="/login" className="btn btn-primary">
                  Login
                </Link>
              )
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="footer footer-center p-4 bg-base-200 text-base-content">
        <div>
          <p>© 2024 Agency Dashboard</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 