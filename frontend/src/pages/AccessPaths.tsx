import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { AccessPath, EscalationDetail } from '@shared/types';
import Loading from '../components/Loading';
import Empty from '../components/Empty';
import RiskBadge from '../components/RiskBadge';

interface AccessPathsProps {
  userId: string | null;
}

export default function AccessPaths({ userId }: AccessPathsProps) {
  const [paths, setPaths] = useState<AccessPath[]>([]);
  const [escalation, setEscalation] = useState<EscalationDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setPaths([]);
    setEscalation(null);

    const load = async () => {
      try {
        const [pathsRes, escRes] = await Promise.all([
          api.getUserPaths(userId),
          api.getUserEscalation(userId),
        ]);
        setPaths(pathsRes.data);
        setEscalation(escRes.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (!userId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Access Paths</h2>
        <Empty title="No user selected" description="Go to Users page to select one." />
      </div>
    );
  }

  if (loading) return <Loading message={`Loading paths for ${userId}...`} />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Access Paths — {userId}</h2>

      {escalation && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Score</p>
            <p className="text-2xl font-bold text-gray-900">{escalation.score}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Paths</p>
            <p className="text-2xl font-bold text-gray-900">{escalation.pathCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Resources</p>
            <p className="text-2xl font-bold text-gray-900">{escalation.uniqueResources}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">High Risk</p>
            <p className="text-2xl font-bold text-red-600">{escalation.highRiskPaths}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {paths.map((path, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Path {i + 1} — {path.hops} hops</span>
              <RiskBadge level={path.riskLevel} />
            </div>
            <div className="flex items-center text-sm text-gray-700">
              {path.nodes.map((node, j) => (
                <span key={j} className="flex items-center">
                  <span className={`px-2 py-1 rounded ${
                    node.type === 'User' ? 'bg-blue-100 text-blue-800' :
                    node.type === 'Group' ? 'bg-purple-100 text-purple-800' :
                    node.type === 'Role' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {node.label}
                  </span>
                  {j < path.nodes.length - 1 && (
                    <span className="mx-2 text-gray-400">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
        {paths.length === 0 && (
          <Empty title="No paths found" description="No access paths found for this user." />
        )}
      </div>
    </div>
  );
}
