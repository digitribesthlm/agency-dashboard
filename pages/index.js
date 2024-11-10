import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

export default function Home() {
  const router = useRouter();
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

  return (
    <Layout>
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold">Welcome to Agency Dashboard!</h1>
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
    </Layout>
  );
} 