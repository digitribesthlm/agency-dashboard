import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { accountId } = req.query;
    const { db } = await connectToDatabase();
    
    // Get assets and performance data
    const assets = await db.collection('PMax_Assets')
      .find({ 'Account ID': Number(accountId) })
      .toArray();

    // Get performance data
    const performance = await db.collection('PMax_Assets_Performance')
      .find({ 'Account ID': Number(accountId) })
      .toArray();

    // Create a map of performance data by Asset ID
    const performanceMap = performance.reduce((acc, perf) => {
      acc[perf['Asset ID']] = perf['Performance Label'];
      return acc;
    }, {});

    // Group assets with performance data
    const groupedAssets = assets.reduce((acc, asset) => {
      const campaignId = asset['Campaign ID'];
      const assetGroupId = asset['Asset Group ID'];
      
      // Add performance label to asset
      const assetWithPerformance = {
        ...asset,
        'Performance Label': performanceMap[asset['Asset ID']] || 'UNKNOWN'
      };

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
          shortHeadlines: [],
          longHeadlines: [],
          descriptions: [],
          images: [],
          videos: [],
          callToActions: [],
          finalUrl: asset['Final URL']
        };
      }

      const group = acc[campaignId].assetGroups[assetGroupId];

      // Categorize asset
      if (assetWithPerformance['Asset Type'] === 'TEXT') {
        if (assetWithPerformance['Field Type'] === 'HEADLINE') {
          // Short headlines (HEADLINE field type)
          if (!group.shortHeadlines) group.shortHeadlines = [];
          group.shortHeadlines.push(assetWithPerformance);
          // Keep the original headlines array for backward compatibility
          group.headlines.push(assetWithPerformance);
        } else if (assetWithPerformance['Field Type'] === 'LONG_HEADLINE') {
          // Long headlines (LONG_HEADLINE field type)
          if (!group.longHeadlines) group.longHeadlines = [];
          group.longHeadlines.push(assetWithPerformance);
          // Also add to headlines array for backward compatibility
          group.headlines.push(assetWithPerformance);
        } else if (assetWithPerformance['Field Type'] === 'DESCRIPTION') {
          group.descriptions.push(assetWithPerformance);
        } else if (assetWithPerformance['Text Content'] === 'Watch Video') {
          group.callToActions.push(assetWithPerformance);
        }
      } else if (assetWithPerformance['Asset Type'] === 'IMAGE') {
        group.images.push(assetWithPerformance);
      } else if (assetWithPerformance['Asset Type'] === 'VIDEO' || assetWithPerformance['Video ID']) {
        // Check if video already exists to prevent duplicates
        const videoExists = group.videos.some(v => 
          v['Video ID'] === assetWithPerformance['Video ID'] || 
          v['Video Title'] === assetWithPerformance['Video Title']
        );
        if (!videoExists && (assetWithPerformance['Video ID'] || assetWithPerformance['Video Title'])) {
          group.videos.push(assetWithPerformance);
        }
      }

      return acc;
    }, {});

    // Convert to array format
    const formattedData = Object.values(groupedAssets).map(campaign => ({
      ...campaign,
      assetGroups: Object.values(campaign.assetGroups)
    }));

    return res.status(200).json({
      success: true,
      data: formattedData
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 