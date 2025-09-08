import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';

export default function CreateAd() {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [existingCampaigns, setExistingCampaigns] = useState([]);
  const [existingAssetGroups, setExistingAssetGroups] = useState([]);
  const [isNewCampaign, setIsNewCampaign] = useState(true);
  const [isNewAssetGroup, setIsNewAssetGroup] = useState(true);
  const [formData, setFormData] = useState({
    campaignName: '',
    campaignStatus: 'ENABLED',
    assetGroups: [{
      assetGroupName: '',
      assetGroupStatus: 'ENABLED',
      headlines: [],
      longHeadlines: [],
      descriptions: [],
      images: [],
      videos: [],
      callToActions: [],
      finalUrl: ''
    }]
  });
  const [showImageModal, setShowImageModal] = useState(false);
  const [availableImages, setAvailableImages] = useState([]);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [availableVideos, setAvailableVideos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const createOrUseIds = () => {
    const generatedCampaignId = Date.now().toString();
    const generatedAssetGroupId = `${generatedCampaignId}-ag`;

    const finalCampaignId = isNewCampaign
      ? generatedCampaignId
      : (formData.campaignId || existingCampaigns.find(c => c.campaignName === formData.campaignName)?.campaignId || generatedCampaignId);

    const finalAssetGroupId = isNewAssetGroup
      ? generatedAssetGroupId
      : (() => {
          const selectedCampaign = existingCampaigns.find(c => c.campaignName === formData.campaignName);
          const selectedGroup = selectedCampaign?.assetGroups.find(ag => ag.assetGroupName === formData.assetGroups[0].assetGroupName);
          return selectedGroup?.assetGroupId || generatedAssetGroupId;
        })();

    return { finalCampaignId, finalAssetGroupId };
  };

  const submitCreateCampaign = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const { finalCampaignId, finalAssetGroupId } = createOrUseIds();

      const campaignName = formData.campaignName || existingCampaigns.find(c => c.campaignId === finalCampaignId)?.campaignName || 'Untitled Campaign';
      const assetGroupName = formData.assetGroups[0].assetGroupName || 'Default Asset Group';

      const postAsset = async (payload) => {
        const res = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_id: finalCampaignId,
            campaign_name: campaignName,
            campaign_status: 'PENDING',
            asset_group_id: finalAssetGroupId,
            asset_group_name: assetGroupName,
            ...payload,
          })
        });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || 'Failed to create asset');
        }
        return res.json();
      };

      const requests = [];

      // Headlines
      formData.assetGroups[0].headlines
        .filter(h => h && h['Text Content'])
        .forEach(h => {
          requests.push(postAsset({
            asset_type: 'TEXT',
            field_type: 'HEADLINE',
            text_content: h['Text Content']
          }));
        });

      // Long Headlines
      formData.assetGroups[0].longHeadlines
        .filter(h => h && h['Text Content'])
        .forEach(h => {
          requests.push(postAsset({
            asset_type: 'TEXT',
            field_type: 'LONG_HEADLINE',
            text_content: h['Text Content']
          }));
        });

      // Descriptions
      formData.assetGroups[0].descriptions
        .filter(d => d && d['Text Content'])
        .forEach(d => {
          requests.push(postAsset({
            asset_type: 'TEXT',
            field_type: 'DESCRIPTION',
            text_content: d['Text Content']
          }));
        });

      // Images
      formData.assetGroups[0].images
        .filter(img => img && (img['Image URL'] || img['Asset URL']))
        .forEach(img => {
          requests.push(postAsset({
            asset_type: 'IMAGE',
            asset_url: img['Image URL'] || img['Asset URL']
          }));
        });

      // Videos
      formData.assetGroups[0].videos
        .filter(v => v && v['Video ID'])
        .forEach(v => {
          const assetUrl = `https://www.youtube.com/watch?v=${v['Video ID']}`;
          requests.push(postAsset({
            asset_type: 'YOUTUBE_VIDEO',
            asset_url: assetUrl,
            text_content: v['Video Title'] || ''
          }));
        });

      // Landing page
      if (formData.assetGroups[0].finalUrl) {
        requests.push(postAsset({
          asset_type: 'TEXT',
          field_type: 'LANDING_PAGE',
          landing_page_url: formData.assetGroups[0].finalUrl
        }));
      }

      await Promise.all(requests);

      // Navigate to the new/existing asset group page
      window.location.href = `/campaigns/${finalCampaignId}/${finalAssetGroupId}`;
    } catch (err) {
      console.error('Create campaign failed:', err);
      setSubmitError('Failed to create campaign. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        // Pull all assets and group them into campaigns and asset groups
        const res = await fetch('/api/assets?all=true');
        const assets = await res.json();

        // Group by campaign and asset group
        const campaignIdToData = new Map();

        assets.forEach(asset => {
          const campaignId = asset.campaign_id;
          const campaignName = asset.campaign_name;
          const assetGroupId = asset.asset_group_id;
          const assetGroupName = asset.asset_group_name;

          if (!campaignIdToData.has(campaignId)) {
            campaignIdToData.set(campaignId, {
              campaignId,
              campaignName,
              assetGroups: new Map(),
            });
          }

          const campaign = campaignIdToData.get(campaignId);
          if (!campaign.assetGroups.has(assetGroupId)) {
            campaign.assetGroups.set(assetGroupId, {
              assetGroupId,
              assetGroupName,
            });
          }
        });

        const campaigns = Array.from(campaignIdToData.values()).map(c => ({
          campaignId: c.campaignId,
          campaignName: c.campaignName,
          assetGroups: Array.from(c.assetGroups.values()),
        }));

        setExistingCampaigns(campaigns);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      }
    };

    fetchExistingData();
  }, [session]);

  useEffect(() => {
    const fetchAvailableAssets = async () => {
      try {
        const [imagesRes, videosRes] = await Promise.all([
          fetch('/api/assets?all=true&asset_type=IMAGE'),
          fetch('/api/assets?all=true&asset_type=YOUTUBE_VIDEO')
        ]);
        const [imagesData, videosData] = await Promise.all([
          imagesRes.json(),
          videosRes.json()
        ]);

        const uniqueImages = imagesData.reduce((acc, img) => {
          const key = String(img.asset_id);
          if (!acc.map.has(key)) {
            acc.map.set(key, true);
            acc.items.push({
              'Asset ID': img.asset_id,
              'Asset URL': img['Asset URL'] || img.asset_url,
              'Image URL': img['Image URL'] || img.asset_url,
            });
          }
          return acc;
        }, { map: new Map(), items: [] }).items;

        const uniqueVideos = videosData.reduce((acc, v) => {
          const key = String(v.asset_id);
          if (!acc.map.has(key)) {
            acc.map.set(key, true);
            const videoId = v['Video ID'] || (v['Asset URL']?.split('v=')[1]) || (v.asset_url?.split('v=')[1]);
            acc.items.push({
              'Asset ID': v.asset_id,
              'Asset URL': v['Asset URL'] || v.asset_url,
              'Video ID': videoId,
              'Video Title': v['Video Title'] || v.text_content,
            });
          }
          return acc;
        }, { map: new Map(), items: [] }).items;

        setAvailableImages(uniqueImages);
        setAvailableVideos(uniqueVideos);
      } catch (error) {
        console.error('Error fetching assets:', error);
      }
    };

    fetchAvailableAssets();
  }, [session]);

  const handleHeadlineChange = (index, value) => {
    const newAssetGroups = [...formData.assetGroups];
    if (!newAssetGroups[0].headlines[index]) {
      newAssetGroups[0].headlines[index] = {};
    }
    newAssetGroups[0].headlines[index] = {
      'Text Content': value,
      'Asset ID': `temp_${Date.now()}`
    };
    setFormData({ ...formData, assetGroups: newAssetGroups });
  };

  const handleDescriptionChange = (index, value) => {
    const newAssetGroups = [...formData.assetGroups];
    if (!newAssetGroups[0].descriptions[index]) {
      newAssetGroups[0].descriptions[index] = {};
    }
    newAssetGroups[0].descriptions[index] = {
      'Text Content': value,
      'Asset ID': `temp_${Date.now()}`
    };
    setFormData({ ...formData, assetGroups: newAssetGroups });
  };

  const handleLongHeadlineChange = (index, value) => {
    const newAssetGroups = [...formData.assetGroups];
    if (!newAssetGroups[0].longHeadlines[index]) {
      newAssetGroups[0].longHeadlines[index] = {};
    }
    newAssetGroups[0].longHeadlines[index] = {
      'Text Content': value,
      'Asset ID': `temp_${Date.now()}`
    };
    setFormData({ ...formData, assetGroups: newAssetGroups });
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Campaign Selection</h2>
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                className={`btn ${isNewCampaign ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setIsNewCampaign(true)}
              >
                Create New Campaign
              </button>
              <button
                type="button"
                className={`btn ${!isNewCampaign ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setIsNewCampaign(false)}
              >
                Use Existing Campaign
              </button>
            </div>

            {isNewCampaign ? (
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Name</label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.campaignName}
                  onChange={(e) => setFormData({
                    ...formData,
                    campaignName: e.target.value
                  })}
                />
              </div>
            ) : (
              <select
                className="select select-bordered w-full"
                value={formData.campaignName}
                onChange={(e) => {
                  const campaign = existingCampaigns.find(c => c.campaignName === e.target.value);
                  setFormData({
                    ...formData,
                    campaignName: e.target.value,
                    campaignId: campaign?.campaignId
                  });
                }}
              >
                <option value="">Select a campaign</option>
                {existingCampaigns.map((campaign) => (
                  <option key={campaign.campaignId} value={campaign.campaignName}>
                    {campaign.campaignName}
                  </option>
                ))}
              </select>
            )}
            <button 
              className="btn btn-primary mt-4"
              onClick={() => setStep(2)}
              disabled={!formData.campaignName}
            >
              Next: Asset Group
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Asset Group</h2>
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                className={`btn ${isNewAssetGroup ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setIsNewAssetGroup(true)}
              >
                Create New Asset Group
              </button>
              <button
                type="button"
                className={`btn ${!isNewAssetGroup ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setIsNewAssetGroup(false)}
                disabled={isNewCampaign}
              >
                Use Existing Asset Group
              </button>
            </div>

            {isNewAssetGroup ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Asset Group Name</label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={formData.assetGroups[0].assetGroupName}
                    onChange={(e) => setFormData({
                      ...formData,
                      assetGroups: [{
                        ...formData.assetGroups[0],
                        assetGroupName: e.target.value
                      }]
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Final URL</label>
                  <input
                    type="url"
                    className="input input-bordered w-full"
                    value={formData.assetGroups[0].finalUrl}
                    onChange={(e) => setFormData({
                      ...formData,
                      assetGroups: [{
                        ...formData.assetGroups[0],
                        finalUrl: e.target.value
                      }]
                    })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            ) : (
              <select
                className="select select-bordered w-full"
                value={formData.assetGroups[0].assetGroupName}
                onChange={(e) => {
                  const campaign = existingCampaigns.find(c => c.campaignName === formData.campaignName);
                  const assetGroup = campaign?.assetGroups.find(ag => ag.assetGroupName === e.target.value);
                  if (assetGroup) {
                    setFormData({
                      ...formData,
                      assetGroups: [{
                        ...assetGroup,
                        headlines: [],
                        descriptions: [],
                        images: [],
                        videos: []
                      }]
                    });
                  }
                }}
              >
                <option value="">Select an asset group</option>
                {!isNewCampaign && existingCampaigns
                  .find(c => c.campaignName === formData.campaignName)
                  ?.assetGroups.map((group) => (
                    <option key={group.assetGroupId} value={group.assetGroupName}>
                      {group.assetGroupName}
                    </option>
                  ))}
              </select>
            )}

            <div className="flex justify-between mt-6">
              <button 
                className="btn btn-outline"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setStep(3)}
                disabled={!formData.assetGroups[0].assetGroupName || (isNewAssetGroup && !formData.assetGroups[0].finalUrl)}
              >
                Next: Headlines
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Headlines</h2>
            <div className="space-y-4">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="form-control">
                  <label className="label">
                    <span className="label-text">Headline {index + 1}</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={formData.assetGroups[0].headlines[index]?.['Text Content'] || ''}
                    onChange={(e) => handleHeadlineChange(index, e.target.value)}
                    placeholder={`Enter headline ${index + 1}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6">
              <button 
                className="btn btn-outline"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setStep(4)}
                disabled={!formData.assetGroups[0].headlines.some(h => h?.['Text Content'])}
              >
                Next: Long Headlines
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Long Headlines</h2>
            <div className="space-y-4">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="form-control">
                  <label className="label">
                    <span className="label-text">Long Headline {index + 1}</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={formData.assetGroups[0].longHeadlines[index]?.['Text Content'] || ''}
                    onChange={(e) => handleLongHeadlineChange(index, e.target.value)}
                    placeholder={`Enter long headline ${index + 1}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6">
              <button 
                className="btn btn-outline"
                onClick={() => setStep(3)}
              >
                Back
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setStep(5)}
                disabled={!formData.assetGroups[0].longHeadlines.some(h => h?.['Text Content'])}
              >
                Next: Descriptions
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Descriptions</h2>
            <div className="space-y-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="form-control">
                  <label className="label">
                    <span className="label-text">Description {index + 1}</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered w-full"
                    value={formData.assetGroups[0].descriptions[index]?.['Text Content'] || ''}
                    onChange={(e) => handleDescriptionChange(index, e.target.value)}
                    placeholder={`Enter description ${index + 1}`}
                    rows="3"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6">
              <button 
                className="btn btn-outline"
                onClick={() => setStep(4)}
              >
                Back
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setStep(6)}
                disabled={!formData.assetGroups[0].descriptions.some(d => d?.['Text Content'])}
              >
                Next: Images
              </button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Images</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {formData.assetGroups[0].images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image['Image URL']}
                      alt={`Selected ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      className="btn btn-circle btn-sm absolute top-2 right-2"
                      onClick={() => {
                        const newImages = formData.assetGroups[0].images.filter((_, i) => i !== index);
                        setFormData({
                          ...formData,
                          assetGroups: [{
                            ...formData.assetGroups[0],
                            images: newImages
                          }]
                        });
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-primary w-full"
                onClick={() => setShowImageModal(true)}
              >
                Select Images
              </button>
            </div>
            <div className="flex justify-between mt-6">
              <button 
                className="btn btn-outline"
                onClick={() => setStep(5)}
              >
                Back
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setStep(7)}
              >
                Next: Videos
              </button>
            </div>

            {showImageModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-base-100 p-6 rounded-lg w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-4">Select Images</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {availableImages.map((image, index) => (
                      <div 
                        key={index}
                        className={`relative cursor-pointer rounded-lg overflow-hidden ${
                          formData.assetGroups[0].images.some(i => i['Asset ID'] === image['Asset ID'])
                            ? 'ring-2 ring-primary'
                            : ''
                        }`}
                        onClick={() => {
                          const isSelected = formData.assetGroups[0].images.some(
                            i => i['Asset ID'] === image['Asset ID']
                          );
                          let newImages = [...formData.assetGroups[0].images];
                          
                          if (isSelected) {
                            newImages = newImages.filter(i => i['Asset ID'] !== image['Asset ID']);
                          } else {
                            newImages.push(image);
                          }
                          
                          setFormData({
                            ...formData,
                            assetGroups: [{
                              ...formData.assetGroups[0],
                              images: newImages
                            }]
                          });
                        }}
                      >
                        <img
                          src={image['Image URL']}
                          alt={`Asset ${image['Asset ID']}`}
                          className="w-full h-48 object-cover"
                        />
                        {formData.assetGroups[0].images.some(i => i['Asset ID'] === image['Asset ID']) && (
                          <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-6">
                    <button 
                      className="btn btn-primary"
                      onClick={() => setShowImageModal(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Videos</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {formData.assetGroups[0].videos.map((video, index) => (
                  <div key={index} className="relative">
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${video['Video ID']}`}
                        title={`Video ${index + 1}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <button
                      className="btn btn-circle btn-sm absolute top-2 right-2 bg-base-100"
                      onClick={() => {
                        const newVideos = formData.assetGroups[0].videos.filter((_, i) => i !== index);
                        setFormData({
                          ...formData,
                          assetGroups: [{
                            ...formData.assetGroups[0],
                            videos: newVideos
                          }]
                        });
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  className="btn btn-primary flex-1"
                  onClick={() => setShowVideoModal(true)}
                >
                  Select Existing Videos
                </button>
                <div className="divider divider-horizontal">OR</div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Enter YouTube Video ID"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value) {
                        const videoId = e.target.value.trim();
                        // Extract video ID if full URL is pasted
                        const match = videoId.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                        const finalVideoId = match ? match[1] : videoId;
                        
                        setFormData({
                          ...formData,
                          assetGroups: [{
                            ...formData.assetGroups[0],
                            videos: [...formData.assetGroups[0].videos, {
                              'Video ID': finalVideoId,
                              'Asset ID': `temp_${Date.now()}`
                            }]
                          }]
                        });
                        e.target.value = '';
                      }
                    }}
                  />
                  <p className="text-xs text-base-content/70">
                    Paste YouTube video ID or full URL and press Enter
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button 
                className="btn btn-outline"
                onClick={() => setStep(6)}
              >
                Back
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setStep(8)}
              >
                Next: URL
              </button>
            </div>

            {showVideoModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-base-100 p-6 rounded-lg w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-4">Select Videos</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {availableVideos.map((video, index) => (
                      <div 
                        key={index}
                        className={`relative cursor-pointer rounded-lg overflow-hidden ${
                          formData.assetGroups[0].videos.some(v => v['Asset ID'] === video['Asset ID'])
                            ? 'ring-2 ring-primary'
                            : ''
                        }`}
                      >
                        <div className="aspect-video">
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${video['Video ID']}`}
                            title={`Video ${index + 1}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                        <button
                          className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 bg-black bg-opacity-50 flex items-center justify-center transition-opacity"
                          onClick={() => {
                            const isSelected = formData.assetGroups[0].videos.some(
                              v => v['Asset ID'] === video['Asset ID']
                            );
                            let newVideos = [...formData.assetGroups[0].videos];
                            
                            if (isSelected) {
                              newVideos = newVideos.filter(v => v['Asset ID'] !== video['Asset ID']);
                            } else {
                              newVideos.push(video);
                            }
                            
                            setFormData({
                              ...formData,
                              assetGroups: [{
                                ...formData.assetGroups[0],
                                videos: newVideos
                              }]
                            });
                          }}
                        >
                          {formData.assetGroups[0].videos.some(v => v['Asset ID'] === video['Asset ID'])
                            ? <span className="btn btn-primary">Remove</span>
                            : <span className="btn btn-primary">Select</span>
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-6">
                    <button 
                      className="btn btn-outline"
                      onClick={() => setShowVideoModal(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setShowVideoModal(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Landing Page URL</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Final URL</label>
                <input
                  type="url"
                  className="input input-bordered w-full"
                  value={formData.assetGroups[0].finalUrl}
                  onChange={(e) => setFormData({
                    ...formData,
                    assetGroups: [{
                      ...formData.assetGroups[0],
                      finalUrl: e.target.value
                    }]
                  })}
                  placeholder="https://www.example.com"
                />
                <p className="text-sm text-base-content/70 mt-2">
                  This is the page where users will land after clicking your ad
                </p>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button 
                className="btn btn-outline"
                onClick={() => setStep(7)}
              >
                Back
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setStep(9)}
                disabled={!formData.assetGroups[0].finalUrl}
              >
                Next: Review
              </button>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Review & Submit</h2>
            <div className="space-y-4">
              <div className="card bg-base-200 p-4">
                <h3 className="font-medium">Campaign</h3>
                <p>{formData.campaignName}</p>
              </div>
              
              <div className="card bg-base-200 p-4">
                <h3 className="font-medium">Asset Group</h3>
                <p>{formData.assetGroups[0].assetGroupName}</p>
                <p className="text-sm text-base-content/70">{formData.assetGroups[0].finalUrl}</p>
              </div>

              <div className="card bg-base-200 p-4">
                <h3 className="font-medium">Headlines ({formData.assetGroups[0].headlines.length})</h3>
                <ul className="list-disc list-inside">
                  {formData.assetGroups[0].headlines.map((headline, index) => (
                    <li key={index}>{headline['Text Content']}</li>
                  ))}
                </ul>
              </div>

              <div className="card bg-base-200 p-4">
                <h3 className="font-medium">Descriptions ({formData.assetGroups[0].descriptions.length})</h3>
                <ul className="list-disc list-inside">
                  {formData.assetGroups[0].descriptions.map((desc, index) => (
                    <li key={index}>{desc['Text Content']}</li>
                  ))}
                </ul>
              </div>

              <div className="card bg-base-200 p-4">
                <h3 className="font-medium">Images ({formData.assetGroups[0].images.length})</h3>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {formData.assetGroups[0].images.map((image, index) => (
                    <img
                      key={index}
                      src={image['Image URL']}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-20 object-cover rounded"
                    />
                  ))}
                </div>
              </div>

              <div className="card bg-base-200 p-4">
                <h3 className="font-medium mb-4">Videos ({formData.assetGroups[0].videos.length})</h3>
                <div className="grid grid-cols-2 gap-4">
                  {formData.assetGroups[0].videos.map((video, index) => (
                    <div key={index} className="space-y-2">
                      <div className="aspect-video rounded-lg overflow-hidden">
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${video['Video ID']}`}
                          title={`Video ${index + 1}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      <div className="text-sm text-base-content/70">
                        Video ID: {video['Video ID']}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <button 
                className="btn btn-outline"
                onClick={() => setStep(8)}
              >
                Back
              </button>
              <button 
                className={`btn btn-primary ${submitting ? 'loading' : ''}`}
                onClick={submitCreateCampaign}
                disabled={submitting}
              >
                {submitting ? 'Creating…' : 'Create Campaign'}
              </button>
            </div>
            {submitError && (
              <div className="alert alert-error mt-4">
                <span>{submitError}</span>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === stepNumber ? 'bg-primary text-white' : 
                  step > stepNumber ? 'bg-success text-white' : 'bg-base-200'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 9 && (
                  <div className={`h-1 w-10 ${
                    step > stepNumber ? 'bg-success' : 'bg-base-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-base-content/70">
            <span>Campaign</span>
            <span>Asset Group</span>
            <span>Headlines</span>
            <span>Long Headlines</span>
            <span>Descriptions</span>
            <span>Images</span>
            <span>Videos</span>
            <span>URL</span>
            <span>Review</span>
          </div>
        </div>
        
        {renderStep()}
      </div>
    </Layout>
  );
} 