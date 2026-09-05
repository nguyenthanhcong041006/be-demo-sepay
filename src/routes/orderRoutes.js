import { Router } from 'express';
import { orderController } from '../controllers/orderController.js';

const router = Router();

// Order endpoints
router.post('/', orderController.createOrder);
router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrder);
router.post('/:id/cancel', orderController.cancelOrder);
router.post('/:id/simulate', orderController.simulatePayment);

export default router;