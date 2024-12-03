import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

const VideoPage = () => {
  const [videos, setVideos] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch('/api/assets/videos');
        const data = await res.json();
        setVideos(data);
        setAssets(data);
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Video Gallery</h1>
        {videos.length === 0 ? (
          <p>No videos found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video) => (
              <div key={video['Asset ID']} className="card bg-base-100 shadow-xl">
                <figure className="relative pt-[56.25%]">
                  {video.video_id ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${video.video_id}`}
                      className="absolute top-0 left-0 w-full h-full"
                      title={video['Video Title'] || `Video ${video['Asset ID']}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-base-300">
                      <p>Video not available</p>
                    </div>
                  )}
                </figure>
                <div className="card-body p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">ID: {video['Asset ID']}</span>
                        {/* Add performance label icon logic here if needed */}
                      </div>
                    </div>
                    {video['Video Title'] && (
                      <p className="text-sm truncate" title={video['Video Title']}>
                        {video['Video Title']}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <h1 className="text-2xl font-bold mb-4 mt-8">Asset List</h1>
        {assets.length === 0 ? (
          <p>No assets found</p>
        ) : (
          <table className="table-auto w-full">
            <thead>
              <tr>
                <th className="px-4 py-2">Asset ID</th>
                <th className="px-4 py-2">Video Title</th>
                <th className="px-4 py-2">Video ID</th>
                <th className="px-4 py-2">Account ID</th>
                <th className="px-4 py-2">Final URL</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset['Asset ID']}>
                  <td className="border px-4 py-2">{asset['Asset ID']}</td>
                  <td className="border px-4 py-2">{asset['Video Title']}</td>
                  <td className="border px-4 py-2">{asset['Video ID']}</td>
                  <td className="border px-4 py-2">{asset['Account ID']}</td>
                  <td className="border px-4 py-2">{asset['Final URL']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};

export default VideoPage;