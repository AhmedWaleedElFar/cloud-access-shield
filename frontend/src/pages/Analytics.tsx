import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import RiskBadge from '../components/RiskBadge';

interface EscalationRow {
  userId: string;
  userName: string;
  pathCount: number;
  hasHighRisk: boolean;
  score: number;
}

interface CycleResult {
  hasCycle: boolean;
  cycleLength: number;
  cycleNodes: string[];
}

export default function Analytics() {
  const [escalations, setEscalations] = useState<EscalationRow[]>([]);
  const [cycles, setCycles] = useState<CycleResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [escRes, cycRes] = await Promise.all([
          api.getEscalations(),
          api.getCycles(),
        ]);
        setEscalations(escRes.data);
        setCycles(cycRes.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Loading message="Loading analytics..." />;

  const highRiskUsers = escalations.filter((e) => e.hasHighRisk).length;
  const top10 = [...escalations].sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-bold text-gray-900">{escalations.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">High Risk Users</p>
          <p className="text-2xl font-bold text-red-600">{highRiskUsers}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Cycles Detected</p>
          <p className={`text-2xl font-bold ${cycles?.hasCycle ? 'text-red-600' : 'text-green-600'}`}>
            {cycles?.hasCycle ? `${cycles.cycleLength} edges` : 'None'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Highest Risk Users</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paths</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {top10.map((row) => (
              <tr key={row.userId}>
                <td className="px-4 py-3 text-sm text-gray-900">{row.userName}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{row.score}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{row.pathCount}</td>
                <td className="px-4 py-3">
                  {row.hasHighRisk && <RiskBadge level="HIGH" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cycles?.hasCycle && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Cycle Detected in Group Hierarchy</h3>
          <p className="text-sm text-red-700">
            A cycle of length {cycles.cycleLength} was found: {cycles.cycleNodes.join(' → ')}
          </p>
        </div>
      )}
    </div>
  );
}
