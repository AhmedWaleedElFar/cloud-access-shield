import { getDriver } from '../db';
import {
  AccessPath, AccessPathNode, RiskLevel,
  RevokeRequest, RevokeResult,
  SimulateRequest, SimulateResult, RelationshipType,
} from '@shared/types';

const RISK_SCORE: Record<RiskLevel, number> = { LOW: 1, MEDIUM: 3, HIGH: 5 };


function highestRisk(levels: RiskLevel[]): RiskLevel {
  return levels.reduce((worst, cur) =>
    RISK_SCORE[cur] > RISK_SCORE[worst] ? cur : worst
  , 'LOW' as RiskLevel);
}

// ============================================================
// BFS: find all access paths from a user to resources
// Cypher uses explicit relationship types + bounded path length
// to prevent infinite traversal in cyclic group graphs.
// ============================================================
export async function findAccessPaths(
  userId: string,
  maxDepth: number = 6,
): Promise<AccessPath[]> {
  const driver = getDriver();
  const session = driver.session();

  // Path length must be a literal in Cypher — bake it into the query string
  const depth = Math.min(Math.max(maxDepth, 1), 10);

  try {
    // User -> Group -> Role -> Resource
    // Each hop is explicitly typed; path length bounded to a literal depth.
    // Cycles in group hierarchy are prevented because:
    //   1. Path bound `*1..N` limits exploration to N hops
    //   2. Each step goes strictly forward (U→G→R→Res),
    //      so revisiting the same node is impossible by label ordering.
    const result = await session.run(
      `MATCH path = (u:User {id: $userId})-[:MEMBER_OF*1..${depth}]->(g:Group)
             -[:HAS_ROLE]->(r:Role)-[:CAN_ACCESS]->(res:Resource)
       RETURN DISTINCT
         [n IN nodes(path) | {
           id:    n.id,
           label: COALESCE(n.name, n.id),
           type:  head(labels(n)),
           risk_level: n.risk_level
         }] AS pathNodes,
         length(path) AS pathLength
       LIMIT 500`,
      { userId },
    );

    const paths: AccessPath[] = result.records.map((rec) => {
      const nodesRaw = rec.get('pathNodes') as Array<{
        id: string;
        label: string;
        type: string;
        risk_level?: string;
      }>;
      const hops = rec.get('pathLength').toNumber();

      const nodes: AccessPathNode[] = nodesRaw.map((n) => ({
        id: n.id,
        label: n.label,
        type: n.type,
        risk_level: n.risk_level as RiskLevel | undefined,
      }));

      const riskLevels = nodes
        .map((n) => n.risk_level)
        .filter((r): r is RiskLevel => !!r);

      return {
        nodes,
        hops,
        riskLevel: highestRisk(riskLevels),
      };
    });

    return paths;
  } finally {
    await session.close();
  }
}

// ============================================================
// Cycle detection: find cycles within group hierarchy
// Uses bounded path and checks for repeated node IDs.
// ============================================================
export interface CycleResult {
  hasCycle: boolean;
  cycleLength: number;
  cycleNodes: string[];
  // Minimum-length cycle (first found by BFS)
}

export async function detectCycles(maxDepth: number = 8): Promise<CycleResult> {
  const driver = getDriver();
  const session = driver.session();
  const depth = Math.min(Math.max(maxDepth, 2), 12);

  try {
    // Find any path that returns to the same node within bounded depth
    const result = await session.run(
      `MATCH path = (g:Group)-[:MEMBER_OF*2..${depth}]->(g)
       RETURN [n IN nodes(path) | n.name] AS cycleNames,
              length(path) AS cycleLen
       ORDER BY cycleLen ASC
       LIMIT 1`,
    );

    if (result.records.length === 0) {
      return { hasCycle: false, cycleLength: 0, cycleNodes: [] };
    }

    const rec = result.records[0];
    return {
      hasCycle: true,
      cycleLength: rec.get('cycleLen').toNumber(),
      cycleNodes: rec.get('cycleNames'),
    };
  } finally {
    await session.close();
  }
}

