import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { accountId } = req.query;
    const { db } = await connectToDatabase();
    
    // Get assets and performance data (exclude REMOVED assets)
    const assets = await db.collection('PMax_Assets')
      .find({ 
        'Account ID': Number(accountId),
        'Asset Status': { $ne: 'REMOVED' } // Exclude removed assets
      })
      .toArray();

    // Get pending images and add them to the assets
    const pendingImages = await db.collection('pending_images')
      .find({ 'Account ID': Number(accountId) })
      .toArray();

    // Combine assets with pending images
    const allAssets = [...assets, ...pendingImages];
    
    console.log(`Found ${assets.length} regular assets and ${pendingImages.length} pending images`);
    console.log('Sample pending image:', pendingImages[0]);

    // Get performance data from PMax_Assets_Performance collection
    const performance = await db.collection('PMax_Assets_Performance')
      .find({ 'Account ID': Number(accountId) })
      .toArray();

    // Create maps of performance data keyed by Composite ID and by Asset ID (fallback)
    const performanceMap = performance.reduce((acc, perf) => {
      const assetIdStr = String(perf['Asset ID']);
      const campaignIdStr = String(perf['Campaign ID']);
      // Performance collection uses 'AssetGroup ID' (no space)
      const assetGroupIdField = 'AssetGroup ID';
      const assetGroupIdStr = String(perf[assetGroupIdField]);

      const compositeId = `${campaignIdStr}_${assetGroupIdStr}_${assetIdStr}`;

      acc.byComposite[compositeId] = perf['Performance Label'];
      // Keep best-known label per Asset ID as a fallback (do not overwrite a non-UNKNOWN with UNKNOWN)
      const existing = acc.byAsset[assetIdStr];
      const incoming = perf['Performance Label'];
      if (!existing || existing === 'UNKNOWN') {
        acc.byAsset[assetIdStr] = incoming;
      }
      return acc;
    }, { byComposite: {}, byAsset: {} });

    // Group assets with performance data
    const groupedAssets = allAssets.reduce((acc, asset) => {
      const campaignId = asset['Campaign ID'];
      const assetGroupId = asset['AssetGroup ID'];
      
      // Add performance label to asset using Composite ID first, then fall back
      const assetIdStr = String(asset['Asset ID']);
      const compositeId = `${String(campaignId)}_${String(assetGroupId)}_${assetIdStr}`;
      // Use performance data from PMax_Assets_Performance collection if available,
      // otherwise fall back to the existing Performance Max Label in the main collection
      const performanceLabel = performanceMap.byComposite[compositeId]
        || performanceMap.byAsset[assetIdStr]
        || asset['Performance Label']
        || asset['Performance Max Label']
        || 'UNKNOWN';
      
      // Normalize URLs/fields due to upstream schema changes
      const normalizedFinalUrl = asset['Final URL'] || asset['Landing Page URL'] || asset['Final Url'] || null;
      const normalizedImageUrl = asset['Image URL'] || asset['Asset URL'] || null;

      const assetWithPerformance = {
        ...asset,
        'Performance Label': performanceLabel,
        'Composite ID': compositeId,
        // Keep original fields, but also ensure normalized ones are present
        'Final URL': normalizedFinalUrl,
        'Image URL': normalizedImageUrl
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
          campaignName: asset['Campaign Name'], // Add campaign name to asset group
          accountId: asset['Account ID'], // Add account ID to asset group
          assetGroupStatus: asset['Asset Group Status'],
          headlines: [],
          shortHeadlines: [],
          longHeadlines: [],
          descriptions: [],
          images: [],
          videos: [],
          callToActions: [],
          finalUrl: normalizedFinalUrl
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
      } else if (assetWithPerformance['Asset Type'] === 'VIDEO' || assetWithPerformance['Asset Type'] === 'YOUTUBE_VIDEO' || assetWithPerformance['Video ID']) {
        // Ensure a normalized video url is present
        if (!assetWithPerformance['Video URL']) {
          assetWithPerformance['Video URL'] = asset['Video URL'] || asset['Asset URL'] || null;
        }
        // If Video ID missing, try to derive from URL (e.g., https://www.youtube.com/watch?v=XXXX)
        if (!assetWithPerformance['Video ID'] && assetWithPerformance['Video URL']) {
          try {
            const url = new URL(assetWithPerformance['Video URL']);
            const vParam = url.searchParams.get('v');
            if (vParam) {
              assetWithPerformance['Video ID'] = vParam;
            }
          } catch (_) {}
        }
        // Check if video already exists to prevent duplicates
        const videoExists = group.videos.some(v => 
          v['Asset ID'] === assetWithPerformance['Asset ID'] ||
          (v['Video ID'] === assetWithPerformance['Video ID'] && assetWithPerformance['Video ID'])
        );
        // Allow append if we have any identifying info: Video ID, Title, or a Video URL
        if (!videoExists && (assetWithPerformance['Video ID'] || assetWithPerformance['Video Title'] || assetWithPerformance['Video URL'])) {
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