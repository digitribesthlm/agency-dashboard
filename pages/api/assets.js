import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { accountId } = req.query;
    const { db } = await connectToDatabase();
    
    // Get assets from PMax_Assets collection
    const assets = await db.collection('PMax_Assets')
      .find({ 'Account ID': Number(accountId) })
      .toArray();

    // Debug log for images
    const images = assets.filter(asset => asset['Asset Type'] === 'IMAGE');
    console.log('Image assets:', images.map(img => ({
      url: img['Image URL'],
      type: img['Asset Type']
    })));

    // Group everything by Campaign and Asset Group
    const groupedAssets = assets.reduce((acc, asset) => {
      const campaignId = asset['Campaign ID'];
      const assetGroupId = asset['Asset Group ID'];
      
      // Initialize campaign if it doesn't exist
      if (!acc[campaignId]) {
        acc[campaignId] = {
          campaignName: asset['Campaign Name'],
          campaignId: campaignId,
          campaignStatus: asset['Campaign Status'],
          assetGroups: {}
        };
      }

      // Initialize asset group if it doesn't exist
      if (!acc[campaignId].assetGroups[assetGroupId]) {
        acc[campaignId].assetGroups[assetGroupId] = {
          assetGroupName: asset['Asset Group Name'],
          assetGroupId: assetGroupId,
          assetGroupStatus: asset['Asset Group Status'],
          headlines: [],
          descriptions: [],
          images: [],
          videos: [],
          callToActions: [],
          finalUrl: asset['Final URL']
        };
      }

      const group = acc[campaignId].assetGroups[assetGroupId];

      // Categorize asset based on Asset Type and Field Type
      if (asset['Asset Type'] === 'TEXT') {
        if (asset['Field Type'] === 'HEADLINE') {
          group.headlines.push(asset);
        } else if (asset['Field Type'] === 'DESCRIPTION') {
          group.descriptions.push(asset);
        } else if (asset['Text Content'] === 'Watch Video') {
          group.callToActions.push(asset);
        }
      } else if (asset['Asset Type'] === 'IMAGE' || asset['Field Type'] === 'MARKETING_IMAGE') {
        // Include all image assets, even if Image URL is "View Image"
        group.images.push({
          ...asset,
          // You might want to add a placeholder URL here
          displayUrl: asset['Image URL'] === 'View Image' 
            ? '/placeholder-image.png'  // Add a placeholder image path
            : asset['Image URL']
        });
      } else if (asset['Asset Type'] === 'VIDEO' || asset['Video ID']) {
        // Check if video already exists by either Video ID or Title
        const videoExists = group.videos.some(v => 
          (asset['Video ID'] && v['Video ID'] === asset['Video ID']) || 
          (asset['Video Title'] && v['Video Title'] === asset['Video Title'])
        );
        
        if (!videoExists) {
          group.videos.push(asset);
          console.log(`Added unique video: ${asset['Video Title']}`); // Debug log
        } else {
          console.log(`Skipped duplicate video: ${asset['Video Title']}`); // Debug log
        }
      }

      return acc;
    }, {});

    // Convert to array format
    const formattedData = Object.values(groupedAssets).map(campaign => ({
      ...campaign,
      assetGroups: Object.values(campaign.assetGroups).map(group => ({
        ...group,
        // Deduplicate videos based on Video ID
        videos: Array.from(new Map(
          group.videos.map(video => [video['Video ID'], video])
        ).values())
      }))
    }));

    console.log('Final asset groups with images:', 
      Object.values(groupedAssets).map(campaign => ({
        campaignName: campaign.campaignName,
        assetGroups: Object.values(campaign.assetGroups).map(group => ({
          groupName: group.assetGroupName,
          imageCount: group.images.length,
          imageUrls: group.images.map(img => img['Image URL'])
        }))
      }))
    );

    console.log('Videos after deduplication:', 
      formattedData.map(campaign => ({
        campaignName: campaign.campaignName,
        assetGroups: campaign.assetGroups.map(group => ({
          groupName: group.assetGroupName,
          videos: group.videos.map(v => ({
            title: v['Video Title'],
            id: v['Video ID']
          }))
        }))
      }))
    );

    return res.status(200).json({
      success: true,
      data: formattedData
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 