import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';

export default function ClientDashboardTest() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchAssets = async () => {
      if (status === 'authenticated' && session?.user?.accountId) {
        try {
          setLoading(true);
          const res = await fetch(`/api/assets?accountId=${session.user.accountId}`);
          const data = await res.json();
          if (data.success) {
            setCampaigns(data.data);
          }
        } catch (error) {
          console.error('Error fetching assets:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAssets();
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

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <Layout>
      <div className="p-4 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Test Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <div key={campaign.campaignId} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">{campaign.campaignName}</h2>
                <p>Asset Groups: {campaign.assetGroups.length}</p>
                <div className="card-actions justify-end">
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      console.log('Campaign clicked:', campaign.campaignName);
                    }}
                  >
                    View Details
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








