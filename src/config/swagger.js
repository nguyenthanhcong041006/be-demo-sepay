export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'SePay Payment Gateway API',
    version: '1.0.0',
    description: 'Interactive API documentation for SePay VietQR payment integration, automated order tracking, and webhook reconciliation.',
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  tags: [
    { name: 'Orders', description: 'Order creation, polling, and status management' },
    { name: 'Webhooks', description: 'SePay banking webhook handlers' },
    { name: 'System', description: 'Health check and configuration endpoints' },
  ],
  paths: {
    '/api/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Create a new payment order',
        description: 'Creates an order record, sets a 10-minute expiration window, and generates a dynamic SePay VietQR code.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  customer: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'Nguyen Van A' },
                      phone: { type: 'string', example: '0912345678' },
                      email: { type: 'string', example: 'customer@gmail.com' },
                    },
                  },
                  amount: { type: 'number', example: 50000, description: 'Payment amount in VND' },
                  serviceName: { type: 'string', example: 'Gói Cơ Bản (Starter)' },
                  note: { type: 'string', example: 'Đăng ký dịch vụ' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Order created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid amount or payload' },
        },
      },
      get: {
        tags: ['Orders'],
        summary: 'List all orders (Dev/Debug)',
        responses: {
          200: {
            description: 'List of all created orders',
          },
        },
      },
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get order details & status (Used for polling)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Order ID',
            schema: { type: 'string', example: 'ord_1725555555_abc12' },
          },
        ],
        responses: {
          200: {
            description: 'Order details and current status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
          404: { description: 'Order not found' },
        },
      },
    },
    '/api/orders/{id}/cancel': {
      post: {
        tags: ['Orders'],
        summary: 'Cancel an order',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'User cancelled transaction' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Order cancelled' },
          404: { description: 'Order not found' },
        },
      },
    },
    '/api/orders/{id}/simulate': {
      post: {
        tags: ['Orders'],
        summary: 'Simulate payment status (Dev / Test Tool)',
        description: 'Instantly transitions order state to PAID or FAILED without transferring real money.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['PAID', 'FAILED'], example: 'PAID' },
                  reason: { type: 'string', example: 'Test simulation failure' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated' },
          404: { description: 'Order not found' },
        },
      },
    },
    '/api/sepay/webhook': {
      post: {
        tags: ['Webhooks'],
        summary: 'SePay incoming webhook receiver',
        description: 'Endpoint called by SePay servers when an incoming bank transfer occurs.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 998877 },
                  gateway: { type: 'string', example: 'MBBank' },
                  transactionDate: { type: 'string', example: '2026-09-05 22:36:00' },
                  accountNumber: { type: 'string', example: '0388888888' },
                  transferType: { type: 'string', example: 'in' },
                  transferAmount: { type: 'number', example: 50000 },
                  content: { type: 'string', example: 'DH43767 transfer payment' },
                  referenceCode: { type: 'string', example: 'MBFT12345678' },
                  description: { type: 'string', example: 'Bank transfer memo' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Webhook processed successfully' },
          400: { description: 'Mismatch in order code or insufficient amount' },
        },
      },
      get: {
        tags: ['Webhooks'],
        summary: 'Check webhook listener status',
        responses: {
          200: { description: 'Listener is active' },
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          200: { description: 'Backend service status' },
        },
      },
    },
    '/api/config': {
      get: {
        tags: ['System'],
        summary: 'Public bank configuration',
        responses: {
          200: { description: 'Bank details' },
        },
      },
    },
  },
  components: {
    schemas: {
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ord_1788622590981_129a5efc' },
          orderCode: { type: 'string', example: 'DH43767' },
          customer: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Nguyen Van A' },
              phone: { type: 'string', example: '0912345678' },
              email: { type: 'string', example: 'customer@gmail.com' },
            },
          },
          serviceName: { type: 'string', example: 'Gói Cơ Bản (Starter)' },
          amount: { type: 'number', example: 50000 },
          status: { type: 'string', enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED'], example: 'PENDING' },
          bankInfo: {
            type: 'object',
            properties: {
              bank: { type: 'string', example: 'MBBank' },
              accountNumber: { type: 'string', example: '0388888888' },
              accountName: { type: 'string', example: 'NGUYEN VAN A' },
              orderCode: { type: 'string', example: 'DH43767' },
              amount: { type: 'number', example: 50000 },
              qrUrl: { type: 'string', example: 'https://qr.sepay.vn/img?acc=0388888888&bank=MBBank&amount=50000&des=DH43767&template=compact' },
            },
          },
          createdAt: { type: 'string', example: '2026-09-05T15:36:30.981Z' },
          expiresAt: { type: 'string', example: '2026-09-05T15:46:30.981Z' },
        },
      },
    },
  },
};