// One-time reset script: purge change log and pending data
// - Deletes all docs in 'asset_changes'
// - Deletes all docs in 'pending_headlines'
// - Unsets 'is_pending' on all docs in 'assets'

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'agency';

  if (!uri) {
    console.error('MONGODB_URI is not set. Please set it in .env.local or environment variables.');
    process.exit(1);
  }

  const client = new MongoClient(uri, { useUnifiedTopology: true, useNewUrlParser: true });
  try {
    await client.connect();
    const db = client.db(dbName);

    // 1) Purge change log
    let totalDeletedChanges = 0;
    try {
      const res = await db.collection('asset_changes').deleteMany({});
      totalDeletedChanges = res.deletedCount || 0;
      console.log(`[asset_changes] deleted: ${totalDeletedChanges}`);
    } catch (err) {
      if (err && err.codeName === 'NamespaceNotFound') {
        console.log('[asset_changes] collection does not exist, skipping');
      } else {
        console.error('[asset_changes] error:', err.message);
      }
    }

    // 2) Purge pending headlines
    let totalDeletedPendingHeadlines = 0;
    try {
      const res = await db.collection('pending_headlines').deleteMany({});
      totalDeletedPendingHeadlines = res.deletedCount || 0;
      console.log(`[pending_headlines] deleted: ${totalDeletedPendingHeadlines}`);
    } catch (err) {
      if (err && err.codeName === 'NamespaceNotFound') {
        console.log('[pending_headlines] collection does not exist, skipping');
      } else {
        console.error('[pending_headlines] error:', err.message);
      }
    }

    // 3) Clear is_pending from assets
    let totalUpdatedAssets = 0;
    try {
      const res = await db.collection('assets').updateMany(
        { is_pending: { $exists: true } },
        { $unset: { is_pending: '' } }
      );
      totalUpdatedAssets = res.modifiedCount || 0;
      console.log(`[assets] cleared is_pending on: ${totalUpdatedAssets}`);
    } catch (err) {
      if (err && err.codeName === 'NamespaceNotFound') {
        console.log('[assets] collection does not exist, skipping');
      } else {
        console.error('[assets] error:', err.message);
      }
    }

    console.log('Reset complete.', {
      deletedChanges: totalDeletedChanges,
      deletedPendingHeadlines: totalDeletedPendingHeadlines,
      clearedAssets: totalUpdatedAssets,
    });
  } catch (error) {
    console.error('Fatal error during reset:', error.message);
    process.exitCode = 1;
  } finally {
    try { await client.close(); } catch (_) {}
  }
}

run();


