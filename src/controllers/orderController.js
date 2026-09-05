import { orderService } from '../services/orderService.js';

export const orderController = {
  // Create a new order
  createOrder(req, res) {
    try {
      const { customer, amount, serviceName, note } = req.body;

      if (!amount || isNaN(amount) || Number(amount) < 2000) {
        return res.status(400).json({
          success: false,
          error: 'Payment amount must be at least 2,000 VND for VietQR processing',
        });
      }

      const order = orderService.createOrder({
        customer,
        amount: Math.round(Number(amount)),
        serviceName,
        note,
      });

      return res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('Error creating order:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error while creating order',
      });
    }
  },

  // Get order details / status
  getOrder(req, res) {
    try {
      const { id } = req.params;
      const order = orderService.getOrderById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      return res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error while fetching order',
      });
    }
  },

  // Cancel order
  cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const order = orderService.cancelOrder(id, reason);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      return res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error while cancelling order',
      });
    }
  },

  // Simulate payment status for dev / test
  simulatePayment(req, res) {
    try {
      const { id } = req.params;
      const { status = 'PAID', reason } = req.body;

      const order = orderService.simulatePayment(id, status, reason);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      return res.json({
        success: true,
        message: `Successfully simulated order status update to ${status}`,
        data: order,
      });
    } catch (error) {
      console.error('Error simulating payment:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error while simulating payment',
      });
    }
  },

  // Official Webhook handler from SePay
  handleSepayWebhook(req, res) {
    try {
      const webhookData = req.body;
      const authHeader = req.headers['authorization'] || req.headers['x-api-key'];

      console.log('--- RECEIVED SEPAY WEBHOOK ---');
      console.log('Payload:', JSON.stringify(webhookData, null, 2));

      const result = orderService.processSepayWebhook(webhookData, authHeader);

      if (!result.success) {
        console.warn('Webhook processing mismatch or error:', result);
        return res.status(400).json({
          success: false,
          message: result.message || result.error,
        });
      }

      console.log('Successfully processed payment for order:', result.order?.orderCode);
      return res.status(200).json({
        success: true,
        message: 'SePay webhook processed successfully',
      });
    } catch (error) {
      console.error('Error handling SePay webhook:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error while processing webhook',
      });
    }
  },

  // Retrieve all orders (for dev / debug)
  getAllOrders(req, res) {
    return res.json({
      success: true,
      data: orderService.getAllOrders(),
    });
  },
};