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
const CampaignsList = ({ campaigns, onSelect }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {campaigns.map((campaign) => (
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
    ))}
  </div>
);

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
  const [blacklistedAssets, setBlacklistedAssets] = useState([]);

  useEffect(() => {
    console.log('Initial assetGroup:', {
      headlines: assetGroup?.headlines || [],
      descriptions: assetGroup?.descriptions || [],
      images: assetGroup?.images || [],
      videos: assetGroup?.videos || []
    });
  }, [assetGroup]);

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

  const isAssetBlocked = (asset) => {
    const assetId = String(asset['Asset ID']);
    const blocked = blacklistedAssets.some(blockedAsset => 
      String(blockedAsset.assetId) === assetId
    );
    if (blocked) {
      console.log('Asset blocked:', assetId);
    }
    return blocked;
  };

  const filteredHeadlines = assetGroup?.headlines?.filter(headline => !isAssetBlocked(headline)) || [];
  const filteredDescriptions = assetGroup?.descriptions?.filter(desc => !isAssetBlocked(desc)) || [];
  const filteredImages = assetGroup?.images?.filter(image => !isAssetBlocked(image)) || [];
  const filteredVideos = assetGroup?.videos?.filter(video => !isAssetBlocked(video)) || [];

  console.log('Filtered assets:', {
    headlines: filteredHeadlines.length,
    descriptions: filteredDescriptions.length,
    images: filteredImages.length,
    videos: filteredVideos.length
  });

  return (
    <div className="space-y-8">
      {/* Headlines Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Headlines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHeadlines.map((headline, index) => (
              <div key={index} className="card bg-base-200">
                <div className="card-body p-4">
                  <div className="flex justify-between items-start gap-2">
                    <p className="flex-1">{headline['Text Content']}</p>
                    {getPerformanceIcon(headline['Performance Label'])}
                  </div>
                  <div className="text-xs text-base-content/60 mt-2">
                    Asset ID: {headline['Asset ID']}
                  </div>
                </div>
              </div>
            ))}
            {filteredHeadlines.length === 0 && (
              <p className="text-gray-500 italic">No headlines available</p>
            )}
          </div>
        </div>
      </div>

      {/* Descriptions Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Descriptions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDescriptions.map((desc, index) => (
              <div key={index} className="card bg-base-200">
                <div className="card-body p-4">
                  <div className="flex justify-between items-start gap-2">
                    <p className="flex-1">{desc['Text Content']}</p>
                    {getPerformanceIcon(desc['Performance Label'])}
                  </div>
                  <div className="text-xs text-base-content/60 mt-2">
                    Asset ID: {desc['Asset ID']}
                  </div>
                </div>
              </div>
            ))}
            {filteredDescriptions.length === 0 && (
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
            {filteredImages.map((image, index) => (
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
                      alt={`Marketing Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-2 right-2">
                    {getPerformanceIcon(image['Performance Label'])}
                  </div>
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Videos Section */}
      {filteredVideos && filteredVideos.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Videos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video, index) => (
                <div key={index} className="card bg-base-200">
                  <div className="card-body p-4">
                    <div className="relative">
                      <div className="aspect-video rounded-lg overflow-hidden bg-base-300">
                        <iframe
                          className="w-full h-full"
                          src={`https://www.youtube.com/embed/${video['Video ID']}`}
                          title={video['Video Title']}
                          allowFullScreen
                        />
                      </div>
                      <div className="absolute top-2 right-2">
                        {getPerformanceIcon(video['Performance Label'])}
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