// ============================================================
// Escalation scorer: combine path length + risk edges
// Longer paths with HIGH-risk edges = higher escalation risk.
// ============================================================
export interface EscalationDetail {
  userId: string;
  pathCount: number;
  uniqueResources: number;
  highRiskPaths: number;
  score: number;       // 0-100
  avgPathLength: number;
  longestPath: number;
  topRiskPaths: AccessPath[];
}

export async function computeEscalation(userId: string): Promise<EscalationDetail> {
  const paths = await findAccessPaths(userId, 6);

  const uniqueRes = new Set<string>();
  let highRiskCount = 0;
  let totalLength = 0;
  let longest = 0;
  const scored: Array<{ path: AccessPath; score: number }> = [];

  for (const p of paths) {
    const resourceNode = p.nodes[p.nodes.length - 1];
    uniqueRes.add(resourceNode.id);

    const pathScore = p.hops * 5 + RISK_SCORE[p.riskLevel] * 10;
    scored.push({ path: p, score: pathScore });

    totalLength += p.hops;
    if (p.hops > longest) longest = p.hops;
    if (p.riskLevel === 'HIGH') highRiskCount++;
  }

  // Top 5 riskiest paths
  scored.sort((a, b) => b.score - a.score);
  const topRiskPaths = scored.slice(0, 5).map((s) => s.path);

  // Aggregate score: normalized 0-100
  const rawScore = paths.length > 0
    ? (highRiskCount / paths.length) * 50 + (longest / 6) * 30 + (uniqueRes.size / 30) * 20
    : 0;
  const score = Math.min(100, Math.round(rawScore));

  return {
    userId,
    pathCount: paths.length,
    uniqueResources: uniqueRes.size,
    highRiskPaths: highRiskCount,
    score,
    avgPathLength: paths.length > 0 ? Math.round(totalLength / paths.length * 10) / 10 : 0,
    longestPath: longest,
    topRiskPaths,
  };
}

// ============================================================
// Forbidden paths: detect direct user→resource access that
// bypasses group/role chain (violation of IAM policy)
// ============================================================
export interface ForbiddenPath {
  userId: string;
  userName: string;
  resourceId: string;
  resourceName: string;
  violationType: 'direct_access' | 'unbounded_traversal';
}

export async function findForbiddenPaths(): Promise<ForbiddenPath[]> {
  const driver = getDriver();
  const session = driver.session();

  try {
    // Direct access: user has CAN_ACCESS to resource without going through Group→Role
    const result = await session.run(
      `MATCH (u:User)-[:CAN_ACCESS]->(res:Resource)
       WHERE NOT (u)-[:MEMBER_OF]->(:Group)-[:HAS_ROLE]->(:Role)-[:CAN_ACCESS]->(res)
       RETURN u.id AS userId, u.name AS userName,
              res.id AS resourceId, res.name AS resourceName`,
    );

    return result.records.map((rec) => ({
      userId: rec.get('userId'),
      userName: rec.get('userName'),
      resourceId: rec.get('resourceId'),
      resourceName: rec.get('resourceName'),
      violationType: 'direct_access' as const,
    }));
  } finally {
    await session.close();
  }
}

