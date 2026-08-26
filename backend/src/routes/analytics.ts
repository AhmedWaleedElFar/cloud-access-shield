import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { detectCycles, findForbiddenPaths, batchEscalation } from '../services/access';

const router = Router();

// GET /api/analytics/escalations — batch escalation for all users
router.get('/escalations', asyncHandler(async (_req: Request, res: Response) => {
  const data = await batchEscalation();
  res.json(data);
}));

// GET /api/analytics/cycles — group hierarchy cycles
router.get('/cycles', asyncHandler(async (req: Request, res: Response) => {
  const depth = Math.min(parseInt(req.query.depth as string) || 8, 12);
  const result = await detectCycles(depth);
  res.json(result);
}));

// GET /api/analytics/forbidden — forbidden paths
router.get('/forbidden', asyncHandler(async (_req: Request, res: Response) => {
  const paths = await findForbiddenPaths();
  res.json(paths);
}));

export { router as analyticsRouter };
