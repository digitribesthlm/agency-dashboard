import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';

// Add this helper function at the top of your file
const getPerformanceIcon = (label) => {
  switch(label?.toUpperCase()) {
    case 'BEST':
      return (
        <div className="tooltip" data-tip="Best Performance">
          <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
      );
    case 'GOOD':
      return (
        <div className="tooltip" data-tip="Good Performance">
          <svg className="w-5 h-5 text-info" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'LOW':
      return (
        <div className="tooltip" data-tip="Low Performance">
          <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'UNKNOWN':
    case 'PENDING':
      return (
        <div className="tooltip" data-tip="Pending/Unknown">
          <svg className="w-5 h-5 text-base-content/40" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </div>
      );
    default:
      return null;
  }
};

export default function ClientDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedAssetGroup, setSelectedAssetGroup] = useState(null);
  const [videos, setVideos] = useState([]);
  const [showVideoGallery, setShowVideoGallery] = useState(false);

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

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch('/api/assets/videos');
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched videos:', data);
          setVideos(data);
        } else {
          console.error('Failed to fetch videos:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };

    if (showVideoGallery) {
      fetchVideos();
    }
  }, [showVideoGallery]);

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
    return null; // Will redirect in useEffect
  }

  console.log('Current campaigns:', campaigns);

  return (
    <Layout>
      <div className="p-4 max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="breadcrumbs text-sm mb-6">
          <ul>
            <li>
              <button 
                className="link link-primary" 
                onClick={() => {
                  setSelectedCampaign(null);
                  setSelectedAssetGroup(null);
                }}
              >
                Campaigns
              </button>
            </li>
            {selectedCampaign && (
              <li>
                <button 
                  className="link link-primary" 
                  onClick={() => setSelectedAssetGroup(null)}
                >
                  {selectedCampaign.campaignName}
                </button>
              </li>
            )}
            {selectedAssetGroup && (
              <li>{selectedAssetGroup.assetGroupName}</li>
            )}
          </ul>
        </div>

        {/* Main Content */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-2">
            <button 
              className="btn btn-primary"
              onClick={() => router.push('/admin/video')}
            >
              View Videos
            </button>
          </div>
        </div>

        {!selectedCampaign ? (
          <CampaignsList 
            campaigns={campaigns} 
            onSelect={setSelectedCampaign} 
          />
        ) : !selectedAssetGroup ? (
          <AssetGroupsList 
            assetGroups={selectedCampaign.assetGroups} 
            onSelect={setSelectedAssetGroup} 
          />
        ) : (
          <AssetGroupDetail assetGroup={selectedAssetGroup} />
        )}
      </div>
    </Layout>
  );
}

// Split into smaller components for better performance
const CampaignsList = ({ campaigns, onSelect }) => {
  // Filter out DRAFT campaigns
  const filteredCampaigns = campaigns.filter(campaign => 
    campaign.campaignStatus !== 'DRAFT'
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredCampaigns.length === 0 ? (
        <div className="col-span-full text-center py-12">
          <div className="text-base-content/60">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium mb-2">No Active Campaigns</h3>
            <p className="text-sm">All campaigns are currently in draft mode or no campaigns exist.</p>
          </div>
        </div>
      ) : (
        filteredCampaigns.map((campaign) => (
      <div 
        key={campaign.campaignId}
        onClick={() => onSelect(campaign)}
        className="card bg-gradient-to-br from-base-100 to-base-200 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer"
      >
        <div className="card-body p-6">
          {/* Campaign Status Badge */}
          <div className="flex justify-between items-start mb-4">
            <span className={`badge badge-lg ${
              campaign.campaignStatus === 'ENABLED' 
                ? 'badge-success' 
                : 'badge-error'
            }`}>
              {campaign.campaignStatus}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-base-content/70">Asset Groups:</span>
              <span className="badge badge-primary badge-lg">
                {campaign.assetGroups.length}
              </span>
            </div>
          </div>

          {/* Campaign Name */}
          <h2 className="card-title text-2xl font-bold mb-2">
            {campaign.campaignName}
          </h2>

          {/* Visual Asset Groups Indicator */}
          <div className="mt-4 flex gap-1">
            {[...Array(Math.min(campaign.assetGroups.length, 5))].map((_, i) => (
              <div 
                key={i} 
                className="h-1.5 bg-primary flex-1 rounded-full"
              />
            ))}
            {campaign.assetGroups.length > 5 && (
              <div className="text-xs text-base-content/60 ml-2">
                +{campaign.assetGroups.length - 5} more
              </div>
            )}
          </div>

          {/* Next Arrow with Label */}
          <div className="flex items-center justify-end gap-2 mt-4 text-base-content/60">
            <span className="text-sm">View Asset Groups</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    ))
      )}
    </div>
  );
};

