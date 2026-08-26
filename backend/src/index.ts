import express from 'express';
import { initializeDriver, testConnection, closeDriver } from './db';
import { corsMiddleware } from './middleware/cors';
import { errorHandlerMiddleware } from './middleware/errorHandler';
import { usersRouter } from './routes/users';
import { analyticsRouter } from './routes/analytics';
import { analyzeRouter } from './routes/analyze';
import { accessRouter } from './routes/access';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(corsMiddleware);
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/users', usersRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/access', accessRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (must be last)
app.use(errorHandlerMiddleware);

const startServer = async () => {
  try {
    initializeDriver();
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to CognoDB');
    }

    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await closeDriver();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDriver();
  process.exit(0);
});

startServer();

export default app;
