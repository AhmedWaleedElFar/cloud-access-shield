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

  const showSimPanel = simResult || simLoading;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Access Paths — {userId}</h2>

      {/* Escalation summary — always visible */}
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

      {/* Main layout: optional sidebar + paths */}
      <div className="flex gap-5" style={{ alignItems: 'flex-start' }}>
        {/* Simulation Sidebar — left side */}
        {showSimPanel && (
          <div className="w-[340px] shrink-0 bg-gradient-to-b from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 animate-in fade-in slide-in-from-left-2" role="region" aria-label="Simulation result">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">&#x1F9EA;</span>
                <h3 className="text-lg font-semibold text-gray-900">Simulation</h3>
              </div>
              <button
                onClick={() => setSimResult(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Dismiss simulation"
              >
                &#x2715;
              </button>
            </div>

            {simLoading ? (
              <div className="flex items-center gap-3 py-4">
                <div className="animate-spin h-5 w-5 border-2 border-blue-300 border-t-blue-600 rounded-full" />
                <span className="text-sm text-blue-700 font-medium">Running simulation...</span>
              </div>
            ) : simResult ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Revoke <code className="bg-white px-1.5 py-0.5 rounded font-mono text-xs border">{simResult.relationshipType}</code> to <strong>{simResult.targetId}</strong>?
                </p>

                {/* Score comparison */}
                <div className="space-y-3 mb-4">
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Score</span>
                      <span className={`text-sm font-bold ${
                        simResult.after.score < simResult.before.score ? 'text-green-600' :
                        simResult.after.score > simResult.before.score ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {simResult.before.score} → {simResult.after.score}
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${simResult.after.score}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 border text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Paths</p>
                      <p className="text-lg font-bold mt-0.5">{simResult.before.pathCount} → {simResult.after.pathCount}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Resources</p>
                      <p className="text-lg font-bold mt-0.5">{simResult.before.uniqueResources} → {simResult.after.uniqueResources}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">High Risk Paths</p>
                    <p className="text-lg font-bold mt-0.5">{simResult.before.highRiskPaths} → {simResult.after.highRiskPaths}</p>
                  </div>
                </div>

                {/* Impact indicator */}
                <div className={`text-center text-sm font-semibold py-2 rounded-lg mb-4 ${
                  simResult.after.score < simResult.before.score ? 'bg-green-100 text-green-700' :
                  simResult.after.score > simResult.before.score ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {simResult.after.score < simResult.before.score
                    ? `&#x2193; Risk drops ${simResult.before.score - simResult.after.score} points`
                    : simResult.after.score > simResult.before.score
                      ? `&#x2191; Risk increases ${simResult.after.score - simResult.before.score} points`
                      : 'No change'}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSimResult(null)}
                    className="flex-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-white/60 rounded-lg transition-colors border border-gray-300"
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
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label="Revoke this access after simulation"
                  >
                    Revoke
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Access Paths — main content */}
        <div className="flex-1 space-y-3 min-w-0" role="list" aria-label="Access paths">
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
