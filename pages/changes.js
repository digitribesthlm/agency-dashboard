import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function ChangesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, needs-update, pause, resume, remove
  const [dateRange, setDateRange] = useState('7'); // 1, 7, 30, all
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedAssetGroup, setSelectedAssetGroup] = useState('all');
  const [campaigns, setCampaigns] = useState([]);
  const [assetGroups, setAssetGroups] = useState([]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    // Only allow admin users to access changes page
    if (session.user.role !== 'admin') {
      router.push('/client/dashboard');
      return;
    }
    fetchCampaignsAndAssetGroups();
    fetchChanges();
  }, [session, status, filter, dateRange, selectedCampaign, selectedAssetGroup]);

  const fetchCampaignsAndAssetGroups = async () => {
    try {
      console.log('Fetching campaigns and asset groups from changes...');
      // Get campaigns and asset groups from the changes API instead
      const response = await fetch('/api/changes?accountId=1&filter=all&dateRange=all');
      console.log('Changes API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Changes API response data:', data);
        if (data.success) {
          // Extract unique campaigns and asset groups from the changes data
          const campaignSet = new Set();
          const assetGroupSet = new Set();
          
          data.data.forEach(change => {
            // Add campaign info - use Set to ensure uniqueness
            if (change.campaignId && change.assetDetails?.campaignName) {
              campaignSet.add(JSON.stringify({
                id: change.campaignId,
                name: change.assetDetails.campaignName
              }));
            }
            
            // Add asset group info - use Set to ensure uniqueness
            if (change.assetGroupId && change.assetDetails?.assetGroupName) {
              assetGroupSet.add(JSON.stringify({
                id: change.assetGroupId,
                name: change.assetDetails.assetGroupName,
                'Campaign ID': change.campaignId,
                'Campaign Name': change.assetDetails.campaignName
              }));
            }
          });
          
          // Convert back to objects
          const campaignsArray = Array.from(campaignSet).map(item => JSON.parse(item));
          const assetGroupsArray = Array.from(assetGroupSet).map(item => JSON.parse(item));
          
          console.log('Processed campaigns from changes:', campaignsArray.length);
          console.log('Processed asset groups from changes:', assetGroupsArray.length);
          console.log('Sample campaign:', campaignsArray[0]);
          console.log('Sample asset group:', assetGroupsArray[0]);
          
          setCampaigns(campaignsArray);
          setAssetGroups(assetGroupsArray);
        } else {
          console.error('Changes API returned success: false');
        }
      } else {
        console.error('Changes API failed:', response.status);
      }
    } catch (error) {
      console.error('Error fetching campaigns and asset groups:', error);
    }
  };

  const fetchChanges = async () => {
    try {
      setLoading(true);
      console.log('Fetching changes with params:', { filter, dateRange, selectedCampaign, selectedAssetGroup });
      
      let url = `/api/changes?accountId=1&filter=${filter}&dateRange=${dateRange}`;
      if (selectedCampaign !== 'all') {
        url += `&campaignId=${selectedCampaign}`;
      }
      if (selectedAssetGroup !== 'all') {
        url += `&assetGroupId=${selectedAssetGroup}`;
      }
      
      const response = await fetch(url);
      console.log('Changes API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Changes API response data:', data);
        if (data.success) {
          setChanges(data.data);
        }
      } else {
        const errorData = await response.json();
        console.error('Changes API error:', errorData);
      }
    } catch (error) {
      console.error('Error fetching changes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    const badges = {
      pause: 'badge-warning',
      resume: 'badge-success', 
      remove: 'badge-error',
      add: 'badge-info'
    };
    return badges[action] || 'badge-neutral';
  };

  const getAssetTypeIcon = (assetType, fieldType) => {
    if (assetType === 'TEXT') {
      if (fieldType === 'HEADLINE') return '📝';
      if (fieldType === 'LONG_HEADLINE') return '📄';
      if (fieldType === 'DESCRIPTION') return '📋';
      return '📝';
    } else if (assetType === 'IMAGE') return '🖼️';
    else if (assetType === 'VIDEO' || assetType === 'YOUTUBE_VIDEO') return '🎥';
    return '📄';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const filteredChanges = changes.filter(change => {
    if (filter === 'needs-update') return change.needsGoogleAdsUpdate;
    if (filter === 'all') return true;
    return change.action === filter;
  });

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Changes Tracking</h1>
          <p className="text-base-content/70">
            Track all changes made to assets that need to be updated in Google Ads
          </p>
        </div>

        {/* Filters */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Filter by Action</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Changes</option>
                  <option value="needs-update">Needs Google Ads Update</option>
                  <option value="pause">Paused</option>
                  <option value="resume">Resumed</option>
                  <option value="remove">Removed</option>
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Date Range</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="1">Last 24 hours</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Campaign</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={selectedCampaign}
                  onChange={(e) => {
                    const newCampaign = e.target.value;
                    console.log('🔍 DEBUG - Campaign selected:', newCampaign);
                    setSelectedCampaign(newCampaign);
                    setSelectedAssetGroup('all'); // Reset asset group when campaign changes
                    
                    // Debug: Show filtered asset groups
                    const filteredGroups = assetGroups.filter(ag => 
                      newCampaign === 'all' || ag['Campaign ID'] === Number(newCampaign)
                    );
                    console.log('🔍 DEBUG - Filtered Asset Groups:', filteredGroups.length, filteredGroups);
                  }}
                >
                  <option value="all">All Campaigns</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Asset Group</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={selectedAssetGroup}
                  onChange={(e) => setSelectedAssetGroup(e.target.value)}
                  disabled={selectedCampaign === 'all'}
                >
                  <option value="all">All Asset Groups</option>
                  {assetGroups
                    .filter(ag => selectedCampaign === 'all' || ag['Campaign ID'] === Number(selectedCampaign))
                    .map(assetGroup => (
                      <option key={assetGroup.id} value={assetGroup.id}>
                        {assetGroup.name} ({assetGroup['Campaign Name'] || 'Unknown Campaign'})
                      </option>
                    ))}
                </select>
              </div>
            </div>
            
            <div className="divider"></div>
            
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="stats shadow">
                <div className="stat">
                  <div className="stat-title">Total Changes</div>
                  <div className="stat-value text-primary">{changes.length}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Need Update</div>
                  <div className="stat-value text-warning">
                    {changes.filter(c => c.needsGoogleAdsUpdate).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Changes Table */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-0">
            {filteredChanges.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-base-content/70">No changes found for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th className="w-32 text-left">Time</th>
                      <th className="w-20 text-center">Action</th>
                      <th className="w-28 text-left">Asset Type</th>
                      <th className="text-left min-w-[200px]">Content</th>
                      <th className="w-48 text-left min-w-[180px]">Campaign</th>
                      <th className="w-48 text-left min-w-[160px]">Asset Group</th>
                      <th className="w-32 text-left">Changed By</th>
                      <th className="w-24 text-center">Google Ads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChanges.map((change, index) => (
                      <tr key={index} className="hover">
                        <td className="text-xs text-left whitespace-nowrap">
                          {formatDate(change.changedAt)}
                        </td>
                        <td className="text-center">
                          <div className={`badge badge-sm ${getActionBadge(change.action)}`}>
                            {change.action.toUpperCase()}
                          </div>
                        </td>
                        <td className="text-left">
                          <div className="flex items-center gap-2">
                            {/* Show actual image preview for IMAGE assets */}
                            {(change.assetType === 'image' || change.assetDetails.assetType === 'IMAGE') && (change.data?.imageUrl || change.assetDetails.assetUrl) ? (
                              <div className="relative group">
                                <img 
                                  src={change.data?.imageUrl || change.assetDetails.assetUrl} 
                                  alt="Asset preview" 
                                  className="w-12 h-12 object-cover rounded border"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                  }}
                                />
                                <div className="w-12 h-12 bg-base-200 rounded border flex items-center justify-center text-lg" style={{display: 'none'}}>
                                  🖼️
                                </div>
                                {/* Hover preview */}
                                <div className="absolute left-0 top-0 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                  <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-2 max-w-xs">
                                    <img 
                                      src={change.data?.imageUrl || change.assetDetails.assetUrl} 
                                      alt="Asset preview" 
                                      className="max-w-full max-h-48 object-contain rounded"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-lg">
                                {getAssetTypeIcon(change.assetDetails.assetType, change.assetDetails.fieldType)}
                              </span>
                            )}
                            <div>
                              <div className="font-medium">
                                {change.assetType === 'image' ? 'IMAGE' : 
                                 change.assetType === 'video' ? 'VIDEO' : 
                                 change.assetType === 'headline' ? 'TEXT' : 
                                 change.assetType === 'description' ? 'TEXT' :
                                 change.assetDetails.assetType === 'YOUTUBE_VIDEO' ? 'VIDEO' :
                                 change.assetDetails.assetType || 'UNKNOWN'}
                              </div>
                              {change.assetDetails.fieldType && (
                                <div className="text-xs text-base-content/60">
                                  {change.assetDetails.fieldType}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-left max-w-[200px]">
                          {/* Show appropriate content based on asset type */}
                          {change.assetType === 'image' || change.assetDetails.assetType === 'IMAGE' ? (
                            <div>
                              <div className="text-xs text-blue-600 truncate" title={change.data?.imageUrl || change.assetDetails.assetUrl || 'No URL'}>
                                {change.data?.imageUrl || change.assetDetails.assetUrl ? '🖼️ Image URL' : 'N/A'}
                              </div>
                              {(change.data?.imageUrl || change.assetDetails.assetUrl) && (
                                <div className="text-xs text-base-content/60 truncate" title={change.data?.imageUrl || change.assetDetails.assetUrl}>
                                  {change.data?.imageUrl || change.assetDetails.assetUrl}
                                </div>
                              )}
                            </div>
                          ) : change.assetType === 'video' || change.assetDetails.assetType === 'VIDEO' || change.assetDetails.assetType === 'YOUTUBE_VIDEO' ? (
                            <div>
                              <div className="text-xs text-blue-600 truncate" title={change.data?.videoUrl || change.assetDetails.assetUrl || 'No URL'}>
                                {change.data?.videoUrl || change.assetDetails.assetUrl ? '🎥 Video URL' : 'N/A'}
                              </div>
                              {(change.data?.videoUrl || change.assetDetails.assetUrl) && (
                                <div className="text-xs text-base-content/60 truncate" title={change.data?.videoUrl || change.assetDetails.assetUrl}>
                                  {change.data?.videoUrl || change.assetDetails.assetUrl}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="truncate" title={change.assetDetails.textContent || 'N/A'}>
                                {change.assetDetails.textContent || 'N/A'}
                              </div>
                            </div>
                          )}
                          <div className="text-xs text-base-content/60 truncate" title={`ID: ${change.assetId}`}>
                            ID: {change.assetId}
                          </div>
                          {/* Image preview for image assets */}
                          {change.assetDetails.assetType === 'IMAGE' && change.assetDetails.assetUrl && (
                            <div className="relative group mt-2">
                              <div className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                🖼️ View Image
                              </div>
                              <div className="absolute left-0 top-6 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-2 max-w-xs">
                                  <img 
                                    src={change.assetDetails.assetUrl} 
                                    alt="Asset preview" 
                                    className="max-w-full max-h-48 object-contain rounded"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'block';
                                    }}
                                  />
                                  <div className="text-xs text-gray-500 mt-1 hidden">
                                    Image not available
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="text-left max-w-[180px]">
                          <div className="truncate" title={change.assetDetails.campaignName || 'N/A'}>
                            {change.assetDetails.campaignName || 'N/A'}
                          </div>
                        </td>
                        <td className="text-left max-w-[160px]">
                          <div className="truncate" title={change.assetDetails.assetGroupName || 'N/A'}>
                            {change.assetDetails.assetGroupName || 'N/A'}
                          </div>
                        </td>
                        <td className="text-left">
                          <div className="text-sm">{change.changedBy}</div>
                          <div className="text-xs text-base-content/60">
                            {change.userRole}
                          </div>
                        </td>
                        <td className="text-center">
                          {change.needsGoogleAdsUpdate ? (
                            <div className="badge badge-warning badge-sm">
                              ⚠️ Needs Update
                            </div>
                          ) : (
                            <div className="badge badge-success badge-sm">
                              ✅ Synced
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Summary for Google Ads Updates */}
        {changes.filter(c => c.needsGoogleAdsUpdate).length > 0 && (
          <div className="card bg-warning/10 border-warning mt-6">
            <div className="card-body">
              <h3 className="card-title text-warning">
                ⚠️ Google Ads Manual Updates Required
              </h3>
              <p className="text-sm">
                The following changes need to be manually applied in Google Ads:
              </p>
              <ul className="list-disc list-inside mt-2 text-sm">
                {changes
                  .filter(c => c.needsGoogleAdsUpdate)
                  .slice(0, 5)
                  .map((change, index) => (
                    <li key={index}>
                      <strong>{change.action.toUpperCase()}</strong> {change.assetDetails.assetType} 
                      in {change.assetDetails.campaignName} - {change.assetDetails.assetGroupName}
                    </li>
                  ))}
                {changes.filter(c => c.needsGoogleAdsUpdate).length > 5 && (
                  <li>... and {changes.filter(c => c.needsGoogleAdsUpdate).length - 5} more</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
