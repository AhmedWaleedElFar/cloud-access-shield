import { useEffect, useState } from 'react';
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

  const reload = async () => {
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
  };

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setPaths([]);
    setEscalation(null);
    reload().finally(() => setLoading(false));
  }, [userId]);

  const handleSimulate = async (
    sourceId: string,
    relationshipType: RelationshipType,
    targetId: string,
  ) => {
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
  };

  const handleRevoke = async () => {
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
  };

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
            <div className="flex items-center text-sm text-gray-700 flex-wrap gap-y-2">
              {path.nodes.map((node, j) => {
                const nextNode = j < path.nodes.length - 1 ? path.nodes[j + 1] : null;
                const relType = nextNode ? getRelType(node.type, nextNode.type) : null;

                return (
                  <span key={j} className="flex items-center">
                    <span className={`px-2 py-1 rounded ${
                      node.type === 'User' ? 'bg-blue-100 text-blue-800' :
                      node.type === 'Group' ? 'bg-purple-100 text-purple-800' :
                      node.type === 'Role' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {node.label}
                    </span>
                    {nextNode && (
                      <span className="mx-1 flex items-center gap-1">
                        <span className="text-gray-400">→</span>
                        {relType && (
                          <span className="flex gap-1">
                            <button
                              onClick={() => handleSimulate(node.id, relType, nextNode.id)}
                              disabled={simLoading}
                              className="text-[10px] px-1 py-0.5 rounded bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 disabled:opacity-50"
                              title={`Simulate revoking ${relType}`}
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
                              className="text-[10px] px-1 py-0.5 rounded bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-700"
                              title={`Revoke ${relType} to ${nextNode.label}`}
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

      {simResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Simulation Result</h3>
          <p className="text-sm text-gray-600 mb-4">
            What happens if we revoke <code className="bg-gray-100 px-1 rounded">{simResult.relationshipType}</code> to <strong>{simResult.targetId}</strong>?
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded bg-gray-50">
              <p className="text-xs text-gray-500">Score Before</p>
              <p className="text-xl font-bold">{simResult.before.score}</p>
            </div>
            <div className="p-3 rounded bg-blue-50">
              <p className="text-xs text-gray-500">Score After</p>
              <p className="text-xl font-bold text-blue-700">{simResult.after.score}</p>
            </div>
            <div className="p-3 rounded bg-gray-50">
              <p className="text-xs text-gray-500">Paths Before</p>
              <p className="text-xl font-bold">{simResult.before.pathCount}</p>
            </div>
            <div className="p-3 rounded bg-blue-50">
              <p className="text-xs text-gray-500">Paths After</p>
              <p className="text-xl font-bold text-blue-700">{simResult.after.pathCount}</p>
            </div>
          </div>
          <div className="mt-3 text-sm">
            <span className={`font-semibold ${simResult.after.score < simResult.before.score ? 'text-green-600' : simResult.after.score > simResult.before.score ? 'text-red-600' : 'text-gray-600'}`}>
              {simResult.after.score < simResult.before.score
                ? `Score drops by ${simResult.before.score - simResult.after.score} points`
                : simResult.after.score > simResult.before.score
                  ? `Score increases by ${simResult.after.score - simResult.before.score} points`
                  : 'No change'}
            </span>
          </div>
          <button
            onClick={() => setConfirm({
              userId: simResult.userId,
              relationshipType: simResult.relationshipType,
              targetId: simResult.targetId,
              targetLabel: simResult.targetId,
            })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
          >
            Revoke This Access
          </button>
        </div>
      )}

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
