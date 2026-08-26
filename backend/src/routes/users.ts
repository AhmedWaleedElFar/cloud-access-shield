import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { getDriver } from '../db';
import {
  getUser,
  searchUsers,
  getAllUsers,
  getUserStats,
  getAllRoles,
} from '../services/users';
import { findAccessPaths, computeEscalation } from '../services/access';

const router = Router();

// GET /api/users — list all users with escalation info
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const users = await getAllUsers();
  res.json(users);
}));

// GET /api/users/search?q=alice
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  if (!q || q.length < 2) {
    throw new AppError(400, 'Search query must be at least 2 characters');
  }
  const users = await searchUsers(q);
  res.json(users);
}));

// GET /api/users/stats
router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getUserStats();
  res.json(stats);
}));

// GET /api/users/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUser(req.params.id);
  if (!user) {
    throw new AppError(404, `User ${req.params.id} not found`);
  }
  res.json(user);
}));

// GET /api/users/:id/paths — access paths for a user
router.get('/:id/paths', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUser(req.params.id);
  if (!user) {
    throw new AppError(404, `User ${req.params.id} not found`);
  }
  const depth = Math.min(parseInt(req.query.depth as string) || 6, 10);
  const paths = await findAccessPaths(req.params.id, depth);
  res.json(paths);
}));

// GET /api/users/:id/escalation — escalation detail for a user
router.get('/:id/escalation', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUser(req.params.id);
  if (!user) {
    throw new AppError(404, `User ${req.params.id} not found`);
  }
  const detail = await computeEscalation(req.params.id);
  res.json(detail);
}));

// GET /api/users/:id/roles — roles for a user
router.get('/:id/roles', asyncHandler(async (req: Request, res: Response) => {
  const driver = getDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId})-[:MEMBER_OF*1..6]->(g:Group)
             -[:HAS_ROLE]->(r:Role)
       RETURN DISTINCT r.id AS id, r.name AS name,
              r.description AS description, r.risk_level AS risk_level
       ORDER BY r.name`,
      { userId: req.params.id },
    );
    res.json(result.records.map((rec) => ({
      id: rec.get('id'),
      name: rec.get('name'),
      description: rec.get('description'),
      risk_level: rec.get('risk_level'),
    })));
  } finally {
    await session.close();
  }
}));

// GET /api/roles — all roles with resource counts
router.get('/roles/all', asyncHandler(async (_req: Request, res: Response) => {
  const roles = await getAllRoles();
  res.json(roles);
}));

export { router as usersRouter };
