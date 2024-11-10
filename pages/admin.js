import { getSession } from 'next-auth/react';

export default function Admin() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      {/* Add your admin dashboard content */}
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session || session.user.role !== 'admin') {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const [assetsRes, assetsPerformanceRes] = await Promise.all([
    fetch('http://localhost:3000/api/assets'),
    fetch('http://localhost:3000/api/assets-performance'),
  ]);

  const [assets, assetsPerformance] = await Promise.all([
    assetsRes.json(),
    assetsPerformanceRes.json(),
  ]);

  return {
    props: {
      assets,
      assetsPerformance,
    },
  };
} 