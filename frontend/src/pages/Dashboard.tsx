import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { UserStats } from '@shared/types';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

export default function Dashboard() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getUserStats();
        setStats(res.data);
      } catch {
        setError('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Loading message="Loading dashboard..." />;
  if (error || !stats) return <ErrorMessage title="Error" message={error || 'No data available'} />;

  const cards = [
    { label: 'Total Users', value: stats.total_users, color: 'bg-blue-500' },
    { label: 'Avg Access', value: stats.avg_access, color: 'bg-green-500' },
    { label: 'Max Access', value: stats.max_access, color: 'bg-orange-500' },
    { label: 'Median Access', value: stats.median_access, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg shadow p-6">
            <div className={`h-2 ${card.color} rounded-t-lg mb-4`} />
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">System Overview</h3>
        <p className="text-gray-600 text-sm">
          Cloud Access Shield is analyzing{' '}
          <span className="font-semibold">{stats.total_users}</span> users across
          your IAM graph. Average user has access to{' '}
          <span className="font-semibold">{stats.avg_access}</span> resources,
          with a maximum of{' '}
          <span className="font-semibold">{stats.max_access}</span>.
        </p>
      </div>
    </div>
  );
}
