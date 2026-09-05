import { Router } from 'express';
import { orderController } from '../controllers/orderController.js';

const router = Router();

// GET request: Status check when accessed via browser
router.get('/webhook', (req, res) => {
  res.json({
    status: 'ready',
    service: 'SePay Webhook Listener',
    message: 'Webhook endpoint is active and ready to receive transaction data!',
    note: 'When bank transactions occur, SePay automatically dispatches notifications here via HTTP POST.',
    methodExpected: 'POST',
    url: '/api/sepay/webhook',
  });
});

// POST request: Official webhook endpoint called by SePay
router.post('/webhook', orderController.handleSepayWebhook);

export default router;