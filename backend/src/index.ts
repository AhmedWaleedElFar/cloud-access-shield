import express from 'express';
import { initializeDriver, testConnection, closeDriver } from './db';
import { corsMiddleware } from './middleware/cors';
import { errorHandlerMiddleware } from './middleware/errorHandler';

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

// Routes will be registered here in Phase 5
// app.use('/api/users', createUsersRouter());
// app.use('/api/access', createAccessRouter());
// app.use('/api/analytics', createAnalyticsRouter());

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
