import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchClients = async () => {
      if (status === 'authenticated' && session?.user?.role === 'admin') {
        try {
          setLoading(true);
          const res = await fetch('/api/admin/clients');
          const data = await res.json();
          if (data.success) {
            setClients(data.data);
          }
        } catch (error) {
          console.error('Error fetching clients:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchClients();
  }, [status, session]);

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      </Layout>
    );
  }

  if (status === 'unauthenticated' || session?.user?.role !== 'admin') {
    return null; // Will redirect in useEffect
  }

  return (
    <Layout>
      <div className="p-4 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Client Management</h1>
          <button className="btn btn-primary">
            Add New Client
          </button>
        </div>

        {/* Client Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <div 
              key={client._id} 
              className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all"
            >
              <div className="card-body">
                {/* Client Status */}
                <div className="absolute top-4 right-4">
                  <span className={`badge ${
                    client.status === 'active' 
                      ? 'badge-success' 
                      : 'badge-error'
                  }`}>
                    {client.status}
                  </span>
                </div>

                {/* Client Info */}
                <h2 className="card-title text-xl mb-4">{client.name}</h2>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {client.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    Account ID: {client['Account ID']}
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Last Login: {client.last_login ? new Date(client.last_login).toLocaleDateString() : 'Never'}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="card-actions justify-end mt-6">
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => router.push(`/admin/clients/${client._id}`)}
                  >
                    View Details
                  </button>
                  <button className="btn btn-sm btn-primary">
                    Manage Access
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
} 