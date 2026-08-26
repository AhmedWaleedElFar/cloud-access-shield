import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { revokeAccess, simulateRevoke } from '../services/access';

const router = Router();

// POST /api/access/revoke — delete a specific relationship
router.post('/revoke', asyncHandler(async (req: Request, res: Response) => {
  const { userId, relationshipType, targetId } = req.body;

  if (!userId || !relationshipType || !targetId) {
    throw new AppError(400, 'userId, relationshipType, and targetId are required');
  }

  const result = await revokeAccess({ userId, relationshipType, targetId });
  res.json(result);
}));

// POST /api/access/simulate — preview effect of revoking a relationship
router.post('/simulate', asyncHandler(async (req: Request, res: Response) => {
  const { userId, relationshipType, targetId } = req.body;

  if (!userId || !relationshipType || !targetId) {
    throw new AppError(400, 'userId, relationshipType, and targetId are required');
  }

  const result = await simulateRevoke({ userId, relationshipType, targetId });
  res.json(result);
}));

export { router as accessRouter };
