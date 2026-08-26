import cors from 'cors';

const isProduction = process.env.NODE_ENV === 'production';

export const corsMiddleware = cors({
  origin: isProduction
    ? [
        'https://cloud-access-shield.vercel.app',
        /https:\/\/cloud-access-shield-.*\.vercel\.app$/,
      ]
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
