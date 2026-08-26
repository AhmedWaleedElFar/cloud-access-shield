import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { AccessPath, EscalationDetail, RelationshipType, SimulateResult } from '@shared/types';
import Loading from '../components/Loading';
import Empty from '../components/Empty';
import RiskBadge from '../components/RiskBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';

interface AccessPathsProps {
  userId: string | null;
}

const REL_MAP: Record<string, RelationshipType> = {
  'User-Group': 'MEMBER_OF',
  'Group-Role': 'HAS_ROLE',
  'Role-Resource': 'CAN_ACCESS',
};

function getRelType(fromType: string, toType: string): RelationshipType | null {
  return REL_MAP[`${fromType}-${toType}`] || null;
}

export default function AccessPaths({ userId }: AccessPathsProps) {
  const [paths, setPaths] = useState<AccessPath[]>([]);
  const [escalation, setEscalation] = useState<EscalationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirm, setConfirm] = useState<{
    userId: string;
    relationshipType: RelationshipType;
    targetId: string;
    targetLabel: string;
  } | null>(null);
  const [simResult, setSimResult] = useState<SimulateResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      const [pathsRes, escRes] = await Promise.all([
        api.getUserPaths(userId),
        api.getUserEscalation(userId),
      ]);
      setPaths(pathsRes.data);
      setEscalation(escRes.data);
    } catch {
      // silent
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setPaths([]);
    setEscalation(null);
    setSimResult(null);
    reload().finally(() => setLoading(false));
  }, [userId, reload]);

  const handleSimulate = useCallback(
    async (sourceId: string, relationshipType: RelationshipType, targetId: string) => {
      setSimLoading(true);
      setSimResult(null);
      try {
        const res = await api.simulateRevoke({ userId: sourceId, relationshipType, targetId });
        setSimResult(res.data);
      } catch {
        setToast({ message: 'Simulation failed', type: 'error' });
      } finally {
        setSimLoading(false);
      }
    },
    [],
  );

  const handleRevoke = useCallback(async () => {
    if (!confirm) return;
    try {
      const res = await api.revokeAccess({
        userId: confirm.userId,
        relationshipType: confirm.relationshipType,
        targetId: confirm.targetId,
      });
      if (res.data.success) {
        setToast({ message: `Revoked ${confirm.relationshipType} to ${confirm.targetLabel}`, type: 'success' });
        setSimResult(null);
        await reload();
      } else {
        setToast({ message: 'No relationship found to revoke', type: 'error' });
      }
    } catch {
      setToast({ message: 'Revoke failed', type: 'error' });
    } finally {
      setConfirm(null);
    }
  }, [confirm, reload]);

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" role="group" aria-label="Escalation summary">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">Score</p>
            <p className="text-2xl font-bold text-gray-900">{escalation.score}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Paths</p>
            <p className="text-2xl font-bold text-gray-900">{escalation.pathCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <p className="text-sm text-gray-500">Resources</p>
            <p className="text-2xl font-bold text-gray-900">{escalation.uniqueResources}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-500">High Risk</p>
            <p className="text-2xl font-bold text-red-600">{escalation.highRiskPaths}</p>
          </div>
        </div>
      )}

      {/* Simulation Result — above the paths so user doesn't have to scroll */}
      {simResult && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 animate-in fade-in slide-in-from-top-2" role="region" aria-label="Simulation result">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">&#x1F9EA;</span>
            <h3 className="text-lg font-semibold text-gray-900">Simulation Result</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            What happens if we revoke <code className="bg-white px-1.5 py-0.5 rounded font-mono text-xs border">{simResult.relationshipType}</code> to <strong>{simResult.targetId}</strong>?
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-white border">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Score Before</p>
              <p className="text-2xl font-bold mt-1">{simResult.before.score}</p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-blue-300">
              <p className="text-xs text-blue-600 uppercase tracking-wide font-medium">Score After</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{simResult.after.score}</p>
            </div>
            <div className="p-3 rounded-lg bg-white border">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Paths Before</p>
              <p className="text-2xl font-bold mt-1">{simResult.before.pathCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-blue-300">
              <p className="text-xs text-blue-600 uppercase tracking-wide font-medium">Paths After</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{simResult.after.pathCount}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className={`text-sm font-semibold ${simResult.after.score < simResult.before.score ? 'text-green-600' : simResult.after.score > simResult.before.score ? 'text-red-600' : 'text-gray-600'}`}>
              {simResult.after.score < simResult.before.score
                ? `&#x2193; Score drops by ${simResult.before.score - simResult.after.score} points`
                : simResult.after.score > simResult.before.score
                  ? `&#x2191; Score increases by ${simResult.after.score - simResult.before.score} points`
                  : 'No change'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSimResult(null)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => setConfirm({
                  userId: simResult.userId,
                  relationshipType: simResult.relationshipType,
                  targetId: simResult.targetId,
                  targetLabel: simResult.targetId,
                })}
                className="px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Revoke this access after simulation"
              >
                Revoke This Access
              </button>
            </div>
          </div>
        </div>
      )}

      {simLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-blue-300 border-t-blue-600 rounded-full" />
          <span className="text-sm text-blue-700 font-medium">Running simulation...</span>
        </div>
      )}

      {/* Access Paths */}
      <div className="space-y-3" role="list" aria-label="Access paths">
        {paths.map((path, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow duration-200"
            role="listitem"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Path {i + 1} — {path.hops} hops</span>
              <RiskBadge level={path.riskLevel} />
            </div>
            <div className="flex items-center text-sm text-gray-700 flex-wrap gap-y-2">
              {path.nodes.map((node, j) => {
                const nextNode = j < path.nodes.length - 1 ? path.nodes[j + 1] : null;
                const relType = nextNode ? getRelType(node.type, nextNode.type) : null;

                return (
                  <span key={j} className="flex items-center">
                    <span className={`px-2.5 py-1 rounded-md font-medium text-xs ${
                      node.type === 'User' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200' :
                      node.type === 'Group' ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-200' :
                      node.type === 'Role' ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-200' :
                      'bg-red-100 text-red-800 ring-1 ring-red-200'
                    }`}>
                      {node.label}
                    </span>
                    {nextNode && (
                      <span className="mx-1 flex items-center gap-1">
                        <span className="text-gray-300 text-lg" aria-hidden="true">&#x2192;</span>
                        {relType && (
                          <span className="flex gap-0.5">
                            <button
                              onClick={() => handleSimulate(node.id, relType, nextNode.id)}
                              disabled={simLoading}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                              aria-label={`Simulate revoking ${relType} from ${node.label} to ${nextNode.label}`}
                            >
                              sim
                            </button>
                            <button
                              onClick={() => setConfirm({
                                userId: node.id,
                                relationshipType: relType,
                                targetId: nextNode.id,
                                targetLabel: nextNode.label,
                              })}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-800 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                              aria-label={`Revoke ${relType} from ${node.label} to ${nextNode.label}`}
                            >
                              revoke
                            </button>
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
        {paths.length === 0 && (
          <Empty title="No paths found" description="No access paths found for this user." />
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          title="Revoke Access"
          message={`Revoke ${confirm.relationshipType} from ${confirm.userId} to ${confirm.targetLabel}? This cannot be undone.`}
          confirmText="Revoke"
          isDangerous
          onConfirm={handleRevoke}
          onCancel={() => setConfirm(null)}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
