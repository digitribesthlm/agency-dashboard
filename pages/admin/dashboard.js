import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [assets, setAssets] = useState([]);
  const [performance, setPerformance] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const assetsResponse = await fetch('/api/assets');
      const assetsData = await assetsResponse.json();
      setAssets(assetsData);

      const performanceResponse = await fetch('/api/performance');
      const performanceData = await performanceResponse.json();
      setPerformance(performanceData);
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <h2>Assets</h2>
      <ul>
        {assets.map((asset) => (
          <li key={asset._id}>
            {asset['Asset Type'] === 'IMAGE' && (
              <img src={asset['Image URL']} alt={asset['Asset ID']} />
            )}
            {asset['Asset Type'] === 'VIDEO' && (
              <iframe
                width="560"
                height="315"
                src={`https://www.youtube.com/embed/${asset['Video ID']}`}
                title={asset['Video Title']}
                frameBorder="0"
                allowFullScreen
              ></iframe>
            )}
          </li>
        ))}
      </ul>
      <h2>Performance</h2>
      <ul>
        {performance.map((perf) => (
          <li key={perf._id}>{perf['Performance ID']}</li>
        ))}
      </ul>
    </div>
  );
} 