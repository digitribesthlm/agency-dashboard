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

const AssetGroupsList = ({ assetGroups, onSelect }) => {
  const [showRemoved, setShowRemoved] = useState(false);
  
  const filteredAssetGroups = assetGroups.map(group => ({
    ...group,
    headlines: group.headlines || [],
    descriptions: group.descriptions || [],
    images: group.images || [],
    videos: group.videos || []
  }));

  // Filter out REMOVED asset groups unless showRemoved is true
  const displayAssetGroups = showRemoved 
    ? filteredAssetGroups 
    : filteredAssetGroups.filter(group => group.assetGroupStatus !== 'REMOVED');

  const assetGroupVideos = filteredAssetGroups.map(group => group.videos || []);
  const videoCounts = assetGroupVideos.map(videos => videos.length);

  const removedCount = filteredAssetGroups.filter(group => group.assetGroupStatus === 'REMOVED').length;

  return (
    <div>
      {/* Filter Controls */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          Asset Groups ({displayAssetGroups.length})
        </h2>
        <div className="flex items-center gap-3">
          {removedCount > 0 && (
            <span className="text-sm text-base-content/60">
              {removedCount} removed
            </span>
          )}
          <div className="form-control">
            <label className="label cursor-pointer gap-2">
              <span className="label-text">Show Removed</span>
              <input 
                type="checkbox" 
                className="toggle toggle-primary" 
                checked={showRemoved}
                onChange={(e) => setShowRemoved(e.target.checked)}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayAssetGroups.map((group, index) => (
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
                  : group.assetGroupStatus === 'REMOVED'
                  ? 'badge-neutral'
                  : 'badge-error'
              }`}>
                {group.assetGroupStatus}
              </span>
            </div>

            {/* Media Preview */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-base-300 mb-4">
              {assetGroupVideos[index] && assetGroupVideos[index].length > 0 ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${assetGroupVideos[index][0]['Video ID']}`}
                  title="Ad Preview"
                  allowFullScreen
                />
              ) : group.images && group.images.length > 0 ? (
                <img 
                  src={group.images[0]['Image URL']} 
                  alt="Ad Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-base-content/30">
                  No preview available
                </div>
              )}
            </div>

            {/* Ad Content */}
            <div className="space-y-3 flex-1">
              <h2 className="text-xl font-bold line-clamp-2">
                {group.shortHeadlines?.[0]?.['Text Content'] || 
                 group.longHeadlines?.[0]?.['Text Content'] || 
                 'No headline'}
              </h2>
              <p className="text-sm text-base-content/70 line-clamp-3">{group.descriptions[0]?.['Text Content'] || 'No description'}</p>
            </div>

            {/* Asset Counts */}
            <div className="flex items-center gap-2 mt-4 text-sm text-base-content/60">
              <span>—</span>
              <span>{(group.shortHeadlines?.length || 0) + (group.longHeadlines?.length || 0)}</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              <span>{group.images.length}</span>
              <span>•</span>
              <span>{videoCounts[index]}</span>
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
      ))}
      </div>
    </div>
  );
};

