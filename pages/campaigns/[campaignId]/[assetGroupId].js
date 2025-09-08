import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Layout from '../../../components/Layout';

export default function AssetGroupDetailPage() {
  const router = useRouter();
  const { campaignId, assetGroupId } = router.query;
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [assetGroup, setAssetGroup] = useState(null);
  const [assets, setAssets] = useState([]);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);
  const [showHeadlineModal, setShowHeadlineModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showLandingPageModal, setShowLandingPageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [newHeadline, setNewHeadline] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLandingPage, setNewLandingPage] = useState('');
  const [libraryImages, setLibraryImages] = useState([]);
  const [libraryVideos, setLibraryVideos] = useState([]);
  const [headlineType, setHeadlineType] = useState('HEADLINE');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && campaignId && assetGroupId) {
      fetchAssets();
    }
  }, [status, campaignId, assetGroupId]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      console.log('Fetching assets for campaign:', campaignId, 'asset group:', assetGroupId);
      const response = await fetch(`/api/assets?campaign_id=${campaignId}&asset_group_id=${assetGroupId}`);
      const assetsData = await response.json();
      console.log('Fetched assets:', assetsData.length, 'assets');
      
      if (assetsData.length === 0) {
        setCampaign({ campaignName: 'Unknown Campaign' });
        setAssetGroup({ assetGroupName: 'Unknown Asset Group' });
        setAssets([]);
        return;
      }
      
      // Get campaign and asset group info from first asset
      const firstAsset = assetsData[0];
      setCampaign({
        campaignId: firstAsset.campaign_id,
        campaignName: firstAsset.campaign_name
      });
      setAssetGroup({
        assetGroupId: firstAsset.asset_group_id,
        assetGroupName: firstAsset.asset_group_name
      });
      
      // Group assets by type
      const groupedAssets = {
        images: assetsData.filter(asset => asset.asset_type === 'IMAGE'),
        videos: assetsData.filter(asset => asset.asset_type === 'YOUTUBE_VIDEO'),
        headlines: assetsData.filter(asset => asset.field_type === 'HEADLINE'),
        descriptions: assetsData.filter(asset => asset.field_type === 'DESCRIPTION'),
        longHeadlines: assetsData.filter(asset => asset.field_type === 'LONG_HEADLINE'),
        landingPages: assetsData
          .filter(asset => asset.landing_page_url && asset.landing_page_url.trim() !== '')
          .reduce((unique, asset) => {
            const url = asset.landing_page_url;
            if (!unique.find(item => item.landing_page_url === url)) {
              unique.push(asset);
            }
            return unique;
          }, [])
      };
      
      setAssets(groupedAssets);
      
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add asset using unified API
  const addAsset = async (assetData) => {
    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...assetData,
          campaign_id: campaignId,
          campaign_name: campaign?.campaignName,
          asset_group_id: assetGroupId,
          asset_group_name: assetGroup?.assetGroupName
        })
      });

      if (response.ok) {
        fetchAssets(); // Refresh assets
        return true;
      }
    } catch (error) {
      console.error('Error adding asset:', error);
    }
    return false;
  };

  // Delete asset using unified API
  const deleteAsset = async (assetId) => {
    try {
      console.log('Sending DELETE request for asset:', assetId, 'in campaign:', campaignId, 'asset group:', assetGroupId);
      const response = await fetch(`/api/assets?id=${assetId}&campaign_id=${campaignId}&asset_group_id=${assetGroupId}`, {
        method: 'DELETE'
      });

      console.log('Delete response status:', response.status);
      const responseData = await response.json();
      console.log('Delete response data:', responseData);

      if (response.ok) {
        console.log('Delete successful, refreshing assets...');
        // Small delay to ensure database update completes
        setTimeout(() => {
          fetchAssets(); // Refresh assets
        }, 100);
        return true;
      } else {
        console.error('Delete failed:', responseData);
      }
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
    return false;
  };

  // Handle adding short headline
  const handleAddShortHeadline = async () => {
    if (newHeadline.trim()) {
      const success = await addAsset({
        asset_type: 'TEXT',
        field_type: 'HEADLINE',
        text_content: newHeadline.trim()
      });
      
      if (success) {
        setNewHeadline('');
        setShowHeadlineModal(false);
      }
    }
  };

  // Handle adding long headline
  const handleAddLongHeadline = async () => {
    if (newHeadline.trim()) {
      const success = await addAsset({
        asset_type: 'TEXT',
        field_type: 'LONG_HEADLINE',
        text_content: newHeadline.trim()
      });
      
      if (success) {
        setNewHeadline('');
        setShowHeadlineModal(false);
      }
    }
  };

  // Handle adding description
  const handleAddDescription = async () => {
    if (newDescription.trim()) {
      const success = await addAsset({
        asset_type: 'TEXT',
        field_type: 'DESCRIPTION',
        text_content: newDescription.trim()
      });
      
      if (success) {
        setNewDescription('');
        setShowDescriptionModal(false);
      }
    }
  };

  // Handle adding landing page
  const handleAddLandingPage = async () => {
    if (newLandingPage.trim()) {
      const success = await addAsset({
        asset_type: 'TEXT',
        field_type: 'LANDING_PAGE',
        landing_page_url: newLandingPage.trim()
      });
      
      if (success) {
        setNewLandingPage('');
        setShowLandingPageModal(false);
      }
    }
  };

  // Handle adding image from library
  const handleAddImageFromLibrary = async () => {
    if (selectedImage) {
      const success = await addAsset({
        asset_type: 'IMAGE',
        asset_url: selectedImage['Image URL'] || selectedImage['Asset URL']
      });
      
      if (success) {
        setSelectedImage(null);
        setShowImageLibrary(false);
      }
    }
  };

  // Handle adding video from library
  const handleAddVideoFromLibrary = async () => {
    if (selectedVideo) {
      const success = await addAsset({
        asset_type: 'YOUTUBE_VIDEO',
        asset_url: selectedVideo['Video URL'] || selectedVideo['Asset URL'],
        text_content: selectedVideo['Video Title'] || selectedVideo['Text Content']
      });
      
      if (success) {
        setSelectedVideo(null);
        setShowVideoLibrary(false);
      }
    }
  };

  // Handle removing asset
  const handleRemoveAsset = async (assetId) => {
    console.log('Removing asset:', assetId);
    const success = await deleteAsset(assetId);
    console.log('Delete result:', success);
    if (success) {
      console.log('Asset removed successfully, refreshing...');
    } else {
      console.log('Failed to remove asset');
    }
  };

  // Fetch library images
  const fetchLibraryImages = async () => {
    try {
      const response = await fetch('/api/assets?all=true&asset_type=IMAGE');
      const images = await response.json();
      
      // Deduplicate images by asset_id (handle both string and number types)
      const uniqueImages = images.reduce((unique, image) => {
        const assetId = String(image.asset_id); // Convert to string for consistent comparison
        if (!unique.find(item => String(item.asset_id) === assetId)) {
          unique.push(image);
        }
        return unique;
      }, []);
      
      console.log('Total images fetched:', images.length);
      console.log('Unique images after deduplication:', uniqueImages.length);
      console.log('Sample unique images:', uniqueImages.slice(0, 3).map(img => ({ id: img.asset_id, url: img['Image URL'] || img['Asset URL'] })));
      
      setLibraryImages(uniqueImages);
    } catch (error) {
      console.error('Error fetching library images:', error);
    }
  };

  // Fetch library videos
  const fetchLibraryVideos = async () => {
    try {
      const response = await fetch('/api/assets?all=true&asset_type=YOUTUBE_VIDEO');
      const videos = await response.json();
      
      // Deduplicate videos by asset_id
      const uniqueVideos = videos.reduce((unique, video) => {
        if (!unique.find(item => item.asset_id === video.asset_id)) {
          unique.push(video);
        }
        return unique;
      }, []);
      
      setLibraryVideos(uniqueVideos);
    } catch (error) {
      console.error('Error fetching library videos:', error);
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
      <div className="min-h-screen bg-base-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Box */}
          <div className="mb-8">
            <div className="breadcrumbs text-sm text-base-content/70">
              <ul>
                <li><a href="/campaigns" className="link link-hover">Campaigns</a></li>
                <li><a href={`/campaigns/${campaignId}`} className="link link-hover">{campaign?.campaignName || 'Campaign'}</a></li>
                <li><a className="link link-hover">{assetGroup?.assetGroupName || 'Asset Group'}</a></li>
              </ul>
            </div>
            <div className="mt-3 card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">{assetGroup?.assetGroupName || 'Asset Group'}</h1>
                    <p className="text-base-content/70 mt-1">Manage and optimize your advertising assets for this asset group.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href="/changes" className="btn btn-outline btn-sm">Show History</a>
                    <button onClick={() => router.back()} className="btn btn-ghost btn-sm">← Back</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Admin-only Changes History section */}
        {session?.user?.role === 'admin' && (
          <div className="mb-6">
            <a 
              href="/changes" 
              className="btn btn-sm btn-outline"
            >
              Show History
            </a>
          </div>
        )}

          {/* Short Headlines Section */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Short Headlines</h3>
                    <p className="text-sm text-gray-500 mt-1">{assets.headlines?.length || 0} assets • HEADLINE field type</p>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setHeadlineType('HEADLINE');
                      setShowHeadlineModal(true);
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Short Headline
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assets.headlines?.map((asset) => (
                    <div key={asset.asset_id} className={`group rounded-lg border hover:shadow-md transition-all duration-200 overflow-hidden ${
                      asset.is_pending 
                        ? 'bg-warning/5 border-warning/20 hover:border-warning/30' 
                        : 'bg-base-100 border-base-300 hover:border-base-400'
                    }`}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-base-content/60">HEADLINE</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {asset.is_pending && (
                        <div className="badge badge-warning badge-sm gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 001.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          PENDING
                        </div>
                      )}
                      <div className="tooltip" data-tip={`Performance: ${asset['Performance Label'] || 'UNKNOWN'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          asset['Performance Label'] === 'BEST' ? 'bg-success/20' :
                          asset['Performance Label'] === 'GOOD' ? 'bg-info/20' :
                          asset['Performance Label'] === 'LOW' ? 'bg-error/20' :
                          asset['Performance Label'] === 'PENDING' ? 'bg-warning/20' :
                          'bg-base-300'
                        }`}>
                          {asset['Performance Label'] === 'BEST' ? (
                            <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : asset['Performance Label'] === 'GOOD' ? (
                            <svg className="w-4 h-4 text-info" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                            </svg>
                          ) : asset['Performance Label'] === 'LOW' ? (
                            <svg className="w-4 h-4 text-error" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                            </svg>
                          ) : asset['Performance Label'] === 'PENDING' ? (
                            <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-base-content/40" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleRemoveAsset(asset.asset_id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded-lg"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-lg font-medium text-gray-900 leading-relaxed">{asset['Text Content']}</p>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      <span>ID: {asset.asset_id}</span>
                      <span>{asset['Text Content']?.length || 0} chars</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs">Active</span>
                    </div>
                  </div>
                </div>
              </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Long Headlines Section */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Long Headlines</h3>
                    <p className="text-sm text-gray-500 mt-1">{assets.longHeadlines?.length || 0} assets • LONG_HEADLINE field type</p>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setHeadlineType('LONG_HEADLINE');
                      setShowHeadlineModal(true);
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Long Headline
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assets.longHeadlines?.map((asset) => (
                    <div key={asset.asset_id} className={`group rounded-lg border hover:shadow-md transition-all duration-200 overflow-hidden ${
                      asset.is_pending 
                        ? 'bg-warning/5 border-warning/20 hover:border-warning/30' 
                        : 'bg-base-100 border-base-300 hover:border-base-400'
                    }`}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-500">LONG_HEADLINE</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {asset.is_pending && (
                        <div className="badge badge-warning badge-sm gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 001.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          PENDING
                        </div>
                      )}
                      <div className="tooltip" data-tip={`Performance: ${asset['Performance Label'] || 'UNKNOWN'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          asset['Performance Label'] === 'BEST' ? 'bg-success/20' :
                          asset['Performance Label'] === 'GOOD' ? 'bg-info/20' :
                          asset['Performance Label'] === 'LOW' ? 'bg-error/20' :
                          asset['Performance Label'] === 'PENDING' ? 'bg-warning/20' :
                          'bg-base-300'
                        }`}>
                          {asset['Performance Label'] === 'BEST' ? (
                            <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : asset['Performance Label'] === 'GOOD' ? (
                            <svg className="w-4 h-4 text-info" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                            </svg>
                          ) : asset['Performance Label'] === 'LOW' ? (
                            <svg className="w-4 h-4 text-error" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                            </svg>
                          ) : asset['Performance Label'] === 'PENDING' ? (
                            <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-base-content/40" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleRemoveAsset(asset.asset_id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded-lg"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-lg font-medium text-gray-900 leading-relaxed">{asset['Text Content']}</p>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      <span>ID: {asset.asset_id}</span>
                      <span>{asset['Text Content']?.length || 0} chars</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs">Active</span>
                    </div>
                  </div>
                </div>
              </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Descriptions Section */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Descriptions</h3>
                    <p className="text-sm text-gray-500 mt-1">{assets.descriptions?.length || 0} assets • DESCRIPTION field type</p>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setShowDescriptionModal(true);
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Description
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assets.descriptions?.map((asset) => (
                    <div key={asset.asset_id} className={`group rounded-lg border hover:shadow-md transition-all duration-200 overflow-hidden ${
                      asset.is_pending 
                        ? 'bg-warning/5 border-warning/20 hover:border-warning/30' 
                        : 'bg-base-100 border-base-300 hover:border-base-400'
                    }`}>
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v1a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 7a2 2 0 00-2 2v3a2 2 0 002 2h7a1 1 0 100-2H4v-3h12v1a1 1 0 102 0v-1a2 2 0 00-2-2H4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-500">DESCRIPTION</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {asset.is_pending && (
                              <div className="badge badge-warning badge-sm gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 001.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                PENDING
                              </div>
                            )}
                            <div className="tooltip" data-tip={`Performance: ${asset['Performance Label'] || 'UNKNOWN'}`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                asset['Performance Label'] === 'BEST' ? 'bg-success/20' :
                                asset['Performance Label'] === 'GOOD' ? 'bg-info/20' :
                                asset['Performance Label'] === 'LOW' ? 'bg-error/20' :
                                asset['Performance Label'] === 'PENDING' ? 'bg-warning/20' :
                                'bg-base-300'
                              }`}>
                                {asset['Performance Label'] === 'BEST' ? (
                                  <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : asset['Performance Label'] === 'GOOD' ? (
                                  <svg className="w-4 h-4 text-info" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                                  </svg>
                                ) : asset['Performance Label'] === 'LOW' ? (
                                  <svg className="w-4 h-4 text-error" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                                  </svg>
                                ) : asset['Performance Label'] === 'PENDING' ? (
                                  <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-base-content/40" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleRemoveAsset(asset.asset_id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded-lg"
                            >
                              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-lg font-medium text-gray-900 leading-relaxed">{asset['Text Content']}</p>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center gap-4">
                            <span>ID: {asset.asset_id}</span>
                            <span>{asset['Text Content']?.length || 0} chars</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs">Active</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Images Section */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Images</h3>
                    <p className="text-sm text-gray-500 mt-1">{assets.images?.length || 0} assets</p>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      fetchLibraryImages();
                      setShowImageLibrary(true);
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add from Library
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {assets.images?.map((image) => (
                    <div key={image.asset_id} className={`group rounded-lg border hover:shadow-md transition-all duration-200 overflow-hidden ${
                      image.is_pending 
                        ? 'bg-warning/5 border-warning/20 hover:border-warning/30' 
                        : 'bg-base-100 border-base-300 hover:border-base-400'
                    }`}>
                <div className="relative">
                  <img
                    src={image['Image URL'] || image['Asset URL']}
                    alt="Asset"
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                    }}
                  />
                  
                  {/* Performance indicator in top right */}
                  <div className="absolute top-2 right-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      image['Performance Label'] === 'BEST' ? 'bg-green-100' :
                      image['Performance Label'] === 'GOOD' ? 'bg-blue-100' :
                      image['Performance Label'] === 'LOW' ? 'bg-red-100' :
                      image['Performance Label'] === 'PENDING' ? 'bg-yellow-100' :
                      'bg-gray-100'
                    }`}>
                      {image['Performance Label'] === 'BEST' ? (
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : image['Performance Label'] === 'GOOD' ? (
                        <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                        </svg>
                      ) : image['Performance Label'] === 'LOW' ? (
                        <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                        </svg>
                      ) : image['Performance Label'] === 'PENDING' ? (
                        <svg className="w-3 h-3 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  
                  {/* Delete button overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleRemoveAsset(image.asset_id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="p-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>ID: {image.asset_id}</span>
                    {image.is_pending && (
                      <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        PENDING
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      image['Performance Label'] === 'BEST' ? 'bg-green-100 text-green-800' :
                      image['Performance Label'] === 'GOOD' ? 'bg-blue-100 text-blue-800' :
                      image['Performance Label'] === 'LOW' ? 'bg-red-100 text-red-800' :
                      image['Performance Label'] === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {image['Performance Label'] || 'UNKNOWN'}
                    </span>
                  </div>
                </div>
              </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Videos Section */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Videos</h3>
                    <p className="text-sm text-gray-500 mt-1">{assets.videos?.length || 0} assets</p>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      fetchLibraryVideos();
                      setShowVideoLibrary(true);
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add from Library
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assets.videos?.map((video) => (
                    <div key={video.asset_id} className={`group rounded-lg border hover:shadow-md transition-all duration-200 overflow-hidden ${
                      video.is_pending 
                        ? 'bg-warning/5 border-warning/20 hover:border-warning/30' 
                        : 'bg-base-100 border-base-300 hover:border-base-400'
                    }`}>
                <div className="relative">
                  <div className="aspect-video bg-gray-200 rounded-t-xl overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${video['Video ID'] || video['Asset URL']?.split('v=')[1]}?autoplay=0&controls=0&showinfo=0&rel=0&modestbranding=1`}
                      title={video['Video Title'] || video['Text Content']}
                      className="w-full h-full"
                      allowFullScreen
                      style={{ pointerEvents: 'none' }}
                    />
                  </div>
                  
                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 5v10l8-5-8-5z"/>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Delete button overlay */}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => handleRemoveAsset(video.asset_id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-500">VIDEO</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                    {video['Video Title'] || video['Text Content'] || 'Untitled Video'}
                  </h4>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>ID: {video.asset_id}</span>
                    {video.is_pending && (
                      <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        PENDING
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      video['Performance Label'] === 'BEST' ? 'bg-green-100 text-green-800' :
                      video['Performance Label'] === 'GOOD' ? 'bg-blue-100 text-blue-800' :
                      video['Performance Label'] === 'LOW' ? 'bg-red-100 text-red-800' :
                      video['Performance Label'] === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {video['Performance Label'] || 'UNKNOWN'}
                    </span>
                  </div>
                </div>
              </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Landing Pages Section */}
          <div className="mb-8">
            <div className="card bg-base-100 shadow-sm border border-base-300">
              <div className="card-body p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-base-content">Landing Pages</h3>
                    <p className="text-sm text-base-content/60 mt-1">{assets.landingPages?.length || 0} assets</p>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowLandingPageModal(true)}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Landing Page
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assets.landingPages?.map((landingPage) => (
                    <div key={landingPage.asset_id} className={`group rounded-lg border hover:shadow-md transition-all duration-200 overflow-hidden ${
                      landingPage.is_pending 
                        ? 'bg-warning/5 border-warning/20 hover:border-warning/30' 
                        : 'bg-base-100 border-base-300 hover:border-base-400'
                    }`}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-base-content/60">LANDING_PAGE</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {landingPage.is_pending && (
                        <div className="badge badge-warning badge-sm gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 001.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          PENDING
                        </div>
                      )}
                      <div className="tooltip" data-tip={`Performance: ${landingPage['Performance Label'] || 'UNKNOWN'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          landingPage['Performance Label'] === 'BEST' ? 'bg-success/20' :
                          landingPage['Performance Label'] === 'GOOD' ? 'bg-info/20' :
                          landingPage['Performance Label'] === 'LOW' ? 'bg-error/20' :
                          landingPage['Performance Label'] === 'PENDING' ? 'bg-warning/20' :
                          'bg-base-300'
                        }`}>
                          {landingPage['Performance Label'] === 'BEST' ? (
                            <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : landingPage['Performance Label'] === 'GOOD' ? (
                            <svg className="w-4 h-4 text-info" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                            </svg>
                          ) : landingPage['Performance Label'] === 'LOW' ? (
                            <svg className="w-4 h-4 text-error" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                            </svg>
                          ) : landingPage['Performance Label'] === 'PENDING' ? (
                            <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-base-content/40" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAsset(landingPage.asset_id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded-lg"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-gray-500">Landing Page URL</span>
                    </div>
                    <a 
                      href={landingPage['Landing Page URL']} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm break-all underline"
                    >
                      {landingPage['Landing Page URL']}
                    </a>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                    <div className="flex items-center gap-4">
                      <span>ID: {landingPage.asset_id}</span>
                      <span>{landingPage['Landing Page URL']?.length || 0} chars</span>
                    </div>
                    {landingPage.is_pending && (
                      <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        PENDING
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        landingPage['Performance Label'] === 'BEST' ? 'bg-green-100 text-green-800' :
                        landingPage['Performance Label'] === 'GOOD' ? 'bg-blue-100 text-blue-800' :
                        landingPage['Performance Label'] === 'LOW' ? 'bg-red-100 text-red-800' :
                        landingPage['Performance Label'] === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {landingPage['Performance Label'] || 'UNKNOWN'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Image Library Modal */}
      {showImageLibrary && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">Select Image</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {libraryImages.map((image, index) => (
                <div
                  key={`${image.asset_id}-${index}`}
                  className={`cursor-pointer border-2 rounded-lg p-2 ${
                    String(selectedImage?.asset_id) === String(image.asset_id) ? 'border-primary' : 'border-transparent'
                  }`}
                  onClick={() => {
                    console.log('Clicked image:', image.asset_id, 'Current selected:', selectedImage?.asset_id);
                    setSelectedImage(image);
                  }}
                >
                  <img
                    src={image['Image URL'] || image['Asset URL']}
                    alt="Library Image"
                    className="w-full h-24 object-cover rounded"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                    }}
                  />
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

      {/* Video Library Modal */}
      {showVideoLibrary && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">Select Video</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {libraryVideos.map((video) => (
                <div
                  key={video.asset_id}
                  className={`cursor-pointer border-2 rounded-lg p-2 ${
                    selectedVideo?.asset_id === video.asset_id ? 'border-primary' : 'border-transparent'
                  }`}
                  onClick={() => setSelectedVideo(video)}
                >
                  <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden mb-2">
                    <iframe
                      src={`https://www.youtube.com/embed/${video['Video ID'] || video['Asset URL']?.split('v=')[1]}`}
                      title={video['Video Title'] || video['Text Content']}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                  <p className="text-sm font-medium truncate">
                    {video['Video Title'] || video['Text Content'] || 'Untitled Video'}
                  </p>
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

      {/* Headline Modal */}
      {showHeadlineModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              Add {headlineType === 'HEADLINE' ? 'Short' : 'Long'} Headline
            </h3>
            <textarea
              className="textarea textarea-bordered w-full mb-4"
              placeholder="Enter headline text..."
              value={newHeadline}
              onChange={(e) => setNewHeadline(e.target.value)}
              rows={3}
            />
            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={headlineType === 'HEADLINE' ? handleAddShortHeadline : handleAddLongHeadline}
                disabled={!newHeadline.trim()}
              >
                Add {headlineType === 'HEADLINE' ? 'Short' : 'Long'} Headline
              </button>
              <button
                className="btn"
                onClick={() => {
                  setShowHeadlineModal(false);
                  setNewHeadline('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Description Modal */}
      {showDescriptionModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Add Description</h3>
            <textarea
              className="textarea textarea-bordered w-full mb-4"
              placeholder="Enter description text..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={4}
            />
            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={handleAddDescription}
                disabled={!newDescription.trim()}
              >
                Add Description
              </button>
              <button
                className="btn"
                onClick={() => {
                  setShowDescriptionModal(false);
                  setNewDescription('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Landing Page Modal */}
      {showLandingPageModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg mb-4">Add Landing Page URL</h3>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Landing Page URL</span>
              </label>
              <input
                type="url"
                className="input input-bordered w-full"
                placeholder="https://example.com"
                value={newLandingPage}
                onChange={(e) => setNewLandingPage(e.target.value)}
              />
              <label className="label">
                <span className="label-text-alt">Enter the full URL where users will be directed</span>
              </label>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={handleAddLandingPage}
                disabled={!newLandingPage.trim()}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Landing Page
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setShowLandingPageModal(false);
                  setNewLandingPage('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