// ============================================================
// Batch escalation for dashboard: score ALL users
// Uses a single Cypher query to avoid N+1.
// ============================================================
export async function batchEscalation(): Promise<Array<{
  userId: string;
  userName: string;
  pathCount: number;
  hasHighRisk: boolean;
  score: number;
}>> {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH path = (u:User)-[:MEMBER_OF*1..6]->(g:Group)
             -[:HAS_ROLE]->(r:Role)-[:CAN_ACCESS]->(res:Resource)
       WITH u,
            count(DISTINCT res) AS resCount,
            max(r.risk_level) AS worstRisk,
            max(length(path)) AS maxPath
       RETURN u.id AS userId,
              u.name AS userName,
              resCount,
              worstRisk,
              maxPath`,
    );

    return result.records.map((rec) => {
      const resCount = rec.get('resCount').toNumber();
      const worstRisk = rec.get('worstRisk') as string;
      const maxPath = rec.get('maxPath').toNumber();
      const highRisk = worstRisk === 'HIGH';

      const rawScore = resCount > 0
        ? (highRisk ? 50 : worstRisk === 'MEDIUM' ? 25 : 10) +
          (maxPath / 6) * 30 +
          (resCount / 30) * 20
        : 0;

      return {
        userId: rec.get('userId'),
        userName: rec.get('userName'),
        pathCount: resCount,
        hasHighRisk: highRisk,
        score: Math.min(100, Math.round(rawScore)),
      };
    });
  } finally {
    await session.close();
  }
}

// ============================================================
// Revoke: delete a specific relationship between two nodes
// Uses parameterized query; validates relationship type against allowlist.
// ============================================================

const VALID_RELATIONSHIPS: Record<RelationshipType, { sourceLabel: string; targetLabel: string }> = {
  MEMBER_OF: { sourceLabel: 'User', targetLabel: 'Group' },
  HAS_ROLE: { sourceLabel: 'Group', targetLabel: 'Role' },
  CAN_ACCESS: { sourceLabel: 'Role', targetLabel: 'Resource' },
};

export async function revokeAccess(req: RevokeRequest): Promise<RevokeResult> {
  const driver = getDriver();
  const session = driver.session();

  const relInfo = VALID_RELATIONSHIPS[req.relationshipType];
  if (!relInfo) {
    throw new Error(`Invalid relationship type: ${req.relationshipType}`);
  }

  try {
    const result = await session.run(
      `MATCH (source:${relInfo.sourceLabel} {id: $sourceId})-[r:${req.relationshipType}]->(target:${relInfo.targetLabel} {id: $targetId})
       WITH r LIMIT 1
       DELETE r
       RETURN 1 AS deletedCount`,
      { sourceId: req.userId, targetId: req.targetId },
    );

    const deletedCount = result.records.length;

    return {
      success: deletedCount > 0,
      userId: req.userId,
      relationshipType: req.relationshipType,
      targetId: req.targetId,
      deletedCount,
    };
  } finally {
    await session.close();
  }
}

// ============================================================
// Simulate: compute escalation score before and after a
// hypothetical revocation without actually deleting anything.
// ============================================================

export async function simulateRevoke(req: SimulateRequest): Promise<SimulateResult> {
  const driver = getDriver();
  const session = driver.session();

  const relInfo = VALID_RELATIONSHIPS[req.relationshipType];
  if (!relInfo) {
    throw new Error(`Invalid relationship type: ${req.relationshipType}`);
  }

  try {
    const before = await computeEscalation(req.userId);

    // Compute AFTER: paths that don't traverse through the target relationship.
    // We filter paths by checking that no relationship in the path matches
    // the type + source/target pair being revoked.
    const depth = 6;
    const result = await session.run(
      `MATCH path = (u:User {id: $userId})-[:MEMBER_OF*1..${depth}]->(g:Group)
             -[:HAS_ROLE]->(r:Role)-[:CAN_ACCESS]->(res:Resource)
       WHERE NOT any(rel IN relationships(path) WHERE type(rel) = $relType
                     AND startNode(rel).id = $sourceId AND endNode(rel).id = $targetId)
       RETURN count(DISTINCT res) AS resCount,
              max(r.risk_level) AS worstRisk,
              max(length(path)) AS maxPath`,
      { userId: req.userId, relType: req.relationshipType, sourceId: req.userId, targetId: req.targetId },
    );

    const rec = result.records[0];
    const resCount = rec.get('resCount').toNumber();
    const worstRisk = (rec.get('worstRisk') as string) || 'LOW';
    const maxPathRaw = rec.get('maxPath');
    const maxPath = maxPathRaw ? maxPathRaw.toNumber() : 0;

    const highRisk = worstRisk === 'HIGH';
    const rawScore = resCount > 0
      ? (highRisk ? 50 : worstRisk === 'MEDIUM' ? 25 : 10) +
        (maxPath / 6) * 30 +
        (resCount / 30) * 20
      : 0;

    return {
      userId: req.userId,
      relationshipType: req.relationshipType,
      targetId: req.targetId,
      before: {
        score: before.score,
        pathCount: before.pathCount,
        uniqueResources: before.uniqueResources,
        highRiskPaths: before.highRiskPaths,
      },
      after: {
        score: Math.min(100, Math.round(rawScore)),
        pathCount: resCount,
        uniqueResources: resCount,
        highRiskPaths: highRisk ? Math.min(resCount, before.highRiskPaths) : 0,
      },
    };
  } finally {
    await session.close();
  }
}