const AssetGroupDetail = ({ assetGroup }) => {
  const [newHeadline, setNewHeadline] = useState('');
  const [newLongHeadline, setNewLongHeadline] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddLongHeadlineForm, setShowAddLongHeadlineForm] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [showAddDescriptionForm, setShowAddDescriptionForm] = useState(false);
  const [newLandingPage, setNewLandingPage] = useState('');
  const [showAddLandingPageForm, setShowAddLandingPageForm] = useState(false);
  const [pausedImages, setPausedImages] = useState([]);
  const [pausedVideos, setPausedVideos] = useState([]);
  const [pausedHeadlines, setPausedHeadlines] = useState([]);
  const [pausedDescriptions, setPausedDescriptions] = useState([]);
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [availableImages, setAvailableImages] = useState([]);
  const [availableVideos, setAvailableVideos] = useState([]);
  const [changesHistory, setChangesHistory] = useState([]);
  const [showChangesHistory, setShowChangesHistory] = useState(false);
  const [pendingHeadlines, setPendingHeadlines] = useState([]);
  const [pendingDescriptions, setPendingDescriptions] = useState([]);
  const [pendingLandingPages, setPendingLandingPages] = useState([]);
  
  console.log('AssetGroupDetail rendering with assetGroup:', assetGroup?.assetGroupName);
  
  const filteredHeadlines = assetGroup?.headlines || [];
  const filteredDescriptions = assetGroup?.descriptions || [];
  const filteredImages = assetGroup?.images || [];
  const filteredVideos = assetGroup?.videos || [];

  // Fetch changes history and pending content when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (!assetGroup?.assetGroupId) return;
      
      try {
        console.log('Fetching data for asset group:', assetGroup.assetGroupId);
        
        // Fetch changes history
        const changesResponse = await fetch(`/api/changes?assetGroupId=${assetGroup.assetGroupId}`);
        if (changesResponse.ok) {
          const changesData = await changesResponse.json();
          console.log('Fetched changes data:', changesData);
          if (changesData.success) {
            setChangesHistory(changesData.data);
          }
        }
        
        // Fetch pending headlines
        const headlinesResponse = await fetch(`/api/headlines?assetGroupId=${assetGroup.assetGroupId}`);
        if (headlinesResponse.ok) {
          const headlinesData = await headlinesResponse.json();
          if (headlinesData.success) {
            setPendingHeadlines(headlinesData.data);
          }
        }
        
        // Fetch pending descriptions
        const descriptionsResponse = await fetch(`/api/descriptions?assetGroupId=${assetGroup.assetGroupId}`);
        if (descriptionsResponse.ok) {
          const descriptionsData = await descriptionsResponse.json();
          if (descriptionsData.success) {
            setPendingDescriptions(descriptionsData.data);
          }
        }
        
        // Fetch pending landing pages
        const landingPagesResponse = await fetch(`/api/landing-pages?assetGroupId=${assetGroup.assetGroupId}`);
        if (landingPagesResponse.ok) {
          const landingPagesData = await landingPagesResponse.json();
          if (landingPagesData.success) {
            setPendingLandingPages(landingPagesData.data);
          }
        }
        
        // Fetch available images for library
        const imagesResponse = await fetch('/api/images?all=true');
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          if (imagesData.success) {
            setAvailableImages(imagesData.data);
          }
        }
        
        // Fetch available videos for library
        const videosResponse = await fetch('/api/videos?all=true');
        if (videosResponse.ok) {
          const videosData = await videosResponse.json();
          if (videosData.success) {
            setAvailableVideos(videosData.data);
          }
        }
        
        // Fetch current paused status for all asset types
        const statusResponse = await fetch(`/api/asset-status?assetGroupId=${assetGroup.assetGroupId}&campaignId=${campaign.campaignId}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.success) {
            setPausedHeadlines(statusData.data.pausedHeadlines || []);
            setPausedDescriptions(statusData.data.pausedDescriptions || []);
            setPausedImages(statusData.data.pausedImages || []);
            setPausedVideos(statusData.data.pausedVideos || []);
          }
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [assetGroup?.assetGroupId]);



  const handleAddHeadline = async () => {
    if (!newHeadline.trim()) return;
    
    console.log('Adding headline with assetGroup:', assetGroup);
    
    try {
      const response = await fetch('/api/headlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: newHeadline.trim(),
          assetGroupId: assetGroup.assetGroupId,
          campaignId: assetGroup.campaignId || 'unknown',
          accountId: assetGroup.accountId || 1
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // Add the new headline to the pending headlines state immediately
        const newHeadlineData = {
          'Asset ID': responseData.data.assetId,
          'Text Content': newHeadline.trim(),
          'Asset Type': 'TEXT',
          'Field Type': 'HEADLINE',
          'Performance Label': 'PENDING',
          'Campaign ID': assetGroup.campaignId || 'unknown',
          'Asset Group ID': assetGroup.assetGroupId,
          'Account ID': assetGroup.accountId || 1,
          'isPending': true,
          'createdBy': 'current_user',
          'createdAt': new Date(),
          'approved': false
        };
        
        setPendingHeadlines(prev => [...prev, newHeadlineData]);
        setNewHeadline('');
        setShowAddForm(false);
        
        // Refresh from server
        const headlinesResponse = await fetch(`/api/headlines?assetGroupId=${assetGroup.assetGroupId}`);
        if (headlinesResponse.ok) {
          const headlinesData = await headlinesResponse.json();
          if (headlinesData.success) {
            setPendingHeadlines(headlinesData.data);
          }
        }
        
        // Refresh changes history
        const changesResponse = await fetch(`/api/changes?assetGroupId=${assetGroup.assetGroupId}`);
        if (changesResponse.ok) {
          const changesData = await changesResponse.json();
          if (changesData.success) {
            setChangesHistory(changesData.data);
          }
        }
      } else {
        console.error('Failed to add headline');
      }
    } catch (error) {
      console.error('Error adding headline:', error);
    }
  };

  const handleAddLongHeadline = async () => {
    if (!newLongHeadline.trim()) return;
    
    console.log('Adding long headline with assetGroup:', assetGroup);
    
    try {
      const response = await fetch('/api/headlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: newLongHeadline.trim(),
          assetGroupId: assetGroup.assetGroupId,
          campaignId: assetGroup.campaignId || 'unknown',
          accountId: assetGroup.accountId || 1,
          fieldType: 'LONG_HEADLINE'
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // Add the new long headline to the pending headlines state immediately
        const newLongHeadlineData = {
          'Asset ID': responseData.data.assetId,
          'Text Content': newLongHeadline.trim(),
          'Asset Type': 'TEXT',
          'Field Type': 'LONG_HEADLINE',
          'Performance Label': 'PENDING',
          'Campaign ID': assetGroup.campaignId || 'unknown',
          'Asset Group ID': assetGroup.assetGroupId,
          'Account ID': assetGroup.accountId || 1,
          'isPending': true,
          'createdBy': 'current_user',
          'createdAt': new Date(),
          'approved': false
        };
        
        setPendingHeadlines(prev => [...prev, newLongHeadlineData]);
        setNewLongHeadline('');
        setShowAddLongHeadlineForm(false);
        
        // Refresh from server
        const headlinesResponse = await fetch(`/api/headlines?assetGroupId=${assetGroup.assetGroupId}`);
        if (headlinesResponse.ok) {
          const headlinesData = await headlinesResponse.json();
          if (headlinesData.success) {
            setPendingHeadlines(headlinesData.data);
          }
        }
        
        // Refresh changes history
        const changesResponse = await fetch(`/api/changes?assetGroupId=${assetGroup.assetGroupId}`);
        if (changesResponse.ok) {
          const changesData = await changesResponse.json();
          if (changesData.success) {
            setChangesHistory(changesData.data);
          }
        }
      } else {
        console.error('Failed to add long headline');
      }
    } catch (error) {
      console.error('Error adding long headline:', error);
    }
  };



  const handleAddLandingPage = async () => {
    if (!newLandingPage.trim()) return;
    
    try {
      const response = await fetch('/api/landing-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: newLandingPage.trim(),
          assetGroupId: assetGroup.assetGroupId,
          campaignId: assetGroup.campaignId,
          accountId: assetGroup.accountId || 1
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        
        const newLandingPageData = {
          'Landing Page ID': responseData.data.landingPageId,
          'Final URL': newLandingPage.trim(),
          'Campaign ID': assetGroup.campaignId || 'unknown',
          'Asset Group ID': assetGroup.assetGroupId,
          'Account ID': assetGroup.accountId || 1,
          'isPending': true,
          'createdBy': 'current_user',
          'createdAt': new Date(),
          'approved': false
        };
        
        setPendingLandingPages(prev => [...prev, newLandingPageData]);
        setNewLandingPage('');
        setShowAddLandingPageForm(false);
        
        // Refresh changes history
        const changesResponse = await fetch(`/api/changes?assetGroupId=${assetGroup.assetGroupId}`);
        if (changesResponse.ok) {
          const changesData = await changesResponse.json();
          if (changesData.success) {
            setChangesHistory(changesData.data);
          }
        }
      } else {
        console.error('Failed to add landing page');
      }
    } catch (error) {
      console.error('Error adding landing page:', error);
    }
  };

  const handlePauseHeadline = async (headlineId) => {
    try {
      const response = await fetch('/api/asset-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'pause',
          assetType: 'headline',
          assetId: headlineId,
          assetGroupId: assetGroup.assetGroupId,
          campaignId: assetGroup.campaignId,
          accountId: assetGroup.accountId || 1
        }),
      });

      if (response.ok) {
        setPausedHeadlines(prev => [...prev, headlineId]);
      } else {
        console.error('Failed to pause headline');
      }
    } catch (error) {
      console.error('Error pausing headline:', error);
    }
  };

  const handleResumeHeadline = async (headlineId) => {
    try {
      const response = await fetch('/api/asset-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resume',
          assetType: 'headline',
          assetId: headlineId,
          assetGroupId: assetGroup.assetGroupId,
          campaignId: assetGroup.campaignId,
          accountId: assetGroup.accountId || 1
        }),
      });

      if (response.ok) {
        setPausedHeadlines(prev => prev.filter(id => id !== headlineId));
      } else {
        console.error('Failed to resume headline');
      }
    } catch (error) {
      console.error('Error resuming headline:', error);
    }
  };

  const handlePauseDescription = async (descriptionId) => {
    try {
      const response = await fetch('/api/asset-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'pause',
          assetType: 'description',
          assetId: descriptionId,
          assetGroupId: assetGroup.assetGroupId,
          campaignId: assetGroup.campaignId,
          accountId: assetGroup.accountId || 1
        }),
      });

      if (response.ok) {
        setPausedDescriptions(prev => [...prev, descriptionId]);
      } else {
        console.error('Failed to pause description');
      }
    } catch (error) {
      console.error('Error pausing description:', error);
    }
  };

  const handleResumeDescription = async (descriptionId) => {
    try {
      const response = await fetch('/api/asset-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resume',
          assetType: 'description',
          assetId: descriptionId,
          assetGroupId: assetGroup.assetGroupId,
          campaignId: assetGroup.campaignId,
          accountId: assetGroup.accountId || 1
        }),
      });

      if (response.ok) {
        setPausedDescriptions(prev => prev.filter(id => id !== descriptionId));
      } else {
        console.error('Failed to resume description');
      }
    } catch (error) {
      console.error('Error resuming description:', error);
    }
  };

  const handleRemoveHeadline = async (headlineId) => {
    try {
      const response = await fetch('/api/asset-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          assetType: 'headline',
          assetId: headlineId,
          assetGroupId: assetGroup.assetGroupId,
          campaignId: assetGroup.campaignId,
          accountId: assetGroup.accountId || 1
        }),
      });

      if (response.ok) {
        // Remove from paused list if it was paused
        setPausedHeadlines(prev => prev.filter(id => id !== headlineId));
        // Note: The asset will be filtered out by the API on next refresh
      } else {
        console.error('Failed to remove headline');
      }
    } catch (error) {
      console.error('Error removing headline:', error);
    }
  };

  const handleRemoveDescription = async (descriptionId) => {
    try {
      const response = await fetch('/api/asset-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          assetType: 'description',
          assetId: descriptionId,
          assetGroupId: assetGroup.assetGroupId,
          campaignId: assetGroup.campaignId,
          accountId: assetGroup.accountId || 1
        }),
      });

      if (response.ok) {
        // Remove from paused list if it was paused
        setPausedDescriptions(prev => prev.filter(id => id !== descriptionId));
        // Note: The asset will be filtered out by the API on next refresh
      } else {
        console.error('Failed to remove description');
      }
    } catch (error) {
      console.error('Error removing description:', error);
    }
  };

  const handlePauseImage = async (imageId) => {
    try {
      const response = await fetch('/api/asset-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'pause',
          assetType: 'image',
          assetId: imageId,
          assetGroupId: assetGroup.assetGroupId,
          campaignId: assetGroup.campaignId,
          accountId: assetGroup.accountId || 1
        }),
      });

      if (response.ok) {
        setPausedImages(prev => [...prev, imageId]);
      } else {
        console.error('Failed to pause image');
      }
    } catch (error) {
      console.error('Error pausing image:', error);
    }
  };

  const handleRemoveImage = async (imageId) => {
    try {
      const response = await fetch('/api/asset-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          assetType: 'image',
          assetId: imageId,
          assetGroupId: assetGroup.assetGroupId,
          campaignId: assetGroup.campaignId,
          accountId: assetGroup.accountId || 1
        }),
      });

      if (response.ok) {
        setPausedImages(prev => prev.filter(id => id !== imageId));
        window.location.reload();
      } else {
        console.error('Failed to remove image');
      }
    } catch (error) {
      console.error('Error removing image:', error);
    }
  };

  const handlePauseVideo = async (videoId) => {
    try {
      const response = await fetch('/api/asset-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'pause',
          assetType: 'video',
          assetId: videoId,
          assetGroupId: assetGroup.assetGroupId,
          campaignId: assetGroup.campaignId,
          accountId: assetGroup.accountId || 1
        }),
      });

      if (response.ok) {
        setPausedVideos(prev => [...prev, videoId]);
      } else {
        console.error('Failed to pause video');
      }
    } catch (error) {
      console.error('Error pausing video:', error);
    }
  };

  const handleResumeVideo = async (videoId) => {
    try {
      const response = await fetch('/api/asset-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resume',
          assetType: 'video',
          assetId: videoId,
          assetGroupId: assetGroup.assetGroupId,
          campaignId: assetGroup.campaignId,
          accountId: assetGroup.accountId || 1
        }),
      });

      if (response.ok) {
        setPausedVideos(prev => prev.filter(id => id !== videoId));
      } else {
        console.error('Failed to resume video');
      }
    } catch (error) {
      console.error('Error resuming video:', error);
    }
  };

  const handleAddVideoFromLibrary = async () => {
    if (selectedVideo) {
      try {
        const response = await fetch('/api/videos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoId: selectedVideo['Video ID'],
            videoTitle: selectedVideo['Video Title'],
            assetGroupId: assetGroup.assetGroupId,
            campaignId: assetGroup.campaignId,
            accountId: assetGroup.accountId || 1
          }),
        });

        if (response.ok) {
          setShowVideoLibrary(false);
          setSelectedVideo(null);
          window.location.reload();
        } else {
          console.error('Failed to add video');
        }
      } catch (error) {
        console.error('Error adding video:', error);
      }
    }
  };

  const handleAddImageFromLibrary = async () => {
    if (selectedImage) {
      try {
        const response = await fetch('/api/images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: selectedImage['Image URL'],
            assetGroupId: assetGroup.assetGroupId,
            campaignId: assetGroup.campaignId,
            accountId: assetGroup.accountId || 1
          }),
        });

        if (response.ok) {
          setShowImageLibrary(false);
          setSelectedImage(null);
          window.location.reload();
        } else {
          console.error('Failed to add image');
        }
      } catch (error) {
        console.error('Error adding image:', error);
      }
    }
  };

  const handleAddDescription = async () => {
    if (!newDescription.trim()) return;
    
    try {
      const response = await fetch('/api/descriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: newDescription.trim(),
          assetGroupId: assetGroup.assetGroupId,
          campaignId: assetGroup.campaignId,
          accountId: assetGroup.accountId || 1
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // Add the new description to the pending descriptions state immediately
        const newDescriptionData = {
          'Asset ID': responseData.data.assetId,
          'Text Content': newDescription.trim(),
          'Asset Type': 'TEXT',
          'Field Type': 'DESCRIPTION',
          'Performance Label': 'PENDING',
          'Campaign ID': assetGroup.campaignId || 'unknown',
          'Asset Group ID': assetGroup.assetGroupId,
          'Account ID': assetGroup.accountId || 1,
          'isPending': true,
          'createdBy': 'current_user',
          'createdAt': new Date(),
          'approved': false
        };
        
        setPendingDescriptions(prev => [...prev, newDescriptionData]);
        setNewDescription('');
        setShowAddDescriptionForm(false);
        
        // Also refresh from server to get the complete data
        const descriptionsResponse = await fetch(`/api/descriptions?assetGroupId=${assetGroup.assetGroupId}`);
        if (descriptionsResponse.ok) {
          const descriptionsData = await descriptionsResponse.json();
          if (descriptionsData.success) {
            setPendingDescriptions(descriptionsData.data);
          }
        }
        
        // Refresh changes history
        const changesResponse = await fetch(`/api/changes?assetGroupId=${assetGroup.assetGroupId}`);
        if (changesResponse.ok) {
          const changesData = await changesResponse.json();
          if (changesData.success) {
            setChangesHistory(changesData.data);
          }
        }
      } else {
        console.error('Failed to add description');
      }
    } catch (error) {
      console.error('Error adding description:', error);
    }
  };



  const renderVideoThumbnail = (video, index) => {
    if (!video) return null;
    
    const isPaused = pausedVideos.includes(video['Asset ID']);
    
    return (
      <div key={index} className={`card ${isPaused ? 'bg-gray-300 opacity-60' : 'bg-base-200'}`}>
        <figure className="aspect-video">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${video['Video ID']}`}
            title={video['Video Title'] || 'Video'}
            allowFullScreen
          />
        </figure>
        <div className="card-body p-4">
          <h3 className="font-medium text-sm">
            {video['Video Title'] || 'Video'}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-base-content/60">
              Asset ID: {video['Asset ID']}
            </span>
            <div className="flex items-center gap-2">
              {getPerformanceIcon(video['Performance Label'])}
              {isPaused ? (
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => handleResumeVideo(video['Asset ID'])}
                >
                  Resume
                </button>
              ) : (
                <button
                  className="btn btn-sm btn-warning"
                  onClick={() => handlePauseVideo(video['Asset ID'])}
                >
                  Pause
                </button>
              )}
            </div>
          </div>
          {isPaused && (
            <div className="badge badge-warning badge-sm mt-2">PAUSED</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <h1>Asset Group: {assetGroup?.assetGroupName}</h1>
      
      {/* Headlines Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">Headlines</h2>
            <div className="flex gap-2">
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                Add Short Headline
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddLongHeadlineForm(!showAddLongHeadlineForm)}
              >
                Add Long Headline
              </button>
            </div>
          </div>

          {/* Add Short Headline Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-base-200 rounded-lg">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">New Short Headline</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Enter your short headline text (≤30 characters)..."
                  value={newHeadline}
                  onChange={(e) => setNewHeadline(e.target.value)}
                  maxLength={30}
                  rows={2}
                />
                <div className="text-xs text-base-content/60 mt-1">
                  Character count: {newHeadline.length} / 30
                </div>
                <div className="flex gap-2 mt-3">
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={handleAddHeadline}
                    disabled={!newHeadline.trim() || newHeadline.length > 30}
                  >
                    Add Short Headline
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewHeadline('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Long Headline Form */}
          {showAddLongHeadlineForm && (
            <div className="mb-6 p-4 bg-base-200 rounded-lg">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">New Long Headline</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Enter your long headline text (>30 characters)..."
                  value={newLongHeadline}
                  onChange={(e) => setNewLongHeadline(e.target.value)}
                  maxLength={90}
                  rows={3}
                />
                <div className="text-xs text-base-content/60 mt-1">
                  Character count: {newLongHeadline.length} / 90
                </div>
                <div className="flex gap-2 mt-3">
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddLongHeadline}
                    disabled={!newLongHeadline.trim() || newLongHeadline.length > 90}
                  >
                    Add Long Headline
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setShowAddLongHeadlineForm(false);
                      setNewLongHeadline('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Short Headlines */}
          {assetGroup.shortHeadlines && assetGroup.shortHeadlines.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="badge badge-primary">Short Headlines</span>
                <span className="text-sm text-base-content/60">(HEADLINE field type)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assetGroup.shortHeadlines.map((headline, index) => (
                  <div key={index} className="card bg-base-200">
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start gap-2">
                        <p className="flex-1">{headline['Text Content']}</p>
                        <div className="flex items-center gap-2">
                          {getPerformanceIcon(headline['Performance Label'])}
                          <div className="flex gap-1">
                            {pausedHeadlines.includes(headline['Asset ID']) ? (
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleResumeHeadline(headline['Asset ID'])}
                              >
                                Resume
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-warning"
                                onClick={() => handlePauseHeadline(headline['Asset ID'])}
                              >
                                Pause
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => handleRemoveHeadline(headline['Asset ID'])}
                              title="Remove headline"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-base-content/60 mt-2">
                        Asset ID: {headline['Asset ID']} • {headline['Text Content']?.length} chars
                        {pausedHeadlines.includes(headline['Asset ID']) && (
                          <span className="badge badge-warning badge-sm ml-2">PAUSED</span>
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
                <span className="text-sm text-base-content/60">(LONG_HEADLINE field type)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assetGroup.longHeadlines.map((headline, index) => (
                  <div key={index} className="card bg-base-200">
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start gap-2">
                        <p className="flex-1">{headline['Text Content']}</p>
                        <div className="flex items-center gap-2">
                          {getPerformanceIcon(headline['Performance Label'])}
                          <div className="flex gap-1">
                            {pausedHeadlines.includes(headline['Asset ID']) ? (
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleResumeHeadline(headline['Asset ID'])}
                              >
                                Resume
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-warning"
                                onClick={() => handlePauseHeadline(headline['Asset ID'])}
                              >
                                Pause
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => handleRemoveHeadline(headline['Asset ID'])}
                              title="Remove headline"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-base-content/60 mt-2">
                        Asset ID: {headline['Asset ID']} • {headline['Text Content']?.length} chars
                        {pausedHeadlines.includes(headline['Asset ID']) && (
                          <span className="badge badge-warning badge-sm ml-2">PAUSED</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Headlines */}
          {pendingHeadlines.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="badge badge-warning">Pending Headlines</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingHeadlines.map((headline, index) => (
                  <div key={`pending-${index}`} className="card bg-gray-300 border-2 border-dashed border-gray-400">
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start gap-2">
                        <p className="flex-1 text-gray-600">{headline['Text Content']}</p>
                        <div className="tooltip" data-tip="Pending Approval">
                          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                        <span>Asset ID: {headline['Asset ID']} • {headline['Text Content']?.length} chars</span>
                        <span className="badge badge-sm badge-warning">PENDING</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Created: {new Date(headline.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No headlines message */}
          {(!assetGroup.shortHeadlines || assetGroup.shortHeadlines.length === 0) && 
           (!assetGroup.longHeadlines || assetGroup.longHeadlines.length === 0) && 
           pendingHeadlines.length === 0 && (
            <p className="text-gray-500 italic">No headlines available</p>
          )}
        </div>
      </div>

      {/* Descriptions Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Descriptions</h2>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddDescriptionForm(!showAddDescriptionForm)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Description
            </button>
          </div>

          {/* Add Description Form */}
          {showAddDescriptionForm && (
            <div className="mb-6 p-4 bg-base-200 rounded-lg">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">New Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Enter your description text..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2 mt-3">
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={handleAddDescription}
                    disabled={!newDescription.trim()}
                  >
                    Add Description
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setShowAddDescriptionForm(false);
                      setNewDescription('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Approved Descriptions */}
            {filteredDescriptions.map((desc, index) => (
              <div key={index} className="card bg-base-200">
                <div className="card-body p-4">
                  <div className="flex justify-between items-start gap-2">
                    <p className="flex-1">{desc['Text Content']}</p>
                    <div className="flex items-center gap-2">
                    {getPerformanceIcon(desc['Performance Label'])}
                      <div className="flex gap-1">
                        {pausedDescriptions.includes(desc['Asset ID']) ? (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleResumeDescription(desc['Asset ID'])}
                          >
                            Resume
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handlePauseDescription(desc['Asset ID'])}
                          >
                            Pause
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-error"
                          onClick={() => handleRemoveDescription(desc['Asset ID'])}
                          title="Remove description"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-base-content/60 mt-2">
                    Asset ID: {desc['Asset ID']}
                    {pausedDescriptions.includes(desc['Asset ID']) && (
                      <span className="badge badge-warning badge-sm ml-2">PAUSED</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Pending Descriptions (Light Gray) */}
            {pendingDescriptions.map((desc, index) => (
              <div key={`pending-desc-${index}`} className="card bg-gray-300 border-2 border-dashed border-gray-400">
                <div className="card-body p-4">
                  <div className="flex justify-between items-start gap-2">
                    <p className="flex-1 text-gray-600">{desc['Text Content']}</p>
                    <div className="tooltip" data-tip="Pending Approval">
                      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                    <span>Asset ID: {desc['Asset ID']}</span>
                    <span className="badge badge-sm badge-warning">PENDING</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Created: {new Date(desc.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}

            {filteredDescriptions.length === 0 && pendingDescriptions.length === 0 && (
              <p className="text-gray-500 italic">No descriptions available</p>
            )}
          </div>
        </div>
      </div>



      {/* Images Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Images</h2>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowImageLibrary(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add from Library
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredImages.map((image, index) => {
              const isPaused = pausedImages.includes(image['Asset ID']);
              return (
                <div key={index} className={`card ${isPaused ? 'bg-gray-300 opacity-60' : 'bg-base-200'}`}>
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
                    {isPaused && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">PAUSED</span>
                      </div>
                    )}
                </figure>
                <div className="card-body p-3">
                    <div className="flex justify-between items-center mb-2">
                    <div className="text-xs text-base-content/60">
                      Asset ID: {image['Asset ID']}
                    </div>
                    <span className="text-xs badge badge-sm">
                      {image['Performance Label'] || 'No Label'}
                    </span>
                  </div>
                    <div className="flex gap-1">
                      <button 
                        className={`btn btn-xs flex-1 ${isPaused ? 'btn-success' : 'btn-warning'}`}
                        onClick={() => isPaused ? handleRemoveImage(image['Asset ID']) : handlePauseImage(image['Asset ID'])}
                      >
                        {isPaused ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M15 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Resume
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pause
                          </>
                        )}
                      </button>
                      <button 
                        className="btn btn-error btn-xs"
                        onClick={() => handlePauseImage(image['Asset ID'])}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                </div>
              </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Videos Section */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">Videos</h2>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowVideoLibrary(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add from Library
            </button>
          </div>
          
          {filteredVideos && filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video, index) => (
                renderVideoThumbnail(video, index)
            ))}
          </div>
          ) : (
            <p className="text-gray-500 italic">No videos available</p>
          )}
        </div>
      </div>

      {/* Video Library Modal */}
      {showVideoLibrary && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">Video Library</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {availableVideos.map((video) => (
                <div 
                  key={video['Asset ID']} 
                  className={`card cursor-pointer transition-all ${selectedVideo?.['Asset ID'] === video['Asset ID'] ? 'ring-2 ring-primary' : 'hover:shadow-lg'}`}
                  onClick={() => setSelectedVideo(video)}
                >
                  <figure className="aspect-video">
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${video['Video ID']}`}
                      title="Video Preview"
                      allowFullScreen
                    />
                  </figure>
                  <div className="card-body p-3">
                    <h4 className="font-medium text-sm">{video['Video Title'] || 'Untitled Video'}</h4>
                    <p className="text-xs text-base-content/60">Asset ID: {video['Asset ID']}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-action">
              <button 
                className="btn btn-primary"
                onClick={handleAddVideoFromLibrary}
                disabled={!selectedVideo}
              >
                Add Selected Video
              </button>
              <button 
                className="btn"
                onClick={() => {
                  setShowVideoLibrary(false);
                  setSelectedVideo(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Library Modal */}
      {showImageLibrary && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">Image Library</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {availableImages.map((image) => (
                <div 
                  key={image['Asset ID']} 
                  className={`card cursor-pointer transition-all ${selectedImage?.['Asset ID'] === image['Asset ID'] ? 'ring-2 ring-primary' : 'hover:shadow-lg'}`}
                  onClick={() => setSelectedImage(image)}
                >
                  <figure className="aspect-square">
                    {image['Image URL'] === 'View Image' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-base-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-base-content/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    ) : (
                      <img 
                        src={image['Image URL']} 
                        alt="Library Image"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </figure>
                  <div className="card-body p-3">
                    <p className="text-xs text-base-content/60">Asset ID: {image['Asset ID']}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-action">
              <button 
                className="btn btn-primary"
                onClick={handleAddImageFromLibrary}
                disabled={!selectedImage}
              >
                Add Selected Image
              </button>
              <button 
                className="btn"
                onClick={() => {
                  setShowImageLibrary(false);
                  setSelectedImage(null);
                }}
              >
                Cancel
              </button>
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

      {/* Landing Page URL Section */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">Landing Page URL</h2>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddLandingPageForm(!showAddLandingPageForm)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add URL
            </button>
          </div>

          {/* Add Landing Page Form */}
          {showAddLandingPageForm && (
            <div className="mb-6 p-4 bg-base-200 rounded-lg">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">New Landing Page URL</span>
                </label>
                <input
                  type="url"
                  className="input input-bordered w-full"
                  placeholder="https://example.com"
                  value={newLandingPage}
                  onChange={(e) => setNewLandingPage(e.target.value)}
                />
                <div className="flex gap-2 mt-3">
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={handleAddLandingPage}
                    disabled={!newLandingPage.trim()}
                  >
                    Add URL
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setShowAddLandingPageForm(false);
                      setNewLandingPage('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {/* Current Landing Page */}
            {assetGroup.finalUrl && (
              <div className="p-3 bg-base-200 rounded-lg">
                <div className="flex items-center justify-between">
            <a 
              href={assetGroup.finalUrl} 
              target="_blank" 
              rel="noopener noreferrer"
                    className="link link-primary flex-1"
            >
              {assetGroup.finalUrl}
            </a>
                  <span className="badge badge-sm badge-success">Current</span>
          </div>
        </div>
      )}

            {/* Pending Landing Pages (Light Gray) */}
            {pendingLandingPages.map((landingPage, index) => (
              <div key={`pending-landing-${index}`} className="p-3 bg-gray-300 border-2 border-dashed border-gray-400 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex-1">{landingPage['Final URL']}</span>
                  <span className="badge badge-sm badge-warning">PENDING</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Created: {new Date(landingPage.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}

            {!assetGroup.finalUrl && pendingLandingPages.length === 0 && (
              <p className="text-gray-500 italic">No landing page URL available</p>
            )}
          </div>
        </div>
      </div>

      {/* Changes History Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">Changes History</h2>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => setShowChangesHistory(!showChangesHistory)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showChangesHistory ? 'Hide' : 'Show'} History
            </button>
          </div>

          {showChangesHistory && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {changesHistory.length > 0 ? (
                changesHistory.map((change, index) => (
                  <div key={index} className="p-3 bg-base-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="badge badge-sm badge-primary">{change.action}</span>
                          <span className="badge badge-sm badge-secondary">{change.assetType}</span>
                          <span className="badge badge-sm badge-outline">{change.status}</span>
                        </div>
                        <p className="text-sm text-base-content/80">
                          {change.action === 'add' && change.assetType === 'headline' && `Added headline: "${change.data?.text}"`}
                          {change.action === 'add' && change.assetType === 'description' && `Added description: "${change.data?.text}"`}
                          {change.action === 'add' && change.assetType === 'landing_page' && `Added landing page: "${change.data?.url}"`}
                          {change.action === 'pause' && change.assetType === 'headline' && `Paused headline (ID: ${change.assetId})`}
                          {change.action === 'pause' && change.assetType === 'description' && `Paused description (ID: ${change.assetId})`}
                          {change.action === 'pause' && change.assetType === 'image' && `Paused image (ID: ${change.assetId})`}
                          {change.action === 'pause' && change.assetType === 'video' && `Paused video (ID: ${change.assetId})`}
                          {change.action === 'resume' && change.assetType === 'headline' && `Resumed headline (ID: ${change.assetId})`}
                          {change.action === 'resume' && change.assetType === 'description' && `Resumed description (ID: ${change.assetId})`}
                          {change.action === 'resume' && change.assetType === 'image' && `Resumed image (ID: ${change.assetId})`}
                          {change.action === 'resume' && change.assetType === 'video' && `Resumed video (ID: ${change.assetId})`}
                          {change.action === 'remove' && `Removed ${change.assetType} (ID: ${change.assetId})`}
                        </p>
                      </div>
                      <div className="text-right text-xs text-base-content/60">
                        <div>{change.changedBy}</div>
                        <div>{new Date(change.changedAt).toLocaleString()}</div>
                        <div className="badge badge-xs badge-ghost">{change.userRole}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic text-center py-4">No changes recorded yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
