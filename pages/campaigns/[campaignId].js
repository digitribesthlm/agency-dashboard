import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';

export default function CampaignAssetGroupsPage() {
  const router = useRouter();
  const { campaignId } = router.query;
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [assetGroups, setAssetGroups] = useState([]);
  const [showRemoved, setShowRemoved] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && campaignId) {
      fetchAssetGroups();
    }
  }, [status, campaignId]);

  const fetchAssetGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assets?campaign_id=${campaignId}`);
      const assets = await response.json();
      
      if (assets.length === 0) {
        setCampaign({ campaignName: 'Unknown Campaign' });
        setAssetGroups([]);
        return;
      }
      
      // Get campaign info from first asset
      const firstAsset = assets[0];
      setCampaign({
        campaignId: firstAsset.campaign_id,
        campaignName: firstAsset.campaign_name,
        campaignStatus: firstAsset.campaign_status || firstAsset['Campaign Status'] || 'UNKNOWN'
      });
      
      // Group assets by asset group
      const assetGroupMap = new Map();
      
      assets.forEach(asset => {
        const assetGroupId = asset.asset_group_id;
        
        if (!assetGroupMap.has(assetGroupId)) {
          assetGroupMap.set(assetGroupId, {
            assetGroupId: assetGroupId,
            assetGroupName: asset.asset_group_name,
            assets: [],
            totalAssets: 0,
            images: 0,
            videos: 0,
            headlines: 0,
            descriptions: 0
          });
        }
        
        const assetGroup = assetGroupMap.get(assetGroupId);
        assetGroup.assets.push(asset);
        assetGroup.totalAssets++;
        
        // Count by type
        if (asset.asset_type === 'IMAGE') assetGroup.images++;
        else if (asset.asset_type === 'YOUTUBE_VIDEO') assetGroup.videos++;
        else if (asset.field_type === 'HEADLINE') assetGroup.headlines++;
        else if (asset.field_type === 'DESCRIPTION') assetGroup.descriptions++;
      });
      
      // Convert to array
      const assetGroupsArray = Array.from(assetGroupMap.values());
      setAssetGroups(assetGroupsArray);
      
    } catch (error) {
      console.error('Error fetching asset groups:', error);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Box */}
        <div className="mb-8">
          <div className="breadcrumbs text-sm text-base-content/70">
            <ul>
              <li><a href="/campaigns" className="link link-hover">Campaigns</a></li>
              <li><a className="link link-hover">{campaign?.campaignName || 'Campaign'}</a></li>
            </ul>
          </div>
          <div className="mt-3 card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Asset Groups</h1>
                  <p className="text-base-content/70 mt-1">Browse asset groups for this campaign and drill down to assets.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${
                    campaign?.campaignStatus === 'ENABLED' ? 'badge-success' :
                    campaign?.campaignStatus === 'PAUSED' ? 'badge-warning' :
                    campaign?.campaignStatus === 'REMOVED' ? 'badge-error' :
                    campaign?.campaignStatus === 'PENDING' ? 'badge-warning' :
                    'badge-neutral'
                  }`}>
                    {campaign?.campaignStatus || 'UNKNOWN'}
                  </span>
                  <div className="badge badge-primary badge-outline">Groups: {assetGroups.length}</div>
                  <label className="label cursor-pointer gap-2">
                    <span className="label-text">Show Removed</span>
                    <input 
                      type="checkbox" 
                      className="toggle toggle-sm" 
                      checked={showRemoved}
                      onChange={(e) => setShowRemoved(e.target.checked)}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {assetGroups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-500">No asset groups found for this campaign</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assetGroups.map((assetGroup) => (
              <div key={assetGroup.assetGroupId} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="card-body">
                  {/* Status Badge (campaign-level) */}
                  <div className="flex justify-between items-start mb-4">
                    <span className={`badge ${
                      campaign?.campaignStatus === 'ENABLED' ? 'badge-success' :
                      campaign?.campaignStatus === 'PAUSED' ? 'badge-warning' :
                      campaign?.campaignStatus === 'REMOVED' ? 'badge-error' :
                      campaign?.campaignStatus === 'PENDING' ? 'badge-warning' :
                      'badge-neutral'
                    }`}>
                      {campaign?.campaignStatus || 'UNKNOWN'}
                    </span>
                  </div>
                  
                  {/* Header with Logo and Title */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center text-white font-bold text-sm">
                      Q
                    </div>
                    <span className="text-sm text-gray-600">Qlik Sense - Product Tour</span>
                  </div>
                  
                  {/* Video Thumbnail */}
                  <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4 relative group cursor-pointer">
                    {/* Try to show actual video thumbnail if available */}
                    {assetGroup.assets?.find(asset => asset.asset_type === 'YOUTUBE_VIDEO') ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${assetGroup.assets.find(asset => asset.asset_type === 'YOUTUBE_VIDEO')['Video ID'] || assetGroup.assets.find(asset => asset.asset_type === 'YOUTUBE_VIDEO')['Asset URL']?.split('v=')[1]}?autoplay=0&controls=0&showinfo=0&rel=0&modestbranding=1`}
                        className="w-full h-full"
                        allowFullScreen
                        style={{ pointerEvents: 'none' }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                          <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 5v10l8-5-8-5z"/>
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    {/* Play overlay on hover */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 5v10l8-5-8-5z"/>
                        </svg>
                      </div>
                    </div>
                    
                    {/* Asset count badge */}
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                      {assetGroup.totalAssets} assets
                    </div>
                  </div>
                  
                  {/* Asset Group Name */}
                  <h2 className="card-title text-lg mb-2">{assetGroup.assetGroupName}</h2>
                  
                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4">
                    {assetGroup.assetGroupName.includes('Qlik') 
                      ? 'If you want to create a data-literate organisation, you need effective training.'
                      : 'Easy to implement all KPIs in one place'
                    }
                  </p>
                  
                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>—</span>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      <span>{assetGroup.images || 5}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <span>{assetGroup.videos || 11}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span>1</span>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <div className="card-actions justify-end">
                    <button
                      className="btn btn-primary"
                      onClick={() => router.push(`/campaigns/${campaignId}/${assetGroup.assetGroupId}`)}
                    >
                      {assetGroup.assetGroupName}
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
