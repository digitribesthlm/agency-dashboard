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
      const response = await fetch('/api/changes');
      console.log('Changes API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Changes API response data:', data);
        
        // Extract unique campaigns and asset groups from the changes data
        const campaignSet = new Set();
        const assetGroupSet = new Set();
        
        data.forEach(change => {
          // Add campaign info - use Set to ensure uniqueness
          if (change.campaign_id && change.campaign_name) {
            campaignSet.add(JSON.stringify({
              id: change.campaign_id,
              name: change.campaign_name
            }));
          }
          
          // Add asset group info - use Set to ensure uniqueness
          if (change.asset_group_id && change.asset_group_name) {
            assetGroupSet.add(JSON.stringify({
              id: change.asset_group_id,
              name: change.asset_group_name,
              'Campaign ID': change.campaign_id,
              'Campaign Name': change.campaign_name
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
      
      let url = `/api/changes`;
      const params = new URLSearchParams();
      
      if (selectedAssetGroup !== 'all') {
        params.append('asset_group_id', selectedAssetGroup);
      }
      
      if (filter === 'needs-update') {
        params.append('needs_update', 'true');
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      console.log('Changes API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Changes API response data:', data);
        setChanges(data);
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
    if (filter === 'needs-update') return change.needs_google_ads_update;
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
    <div className="min-h-screen bg-base-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Box */}
        <div className="mb-8">
          <div className="breadcrumbs text-sm text-base-content/70">
            <ul>
              <li><a href="/campaigns" className="link link-hover">Campaigns</a></li>
              <li><a className="link link-hover">Changes Tracking</a></li>
            </ul>
          </div>
          <div className="mt-3 card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Changes Tracking</h1>
                  <p className="text-base-content/70 mt-1">Track all changes made to assets that need to be updated in Google Ads.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="badge badge-primary badge-outline">Total: {changes.length}</div>
                  <div className="badge badge-warning badge-outline">Needs Update: {changes.filter(c => c.needs_google_ads_update).length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card bg-base-100 shadow-sm border border-base-300 mb-6">
          <div className="card-body p-6">
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
                      newCampaign === 'all' || ag['Campaign ID'] === newCampaign
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
                    .filter(ag => selectedCampaign === 'all' || ag['Campaign ID'] === selectedCampaign)
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
              <div className="stats shadow-sm border border-base-300">
                <div className="stat">
                  <div className="stat-title text-base-content/60">Total Changes</div>
                  <div className="stat-value text-primary">{changes.length}</div>
                </div>
                <div className="stat">
                  <div className="stat-title text-base-content/60">Need Update</div>
                  <div className="stat-value text-warning">
                    {changes.filter(c => c.needs_google_ads_update).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Changes Table */}
        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body p-0">
            {filteredChanges.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-base-content/70">No changes found for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead className="bg-base-200">
                    <tr>
                      <th className="w-32 text-left font-semibold">Time</th>
                      <th className="w-20 text-center font-semibold">Action</th>
                      <th className="w-28 text-left font-semibold">Asset Type</th>
                      <th className="text-left min-w-[300px] font-semibold">Content Preview</th>
                      <th className="w-44 text-left min-w-[160px] font-semibold">Campaign</th>
                      <th className="w-44 text-left min-w-[140px] font-semibold">Asset Group</th>
                      <th className="w-40 text-left font-semibold">Changed By</th>
                      <th className="w-24 text-center font-semibold">Google Ads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChanges.map((change, index) => (
                      <tr key={index} className="hover">
                        <td className="text-xs text-left whitespace-nowrap">
                          {formatDate(change.changed_at)}
                        </td>
                        <td className="text-center">
                          <div className={`badge badge-sm ${getActionBadge(change.action)}`}>
                            {change.action.toUpperCase()}
                          </div>
                        </td>
                        <td className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {getAssetTypeIcon(change.asset_type, change.field_type)}
                            </span>
                            <div>
                              <div className="font-medium">
                                {change.asset_type}
                              </div>
                              {change.field_type && (
                                <div className="text-xs text-base-content/60">
                                  {change.field_type}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-left max-w-[300px]">
                          <div className="flex items-center gap-3">
                            {/* Display actual content based on asset type */}
                            {change.asset_type === 'IMAGE' && change.asset_url ? (
                              <div className="flex-shrink-0">
                                <img 
                                  src={change.asset_url} 
                                  alt="Asset" 
                                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iMzIiIHk9IjMyIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=';
                                  }}
                                />
                              </div>
                            ) : change.asset_type === 'VIDEO' && change.asset_url ? (
                              <div className="flex-shrink-0 relative">
                                <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                                  <iframe
                                    src={`https://www.youtube.com/embed/${change.asset_url?.split('v=')[1]?.split('&')[0]}?autoplay=0&controls=0&showinfo=0&rel=0&modestbranding=1`}
                                    className="w-full h-full pointer-events-none"
                                    style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}
                                  />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M8 5v10l8-5-8-5z"/>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            ) : change.asset_type === 'YOUTUBE_VIDEO' && change.asset_url ? (
                              <div className="flex-shrink-0 relative">
                                <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                                  <iframe
                                    src={`https://www.youtube.com/embed/${change.asset_url?.split('v=')[1]?.split('&')[0]}?autoplay=0&controls=0&showinfo=0&rel=0&modestbranding=1`}
                                    className="w-full h-full pointer-events-none"
                                    style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}
                                  />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M8 5v10l8-5-8-5z"/>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                            
                            {/* Content text */}
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {change.text_content || `ID: ${change.asset_id}`}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {change.asset_id}
                              </div>
                              {change.landing_page_url && (
                                <div className="text-xs text-blue-600 truncate">
                                  <a href={change.landing_page_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    {change.landing_page_url}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-left max-w-[160px]">
                          <div className="truncate" title={change.campaign_name || 'N/A'}>
                            {change.campaign_name || 'N/A'}
                          </div>
                        </td>
                        <td className="text-left max-w-[140px]">
                          <div className="truncate" title={change.asset_group_name || 'N/A'}>
                            {change.asset_group_name || 'N/A'}
                          </div>
                        </td>
                        <td className="text-left">
                          <div className="text-sm font-mono break-all max-w-[200px]" title={change.changed_by}>
                            {change.changed_by}
                          </div>
                        </td>
                        <td className="text-center">
                          {change.needs_google_ads_update ? (
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
        {changes.filter(c => c.needs_google_ads_update).length > 0 && (
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
                  .filter(c => c.needs_google_ads_update)
                  .slice(0, 5)
                  .map((change, index) => (
                    <li key={index}>
                      <strong>{change.action.toUpperCase()}</strong> {change.asset_type} 
                      in {change.campaign_name} - {change.asset_group_name}
                    </li>
                  ))}
                {changes.filter(c => c.needs_google_ads_update).length > 5 && (
                  <li>... and {changes.filter(c => c.needs_google_ads_update).length - 5} more</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
