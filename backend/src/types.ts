// Re-export all shared types as the single source of truth.
// This file exists so backend code can import from './types' (local path)
// without changing every import statement.
export {
  RiskLevel,
  ResourceType,
  User,
  Group,
  Role,
  Resource,
  AccessPathNode,
  AccessPath,
  EscalationSummary,
} from '@shared/types';
