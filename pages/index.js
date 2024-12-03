import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useSession } from 'next-auth/react';

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check');
        setIsAuthenticated(res.ok);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handleDashboardClick = () => {
    if (isAuthenticated) {
      router.push('/client/dashboard');
    } else {
      router.push('/login');
    }
  };

  const handleLearnMore = () => {
    // Function to handle learn more click
  };

  const scrollToFeatures = () => {
    router.push('/login');
  };

  return (
    <Layout>
      <main className="flex-grow pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {session || isAuthenticated ? (
            <div className="hero min-h-screen bg-base-200">
              <div className="hero-content text-center">
                <div className="max-w-md">
                  <h1 className="text-5xl font-bold">Welcome</h1>
                  <p className="py-6">
                    View and manage your Performance Max campaigns and assets.
                  </p>
                  <button 
                    onClick={handleDashboardClick}
                    className="btn btn-primary"
                  >
                    {isAuthenticated ? 'Go to Dashboard' : 'Login to Dashboard'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row items-center gap-12 py-16">
              <div className="w-full lg:w-1/2">
                <div className="relative aspect-square rounded-3xl overflow-hidden">
                  <img 
                    src="/new.png"
                    alt="Performance Matrix Visual" 
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>

              <div className="w-full lg:w-1/2 space-y-8">
                <div className="space-y-6">
                  <h1 className="space-y-2">
                    <span className="block text-6xl lg:text-7xl font-black tracking-tight text-gray-900">
                      PERFORMANCE
                    </span>
                    <span className="block text-6xl lg:text-7xl font-black tracking-tight text-blue-500">
                      MATRIX
                    </span>
                    <span className="block text-6xl lg:text-7xl font-black tracking-tight text-teal-500">
                      SOLUTIONS
                    </span>
                  </h1>
                  <p className="text-xl text-gray-600 mt-6">
                    Discover our comprehensive performance matrix solutions designed to optimize your campaigns and enhance your digital growth.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={handleLearnMore}
                    className="inline-flex items-center px-6 py-3 text-base font-bold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
                  >
                    Learn More
                  </button>
                  <button 
                    onClick={scrollToFeatures}
                    className="inline-flex items-center px-6 py-3 text-base font-bold text-blue-600 border-2 border-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                  >
                    Explore Features
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}