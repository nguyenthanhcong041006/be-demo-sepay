import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger.js';
import { sepayConfig } from './config/sepay.js';
import orderRoutes from './routes/orderRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';

const app = express();

// Middleware configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request logger
app.use((req, res, next) => {
  console.log(
    `[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`
  );
  next();
});

// Interactive API Documentation
app.use(
  ['/docs', '/api-docs'],
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'SePay Payment Gateway API Docs',
  })
);

// Root welcome route
app.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.json({
    status: 'ok',
    service: 'SePay Payment Gateway API (Backend)',
    message: 'Backend API is running normally!',
    frontendUrl:
      process.env.FRONTEND_URL || 'http://localhost:5173',
    docsUrl: `${baseUrl}/docs`,
    instruction:
      `To view the interactive API docs, open: ${baseUrl}/docs`,
    endpoints: {
      docs: 'GET /docs',
      health: 'GET /api/health',
      config: 'GET /api/config',
      orders: 'POST /api/orders',
      webhook: 'POST /api/sepay/webhook'
    }
  });
});

// Health check
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'SePay Payment Gateway Integration Backend',
    timestamp: new Date().toISOString(),
  });
});

// Public bank configuration
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      bankAccount: sepayConfig.bankAccount,
      bankName: sepayConfig.bankName,
      accountName: sepayConfig.accountName,
    },
  });
});

// Mount routes
app.use('/api/orders', orderRoutes);
app.use('/api/sepay', webhookRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint does not exist'
  });
});

// Start server only locally
if (!process.env.VERCEL) {
  const PORT = sepayConfig.port;

  app.listen(PORT, () => {
    console.log('=========================================');
    console.log('>>> SePay Backend Server is RUNNING!');
    console.log('>>> URL: http://localhost:' + PORT);
    console.log('>>> Docs: http://localhost:' + PORT + '/docs');
    console.log(
      '>>> Bank: ' +
      sepayConfig.bankName +
      ' - ' +
      sepayConfig.bankAccount
    );
    console.log(
      '>>> Webhook: http://localhost:' +
      PORT +
      '/api/sepay/webhook'
    );
    console.log('=========================================');
  });
}

export default app;