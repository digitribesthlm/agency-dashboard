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

    // Get performance data from PMax_Assets_Performance collection
    const performance = await db.collection('PMax_Assets_Performance')
      .find({ 'Account ID': Number(accountId) })
      .toArray();

    // Create a map of performance data by Asset ID
    const performanceMap = performance.reduce((acc, perf) => {
      // Normalize Asset ID to string for consistent comparison
      const assetId = String(perf['Asset ID']);
      acc[assetId] = perf['Performance Label'];
      return acc;
    }, {});

    // Group assets with performance data
    const groupedAssets = assets.reduce((acc, asset) => {
      const campaignId = asset['Campaign ID'];
      const assetGroupId = asset['Asset Group ID'];
      
      // Add performance label to asset
      const assetIdStr = String(asset['Asset ID']);
      // Use performance data from PMax_Assets_Performance collection if available,
      // otherwise fall back to the existing Performance Max Label in the main collection
      const performanceLabel = performanceMap[assetIdStr] || asset['Performance Max Label'] || 'UNKNOWN';
      
      const assetWithPerformance = {
        ...asset,
        'Performance Label': performanceLabel
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
          campaignId: campaignId,
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

      // Categorize asset with deduplication within the asset group
      if (assetWithPerformance['Asset Type'] === 'TEXT') {
        if (assetWithPerformance['Field Type'] === 'HEADLINE') {
          // Short headlines (HEADLINE field type)
          if (!group.shortHeadlines) group.shortHeadlines = [];
          // Check if this exact asset already exists in this asset group
          const headlineExists = group.shortHeadlines.some(h => 
            h['Asset ID'] === assetWithPerformance['Asset ID']
          );
          if (!headlineExists) {
            group.shortHeadlines.push(assetWithPerformance);
          }
        } else if (assetWithPerformance['Field Type'] === 'LONG_HEADLINE') {
          // Long headlines (LONG_HEADLINE field type)
          if (!group.longHeadlines) group.longHeadlines = [];
          // Check if this exact asset already exists in this asset group
          const longHeadlineExists = group.longHeadlines.some(h => 
            h['Asset ID'] === assetWithPerformance['Asset ID']
          );
          if (!longHeadlineExists) {
            group.longHeadlines.push(assetWithPerformance);
          }
        } else if (assetWithPerformance['Field Type'] === 'DESCRIPTION') {
          // Check if this exact asset already exists in this asset group
          const descriptionExists = group.descriptions.some(d => 
            d['Asset ID'] === assetWithPerformance['Asset ID']
          );
          if (!descriptionExists) {
            group.descriptions.push(assetWithPerformance);
          }
        } else if (assetWithPerformance['Text Content'] === 'Watch Video') {
          // Check if this exact asset already exists in this asset group
          const ctaExists = group.callToActions.some(c => 
            c['Asset ID'] === assetWithPerformance['Asset ID']
          );
          if (!ctaExists) {
            group.callToActions.push(assetWithPerformance);
          }
        }
      } else if (assetWithPerformance['Asset Type'] === 'IMAGE') {
        // Check if this exact asset already exists in this asset group
        const imageExists = group.images.some(i => 
          i['Asset ID'] === assetWithPerformance['Asset ID']
        );
        if (!imageExists) {
          group.images.push(assetWithPerformance);
        }
      } else if (assetWithPerformance['Asset Type'] === 'VIDEO' || assetWithPerformance['Video ID']) {
        // Check if video already exists to prevent duplicates
        const videoExists = group.videos.some(v => 
          v['Asset ID'] === assetWithPerformance['Asset ID'] ||
          (v['Video ID'] === assetWithPerformance['Video ID'] && assetWithPerformance['Video ID'])
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