// ============================================================
// Shared Types — Single Source of Truth for the Entire Stack
// ============================================================
// Both backend and frontend import from this file.
// If you change a type here, both apps see it immediately.

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ResourceType = 'database' | 'api' | 'service' | 'config';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  risk_level: RiskLevel;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  risk_level: RiskLevel;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  risk_level: RiskLevel;
}

export interface AccessPathNode {
  id: string;
  label: string;
  type: string;
  risk_level?: RiskLevel;
}

export interface AccessPath {
  nodes: AccessPathNode[];
  hops: number;
  riskLevel: RiskLevel;
}

export interface EscalationSummary {
  at_risk_count: number;
  avg_access: number;
  max_access: number;
  min_access: number;
}

// Frontend-only extensions (fields the API adds beyond the base entity)
export interface UserListItem extends User {
  escalation_count?: number;
  has_high_risk?: boolean;
}

export interface RoleWithCount extends Role {
  resource_count: number;
}

export interface UserStats {
  total_users: number;
  avg_access: number;
  max_access: number;
  median_access: number;
}

export interface EscalationDetail {
  userId: string;
  pathCount: number;
  uniqueResources: number;
  highRiskPaths: number;
  score: number;
  avgPathLength: number;
  longestPath: number;
  topRiskPaths: AccessPath[];
}

// ============================================================
// Access Control — Revoke & Simulate
// ============================================================

export type RelationshipType =
  | 'MEMBER_OF'
  | 'HAS_ROLE'
  | 'CAN_ACCESS';

export interface RevokeRequest {
  userId: string;
  relationshipType: RelationshipType;
  targetId: string;
}

export interface RevokeResult {
  success: boolean;
  userId: string;
  relationshipType: RelationshipType;
  targetId: string;
  deletedCount: number;
}

export interface SimulateRequest {
  userId: string;
  relationshipType: RelationshipType;
  targetId: string;
}

export interface SimulateResult {
  userId: string;
  relationshipType: RelationshipType;
  targetId: string;
  before: {
    score: number;
    pathCount: number;
    uniqueResources: number;
    highRiskPaths: number;
  };
  after: {
    score: number;
    pathCount: number;
    uniqueResources: number;
    highRiskPaths: number;
  };
}
