import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sepayConfig, generateVietQRUrl } from '../config/sepay.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, '../../data/orders.json');

// In-memory order storage
const orders = new Map();

// Helper: Load existing orders from disk on server start
function loadOrdersFromDisk() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const order of data) {
          orders.set(order.id, order);
        }
        console.log(`[STORAGE] Loaded ${orders.size} orders from persistent storage`);
      }
    }
  } catch (err) {
    console.warn('[STORAGE] Could not load orders from disk:', err.message);
  }
}

// Helper: Persist orders to disk
function saveOrdersToDisk() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = Array.from(orders.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[STORAGE] Could not save orders to disk:', err.message);
  }
}

// Initialize from disk
loadOrdersFromDisk();

/**
 * Generate a short, unique order code for banking apps: e.g. DH93812
 */
function generateOrderCode() {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `DH${randomNum}`;
}

export const orderService = {
  /**
   * Create a new payment order
   */
  createOrder({ customer, amount, serviceName, note }) {
    const id = `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const orderCode = generateOrderCode();
    const createdAt = new Date();
    // Expiration after 10 minutes
    const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000);

    const qrUrl = generateVietQRUrl({
      amount,
      des: orderCode,
    });

    const order = {
      id,
      orderCode,
      customer: {
        name: customer?.name || 'Customer',
        email: customer?.email || '',
        phone: customer?.phone || '',
      },
      serviceName: serviceName || 'Order payment',
      amount: Number(amount) || 0,
      note: note || '',
      status: 'PENDING', // 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED'
      bankInfo: {
        bank: sepayConfig.bankName,
        accountNumber: sepayConfig.bankAccount,
        accountName: sepayConfig.accountName,
        orderCode: orderCode,
        amount: Number(amount) || 0,
        qrUrl,
      },
      paymentDetails: null,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    orders.set(id, order);
    saveOrdersToDisk();
    return order;
  },

  /**
   * Retrieve order details by ID
   */
  getOrderById(id) {
    const order = orders.get(id);
    if (!order) return null;

    // Automatically check for expiration if status is PENDING
    if (order.status === 'PENDING' && new Date() > new Date(order.expiresAt)) {
      order.status = 'EXPIRED';
      order.failureReason = 'Order payment window expired (10 minutes)';
      orders.set(id, order);
      saveOrdersToDisk();
    }

    return order;
  },

  /**
   * Cancel an order
   */
  cancelOrder(id, reason = 'Customer cancelled transaction') {
    const order = orders.get(id);
    if (!order) return null;

    if (order.status === 'PENDING') {
      order.status = 'CANCELLED';
      order.failureReason = reason;
      orders.set(id, order);
      saveOrdersToDisk();
    }
    return order;
  },

  /**
   * Process incoming SePay webhook when money arrives
   */
  processSepayWebhook(webhookData, authHeader) {
    // 1. Verify API Key from SePay if configured
    if (sepayConfig.apiKey && sepayConfig.apiKey !== 'sepay_demo_secret_key_123') {
      const token = (authHeader || '').replace(/^(Bearer|Apikey)\s+/i, '').trim();
      if (token !== sepayConfig.apiKey) {
        return { success: false, error: 'Unauthorized: Invalid SePay API Key' };
      }
    }

    const {
      id: transactionId,
      gateway,
      transactionDate,
      transferType,
      transferAmount,
      content = '',
      description = '',
      referenceCode,
    } = webhookData;

    // Only process incoming transfers (transferType = 'in')
    if (transferType && transferType !== 'in') {
      return { success: true, message: 'Ignored non-incoming transaction' };
    }

    const fullContent = `${content} ${description}`.toUpperCase();

    // Match order by orderCode in transfer content
    let matchedOrder = null;
    for (const order of orders.values()) {
      if (order.status === 'PENDING' && fullContent.includes(order.orderCode.toUpperCase())) {
        matchedOrder = order;
        break;
      }
    }

    if (!matchedOrder) {
      return {
        success: false,
        message: 'No pending order matching the transfer content was found',
      };
    }

    // Verify received amount
    const paidAmount = Number(transferAmount);
    if (paidAmount < matchedOrder.amount) {
      matchedOrder.status = 'FAILED';
      matchedOrder.failureReason = `Received amount (${paidAmount.toLocaleString()} VND) is less than the required amount (${matchedOrder.amount.toLocaleString()} VND)`;
      orders.set(matchedOrder.id, matchedOrder);
      saveOrdersToDisk();
      return {
        success: false,
        message: matchedOrder.failureReason,
      };
    }

    // Mark order as PAID
    matchedOrder.status = 'PAID';
    matchedOrder.paymentDetails = {
      transactionId: transactionId || `TXN_${Date.now()}`,
      referenceCode: referenceCode || 'SEPAY_' + Math.floor(Math.random() * 1000000),
      gateway: gateway || sepayConfig.bankName,
      transferAmount: paidAmount,
      transactionDate: transactionDate || new Date().toISOString(),
      paidAt: new Date().toISOString(),
    };

    orders.set(matchedOrder.id, matchedOrder);
    saveOrdersToDisk();
    return {
      success: true,
      message: 'Payment successful',
      order: matchedOrder,
    };
  },

  /**
   * Simulate payment webhook for dev/test environment
   */
  simulatePayment(id, status = 'PAID', reason = '') {
    let order = orders.get(id);
    if (!order) {
      // Gracefully reconstruct order if memory was cleared during dev server restart
      order = {
        id,
        orderCode: 'DH' + Math.floor(10000 + Math.random() * 90000),
        customer: { name: 'Khách hàng', phone: '0912345678', email: '' },
        serviceName: 'Thanh toán đơn hàng',
        amount: 200000,
        status: 'PENDING',
        bankInfo: {
          bank: sepayConfig.bankName,
          accountNumber: sepayConfig.bankAccount,
          accountName: sepayConfig.accountName,
          orderCode: 'DH12345',
          amount: 200000,
          qrUrl: '',
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      };
      orders.set(id, order);
    }

    if (status === 'PAID') {
      order.status = 'PAID';
      order.paymentDetails = {
        transactionId: `SIM_${Date.now()}`,
        referenceCode: `REF${Math.floor(100000 + Math.random() * 900000)}`,
        gateway: sepayConfig.bankName,
        transferAmount: order.amount,
        transactionDate: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        isSimulated: true,
      };
    } else if (status === 'FAILED') {
      order.status = 'FAILED';
      order.failureReason = reason || 'Payment failed (Test simulation)';
    }

    orders.set(id, order);
    saveOrdersToDisk();
    return order;
  },

  /**
   * Return all orders for debugging/dashboard
   */
  getAllOrders() {
    return Array.from(orders.values());
  }
};