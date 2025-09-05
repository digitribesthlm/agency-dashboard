import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Layout from '../components/Layout';

export default function CampaignsPage() {
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
    if (status === 'authenticated') {
      fetchCampaigns();
    }
  }, [status, session]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assets?all=true');
      const assets = await response.json();
      
      // Group assets by campaign and count asset groups
      const campaignMap = new Map();
      
      assets.forEach(asset => {
        const campaignId = asset.campaign_id;
        const assetGroupId = asset.asset_group_id;
        
        if (!campaignMap.has(campaignId)) {
          campaignMap.set(campaignId, {
            campaignId: campaignId,
            campaignName: asset.campaign_name,
            assetGroups: new Set(),
            totalAssets: 0
          });
        }
        
        const campaign = campaignMap.get(campaignId);
        campaign.assetGroups.add(assetGroupId);
        campaign.totalAssets++;
      });
      
      // Convert to array and add asset group counts
      const campaignsArray = Array.from(campaignMap.values()).map(campaign => ({
        ...campaign,
        assetGroupCount: campaign.assetGroups.size
      }));
      
      setCampaigns(campaignsArray);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Layout>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="breadcrumbs text-sm mb-6">
          <ul>
            <li><a className="link link-hover">Campaigns</a></li>
            <li><a className="link link-hover">Changes Tracking</a></li>
          </ul>
        </div>

        <h1 className="text-3xl font-bold mb-8">Campaigns ({campaigns.length})</h1>
        
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-500">No campaigns found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <div key={campaign.campaignId} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="card-body">
                  {/* Status Badge and Asset Group Count */}
                  <div className="flex justify-between items-start mb-4">
                    <span className="badge badge-success">ENABLED</span>
                    <span className="badge badge-primary">
                      Asset Groups: {campaign.assetGroupCount}
                    </span>
                  </div>
                  
                  {/* Campaign Name */}
                  <h2 className="card-title text-xl mb-4">{campaign.campaignName}</h2>
                  
                  {/* Asset Group Visualizer - Purple dashes */}
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: Math.min(campaign.assetGroupCount, 5) }, (_, i) => (
                      <div key={i} className="w-8 h-2 bg-purple-500 rounded"></div>
                    ))}
                    {campaign.assetGroupCount > 5 && (
                      <span className="text-sm text-gray-500 ml-2">+{campaign.assetGroupCount - 5} more</span>
                    )}
                  </div>
                  
                  {/* Action Button */}
                  <div className="card-actions justify-end">
                    <button
                      className="btn btn-outline"
                      onClick={() => router.push(`/campaigns/${campaign.campaignId}`)}
                    >
                      View Asset Groups →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