const AssetGroupsList = ({ assetGroups, onSelect }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {assetGroups.map((group) => {
      const firstImage = group.images[0];
      const firstHeadline = group.headlines[0]?.['Text Content'] || 'No headline';
      const firstDescription = group.descriptions[0]?.['Text Content'] || 'No description';
      const firstVideo = group.videos[0];

      return (
        <div 
          key={group.assetGroupId}
          className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow h-full flex flex-col"
        >
          <div className="card-body p-6 flex flex-col flex-1">
            {/* Status Badge */}
            <div className="absolute top-4 right-4 z-10">
              <span className={`badge ${
                group.assetGroupStatus === 'ENABLED' 
                  ? 'badge-success' 
                  : 'badge-error'
              }`}>
                {group.assetGroupStatus}
              </span>
            </div>

            {/* Media Preview */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-base-300 mb-4">
              {firstVideo ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${firstVideo['Video ID']}`}
                  title="Ad Preview"
                  allowFullScreen
                />
              ) : firstImage ? (
                <img 
                  src={firstImage['Image URL']} 
                  alt="Ad Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Ad Content */}
            <div className="space-y-3 flex-1">
              <h2 className="text-xl font-bold line-clamp-2">{firstHeadline}</h2>
              <p className="text-sm text-base-content/70 line-clamp-3">{firstDescription}</p>
            </div>

            {/* Asset Counts */}
            <div className="flex flex-wrap gap-2 mt-4 text-sm text-base-content/60">
              <div className="flex items-center gap-1 tooltip" data-tip="Headlines">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                </svg>
                {group.headlines.length}
              </div>
              <div className="flex items-center gap-1 tooltip" data-tip="Images">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                {group.images.length}
              </div>
              <div className="flex items-center gap-1 tooltip" data-tip="Videos">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                {group.videos?.length || 0}
              </div>
            </div>

            {/* Asset Group Name Button */}
            <button 
              onClick={() => onSelect(group)}
              className="btn btn-primary w-full mt-4"
            >
              {group.assetGroupName}
            </button>
          </div>
        </div>
      );
    })}
  </div>
);

const AssetGroupDetail = ({ assetGroup }) => {
  const { data: session } = useSession();
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockLevel, setBlockLevel] = useState('');
  const [blacklistedAssets, setBlacklistedAssets] = useState([]);
  const [pendingHeadlines, setPendingHeadlines] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);

  useEffect(() => {
    const fetchBlacklist = async () => {
      try {
        const response = await fetch('/api/assets/blacklist');
        if (response.ok) {
          const data = await response.json();
          console.log('Blacklisted assets:', data);
          setBlacklistedAssets(data);
        }
      } catch (error) {
        console.error('Error fetching blacklist:', error);
      }
    };
    fetchBlacklist();
  }, []);

  useEffect(() => {
    const fetchPendingHeadlines = async () => {
      setLoadingPending(true);
      try {
        const response = await fetch('/api/admin/headlines');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Filter pending headlines for this specific asset group
            const filteredHeadlines = data.data.filter(headline => 
              headline['Asset Group ID'] === assetGroup.assetGroupId
            );
            setPendingHeadlines(filteredHeadlines);
          }
        }
      } catch (error) {
        console.error('Error fetching pending headlines:', error);
      } finally {
        setLoadingPending(false);
      }
    };

    if (assetGroup?.assetGroupId) {
      fetchPendingHeadlines();
    }
  }, [assetGroup?.assetGroupId]);

  const isAssetBlocked = (asset) => {
    const assetId = String(asset['Asset ID']);
    return blacklistedAssets.some(blockedAsset => 
      String(blockedAsset.assetId) === assetId
    );
  };

  const headlines = assetGroup.headlines || [];
  const descriptions = assetGroup.descriptions || [];
  const images = assetGroup.images || [];
  const videos = assetGroup.videos || [];

  console.log('Admin assets:', {
    headlines: headlines.length,
    descriptions: descriptions.length,
    images: images.length,
    videos: videos.length
  });

  const handleBlockAsset = async (asset, blockLevel, reason) => {
    try {
      const response = await fetch('/api/assets/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset['Asset ID'],
          accountId: asset['Account ID'],
          campaignId: asset['Campaign ID'],
          assetGroupId: asset['Asset Group ID'],
          reason: reason,
          block_level: blockLevel,
          blockedBy: session?.user?.email,
          status: 'ACTIVE',
          assetType: asset['Asset Type']
        }),
      });

      if (response.ok) {
        // Refresh blacklist
        const blacklistResponse = await fetch('/api/assets/blacklist');
        if (blacklistResponse.ok) {
          const data = await blacklistResponse.json();
          setBlacklistedAssets(data);
        }
      }
    } catch (error) {
      console.error('Error blocking asset:', error);
    }
  };

  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    if (selectedAsset && blockReason && blockLevel) {
      await handleBlockAsset(selectedAsset, blockLevel, blockReason);
      setShowBlockModal(false);
      setSelectedAsset(null);
      setBlockReason('');
      setBlockLevel('');
    }
  };

  const handleDelete = (assetId) => {
    // Implement delete logic here
    console.log('Delete asset:', assetId);
  };

  const handleApproveHeadline = async (headlineId) => {
    try {
      const response = await fetch('/api/admin/headlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          headlineId: headlineId
        }),
      });

      if (response.ok) {
        // Remove the approved headline from pending list
        setPendingHeadlines(prev => prev.filter(h => h._id !== headlineId));
        // You might want to refresh the main headlines list here
      } else {
        console.error('Failed to approve headline');
      }
    } catch (error) {
      console.error('Error approving headline:', error);
    }
  };

  const handleRejectHeadline = async (headlineId) => {
    try {
      const response = await fetch('/api/admin/headlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          headlineId: headlineId
        }),
      });

      if (response.ok) {
        // Remove the rejected headline from pending list
        setPendingHeadlines(prev => prev.filter(h => h._id !== headlineId));
      } else {
        console.error('Failed to reject headline');
      }
    } catch (error) {
      console.error('Error rejecting headline:', error);
    }
  };

  return (
    <div className="space-y-8">
      {showBlockModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Block Asset</h3>
            <form onSubmit={handleBlockSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Block Level</span>
                </label>
                <select 
                  className="select select-bordered w-full" 
                  value={blockLevel}
                  onChange={(e) => setBlockLevel(e.target.value)}
                  required
                >
                  <option value="">Select block level</option>
                  <option value="account">Account</option>
                  <option value="campaign">Campaign</option>
                  <option value="assetgroup">Asset Group</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Reason</span>
                </label>
                <textarea 
                  className="textarea textarea-bordered h-24"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  required
                />
              </div>
              <div className="modal-action">
                <button type="submit" className="btn btn-primary">Block</button>
                <button 
                  type="button" 
                  className="btn"
                  onClick={() => {
                    setShowBlockModal(false);
                    setSelectedAsset(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Headlines Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Headlines</h2>
          
          {/* Short Headlines */}
          {assetGroup.shortHeadlines && assetGroup.shortHeadlines.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="badge badge-primary">Short Headlines</span>
                <span className="text-sm text-base-content/60">(≤30 characters)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assetGroup.shortHeadlines.map((headline, index) => (
                  <div key={index} className="card bg-base-200">
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start gap-2">
                        <p className="flex-1">{headline['Text Content']}</p>
                        {getPerformanceIcon(headline['Performance Label'])}
                      </div>
                      <div className="text-xs text-base-content/60 mt-2 flex items-center gap-2">
                        Asset ID: {headline['Asset ID']} • {headline['Text Content']?.length} chars
                        {session?.user?.role === 'admin' && (
                          <div className="flex items-center gap-2">
                            <button 
                              className="btn btn-ghost btn-xs p-0" 
                              onClick={() => {
                                setSelectedAsset(headline);
                                setShowBlockModal(true);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                            <button 
                              className="btn btn-ghost btn-xs p-0" 
                              onClick={() => handleDelete(headline['Asset ID'])}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Long Headlines */}
          {assetGroup.longHeadlines && assetGroup.longHeadlines.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="badge badge-secondary">Long Headlines</span>
                <span className="text-sm text-base-content/60">(&gt;30 characters)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assetGroup.longHeadlines.map((headline, index) => (
                  <div key={index} className="card bg-base-200">
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start gap-2">
                        <p className="flex-1">{headline['Text Content']}</p>
                        {getPerformanceIcon(headline['Performance Label'])}
                      </div>
                      <div className="text-xs text-base-content/60 mt-2 flex items-center gap-2">
                        Asset ID: {headline['Asset ID']} • {headline['Text Content']?.length} chars
                        {session?.user?.role === 'admin' && (
                          <div className="flex items-center gap-2">
                            <button 
                              className="btn btn-ghost btn-xs p-0" 
                              onClick={() => {
                                setSelectedAsset(headline);
                                setShowBlockModal(true);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                            <button 
                              className="btn btn-ghost btn-xs p-0" 
                              onClick={() => handleDelete(headline['Asset ID'])}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No headlines message */}
          {(!assetGroup.shortHeadlines || assetGroup.shortHeadlines.length === 0) && 
           (!assetGroup.longHeadlines || assetGroup.longHeadlines.length === 0) && (
            <p className="text-gray-500 italic">No headlines available</p>
          )}
        </div>
      </div>

      {/* Pending Headlines Section */}
      {pendingHeadlines.length > 0 && (
        <div className="card bg-base-100 shadow-xl border-l-4 border-warning">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="card-title text-warning">Pending Headlines</h2>
              <span className="badge badge-warning">{pendingHeadlines.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingHeadlines.map((headline, index) => (
                <div key={index} className="card bg-gray-300 border-2 border-dashed border-gray-400">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start gap-2">
                      <p className="flex-1 text-gray-600">{headline['Text Content']}</p>
                      <div className="tooltip" data-tip="Pending Approval">
                        <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                      <span>Asset ID: {headline['Asset ID']} • {headline['Text Content']?.length} chars</span>
                      <span className="badge badge-sm badge-warning">PENDING</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created by: {headline.createdBy}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button 
                        className="btn btn-success btn-xs flex-1"
                        onClick={() => handleApproveHeadline(headline._id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </button>
                      <button 
                        className="btn btn-error btn-xs flex-1"
                        onClick={() => handleRejectHeadline(headline._id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Descriptions Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Descriptions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {descriptions.map((desc, index) => (
              <div key={index} className="card bg-base-200">
                <div className="card-body p-4">
                  <div className="flex justify-between items-start gap-2">
                    <p className="flex-1">{desc['Text Content']}</p>
                    {getPerformanceIcon(desc['Performance Label'])}
                  </div>
                  <div className="text-xs text-base-content/60 mt-2 flex items-center gap-2">
                    Asset ID: {desc['Asset ID']}
                    {session?.user?.role === 'admin' && (
                      <div className="flex items-center gap-2">
                        <button 
                          className="btn btn-ghost btn-xs p-0" 
                          onClick={() => {
                            setSelectedAsset(desc);
                            setShowBlockModal(true);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                        <button 
                          className="btn btn-ghost btn-xs p-0" 
                          onClick={() => handleDelete(desc['Asset ID'])}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {descriptions.length === 0 && (
              <p className="text-gray-500 italic">No descriptions available</p>
            )}
          </div>
        </div>
      </div>

      {/* Images Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Images</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="card bg-base-200">
                <figure className="relative aspect-square">
                  {image['Image URL'] === 'View Image' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-base-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-base-content/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  ) : (
                    <img 
                      src={image['Image URL']} 
                      alt="Ad Preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                </figure>
                <div className="card-body p-3">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-base-content/60">
                      Asset ID: {image['Asset ID']}
                    </div>
                    <span className="text-xs badge badge-sm">
                      {image['Performance Label'] || 'No Label'}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    {getPerformanceIcon(image['Performance Label'])}
                    {session?.user?.role === 'admin' && (
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-ghost btn-xs p-0" 
                          onClick={() => {
                            setSelectedAsset(image);
                            setShowBlockModal(true);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                        <button 
                          className="btn btn-ghost btn-xs p-0" 
                          onClick={() => handleDelete(image['Asset ID'])}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Videos Section */}
      {assetGroup.videos && assetGroup.videos.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Videos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assetGroup.videos.map((video, index) => (
                <div key={index} className="card bg-base-200">
                  <div className="card-body p-4">
                    <div className="relative">
                      <div className="aspect-video rounded-lg overflow-hidden bg-base-300">
                        <iframe
                          className="w-full h-full"
                          src={`https://www.youtube.com/embed/${video['Video ID']}`}
                          title="Ad Preview"
                          allowFullScreen
                        />
                      </div>
                      <div className="absolute top-2 right-2">
                        {getPerformanceIcon(video['Performance Label'])}
                        {session?.user?.role === 'admin' && (
                          <div className="flex gap-2">
                            <button 
                              className="btn btn-ghost btn-xs p-0" 
                              onClick={() => {
                                setSelectedAsset(video);
                                setShowBlockModal(true);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                            <button 
                              className="btn btn-ghost btn-xs p-0" 
                              onClick={() => handleDelete(video['Asset ID'])}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="font-medium">
                        {video['Video Title']}
                      </h3>
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-xs text-base-content/60">
                          Asset ID: {video['Asset ID']}
                        </div>
                        <span className="text-xs badge badge-sm">
                          {video['Performance Label'] || 'No Label'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Call to Actions Section */}
      {assetGroup.callToActions && assetGroup.callToActions.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Call to Actions</h2>
            <div className="flex flex-wrap gap-4">
              {assetGroup.callToActions.map((cta, index) => (
                <div key={index} className="badge badge-primary badge-lg">
                  {cta['Text Content']}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Final URL */}
      {assetGroup.finalUrl && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Landing Page URL</h2>
            <a 
              href={assetGroup.finalUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="link link-primary"
            >
              {assetGroup.finalUrl}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};