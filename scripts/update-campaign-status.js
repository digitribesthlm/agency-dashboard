const { MongoClient } = require('mongodb');

// Campaign status mapping based on the import data
const campaignStatusMap = {
  '21339730544': 'PAUSED', // Climberbi.co.uk - Performance Max - Event AI
  // Add more campaign IDs and their statuses as needed
};

async function updateCampaignStatus() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('agency_dashboard');
    
    console.log('Checking current campaign statuses...');
    
    // Get unique campaigns and their current status
    const campaigns = await db.collection('assets').aggregate([
      { $match: { status: { $ne: 'REMOVED' } } },
      { $group: { 
        _id: '$campaign_id', 
        campaign_name: { $first: '$campaign_name' },
        campaign_status: { $first: '$campaign_status' },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]).toArray();
    
    console.log('Current campaigns:');
    campaigns.forEach(campaign => {
      console.log(`Campaign ID: ${campaign._id}, Name: ${campaign.campaign_name}, Status: ${campaign.campaign_status || 'NOT SET'}, Assets: ${campaign.count}`);
    });
    
    // Update campaign status for known campaigns
    for (const [campaignId, status] of Object.entries(campaignStatusMap)) {
      console.log(`\nUpdating campaign ${campaignId} to status: ${status}`);
      
      const result = await db.collection('assets').updateMany(
        { campaign_id: campaignId },
        { $set: { campaign_status: status } }
      );
      
      console.log(`Updated ${result.modifiedCount} assets for campaign ${campaignId}`);
    }
    
    // Show updated statuses
    console.log('\nUpdated campaigns:');
    const updatedCampaigns = await db.collection('assets').aggregate([
      { $match: { status: { $ne: 'REMOVED' } } },
      { $group: { 
        _id: '$campaign_id', 
        campaign_name: { $first: '$campaign_name' },
        campaign_status: { $first: '$campaign_status' },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]).toArray();
    
    updatedCampaigns.forEach(campaign => {
      console.log(`Campaign ID: ${campaign._id}, Name: ${campaign.campaign_name}, Status: ${campaign.campaign_status || 'NOT SET'}, Assets: ${campaign.count}`);
    });
    
  } catch (error) {
    console.error('Error updating campaign status:', error);
  } finally {
    await client.close();
  }
}

updateCampaignStatus();

