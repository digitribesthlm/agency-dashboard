import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';

export default function ClientDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedAssetGroup, setSelectedAssetGroup] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchAssets = async () => {
      if (status === 'authenticated' && session?.user?.accountId) {
        try {
          setLoading(true);
          const res = await fetch(`/api/assets?accountId=${session.user.accountId}`);
          const data = await res.json();
          if (data.success) {
            setCampaigns(data.data);
          }
        } catch (error) {
          console.error('Error fetching assets:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAssets();
  }, [status, session]);

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      </Layout>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Will redirect in useEffect
  }

  console.log('Current campaigns:', campaigns);

  return (
    <Layout>
      <div className="p-4 max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="breadcrumbs text-sm mb-6">
          <ul>
            <li>
              <button 
                className="link link-primary" 
                onClick={() => {
                  setSelectedCampaign(null);
                  setSelectedAssetGroup(null);
                }}
              >
                Campaigns
              </button>
            </li>
            {selectedCampaign && (
              <li>
                <button 
                  className="link link-primary" 
                  onClick={() => setSelectedAssetGroup(null)}
                >
                  {selectedCampaign.campaignName}
                </button>
              </li>
            )}
            {selectedAssetGroup && (
              <li>{selectedAssetGroup.assetGroupName}</li>
            )}
          </ul>
        </div>

        {/* Main Content */}
        {!selectedCampaign ? (
          <CampaignsList 
            campaigns={campaigns} 
            onSelect={setSelectedCampaign} 
          />
        ) : !selectedAssetGroup ? (
          <AssetGroupsList 
            assetGroups={selectedCampaign.assetGroups} 
            onSelect={setSelectedAssetGroup} 
          />
        ) : (
          <AssetGroupDetail assetGroup={selectedAssetGroup} />
        )}
      </div>
    </Layout>
  );
}

// Split into smaller components for better performance
const CampaignsList = ({ campaigns, onSelect }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {campaigns.map((campaign) => (
      <div 
        key={campaign.campaignId}
        onClick={() => onSelect(campaign)}
        className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
      >
        <div className="card-body">
          <h2 className="card-title">{campaign.campaignName}</h2>
          <div className="badge badge-lg gap-2 mt-2">
            <span className={`badge ${
              campaign.campaignStatus === 'ENABLED' 
                ? 'badge-success' 
                : 'badge-error'
            }`}>
              {campaign.campaignStatus}
            </span>
          </div>
          <div className="stats stats-vertical shadow mt-4">
            <div className="stat place-items-center">
              <div className="stat-title">Asset Groups</div>
              <div className="stat-value text-primary">
                {campaign.assetGroups.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const AssetGroupsList = ({ assetGroups, onSelect }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {assetGroups.map((group) => (
      <div 
        key={group.assetGroupId}
        onClick={() => onSelect(group)}
        className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
      >
        <div className="card-body">
          <h2 className="card-title">{group.assetGroupName}</h2>
          <div className="badge badge-lg gap-2 mt-2">
            <span className={`badge ${
              group.assetGroupStatus === 'ENABLED' 
                ? 'badge-success' 
                : 'badge-error'
            }`}>
              {group.assetGroupStatus}
            </span>
          </div>
          <div className="stats stats-vertical shadow mt-4">
            <div className="stat place-items-center">
              <div className="stat-title">Headlines</div>
              <div className="stat-value text-primary">{group.headlines.length}</div>
            </div>
            <div className="stat place-items-center">
              <div className="stat-title">Descriptions</div>
              <div className="stat-value text-secondary">{group.descriptions.length}</div>
            </div>
            <div className="stat place-items-center">
              <div className="stat-title">Images</div>
              <div className="stat-value text-accent">{group.images.length}</div>
            </div>
            <div className="stat place-items-center">
              <div className="stat-title">Videos</div>
              <div className="stat-value text-info">
                {group.videos?.length || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const AssetGroupDetail = ({ assetGroup }) => (
  <div className="space-y-8">
    {/* Headlines Section */}
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Headlines</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assetGroup.headlines.map((headline, index) => (
            <div key={index} className="card bg-base-200">
              <div className="card-body p-4">
                <p>{headline['Text Content']}</p>
              </div>
            </div>
          ))}
          {assetGroup.headlines.length === 0 && (
            <p className="text-gray-500 italic">No headlines available</p>
          )}
        </div>
      </div>
    </div>

    {/* Descriptions Section */}
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Descriptions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assetGroup.descriptions.map((desc, index) => (
            <div key={index} className="card bg-base-200">
              <div className="card-body p-4">
                <p>{desc['Text Content']}</p>
              </div>
            </div>
          ))}
          {assetGroup.descriptions.length === 0 && (
            <p className="text-gray-500 italic">No descriptions available</p>
          )}
        </div>
      </div>
    </div>

    {/* Images Section */}
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Images ({assetGroup.images.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assetGroup.images.map((image, index) => (
            <div key={index} className="card bg-base-200">
              <figure className="relative aspect-square">
                {image['Image URL'] === 'View Image' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-base-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-base-content/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="mt-2 text-sm text-base-content/60">Marketing Image</span>
                    <span className="text-xs text-base-content/40">ID: {image['Asset ID']}</span>
                  </div>
                ) : (
                  <img 
                    src={image['Image URL']} 
                    alt={`Marketing Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </figure>
              <div className="card-body p-3">
                <div className="text-xs text-base-content/60">
                  Field Type: {image['Field Type']}
                </div>
                {image['Performance Max Label'] && (
                  <div className="badge badge-sm">
                    {image['Performance Max Label']}
                  </div>
                )}
              </div>
            </div>
          ))}
          {assetGroup.images.length === 0 && (
            <p className="text-gray-500 italic col-span-full">No images available</p>
          )}
        </div>
      </div>
    </div>

    {/* Videos Section */}
    {assetGroup.videos && assetGroup.videos.length > 0 && (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Videos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assetGroup.videos.map((video, index) => (
              <div key={index} className="card bg-base-200">
                <div className="card-body p-4">
                  <h3 className="font-semibold">
                    {video['Video Title'] || `Video ${index + 1}`}
                  </h3>
                  {video['Video ID'] && (
                    <div className="aspect-video mt-2">
                      <iframe
                        className="w-full h-full rounded-lg"
                        src={`https://www.youtube.com/embed/${video['Video ID']}`}
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* Call to Actions Section */}
    {assetGroup.callToActions && assetGroup.callToActions.length > 0 && (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Call to Actions</h2>
          <div className="flex flex-wrap gap-4">
            {assetGroup.callToActions.map((cta, index) => (
              <div key={index} className="badge badge-primary badge-lg">
                {cta['Text Content']}
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* Final URL */}
    {assetGroup.finalUrl && (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Landing Page URL</h2>
          <a 
            href={assetGroup.finalUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="link link-primary"
          >
            {assetGroup.finalUrl}
          </a>
        </div>
      </div>
    )}
  </div>
); 