// Re-export all shared types as the single source of truth.
// Frontend code imports from '../types' (local path) which points here.
export {
  RiskLevel,
  User,
  AccessPathNode,
  AccessPath,
  EscalationSummary,
  UserListItem,
  RoleWithCount,
  UserStats,
} from '../../../shared/types';
