import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { computeEscalation, findAccessPaths } from '../services/access';

const router = Router();

// POST /api/analyze/escalation — analyze escalation risk for a user
// Body: { userId: string } or { userIds: string[] }
router.post('/escalation', asyncHandler(async (req: Request, res: Response) => {
  const { userId, userIds } = req.body;

  // Single user mode
  if (userId) {
    const detail = await computeEscalation(userId);
    return res.json(detail);
  }

  // Batch mode
  if (Array.isArray(userIds) && userIds.length > 0) {
    if (userIds.length > 100) {
      throw new AppError(400, 'Maximum 100 users per batch');
    }

    const results = await Promise.all(
      userIds.map((id: string) => computeEscalation(id)),
    );
    return res.json(results);
  }

  throw new AppError(400, 'Provide userId or userIds array in request body');
}));

// POST /api/analyze/paths — find access paths for a user
// Body: { userId: string, maxDepth?: number }
router.post('/paths', asyncHandler(async (req: Request, res: Response) => {
  const { userId, maxDepth } = req.body;

  if (!userId) {
    throw new AppError(400, 'userId is required');
  }

  const depth = Math.min(Math.max(maxDepth || 6, 1), 10);
  const paths = await findAccessPaths(userId, depth);
  res.json(paths);
}));

export { router as analyzeRouter };
