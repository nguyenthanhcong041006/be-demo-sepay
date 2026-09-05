# SePay Payment Gateway Integration Backend (Node.js & Express)

This backend service provides a complete RESTful API system for generating payment orders, creating dynamic VietQR codes via the SePay gateway, receiving real-time webhook notifications for automatic bank reconciliation, and providing simulation tools for testing.

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation & Setup](#installation--setup)
3. [Environment Configuration (.env)](#environment-configuration-env)
4. [Project Structure & File Explanations](#project-structure--file-explanations)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Production Deployment with Live SePay](#production-deployment-with-live-sepay)

---

## System Requirements

- **Node.js**: Version 18 or higher (v20+ recommended).
- **npm**: Version 9 or higher.

---

## Installation & Setup

### Option 1: Run directly from the `backend/` directory

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Create .env from template (if not already present)
cp .env.example .env

# 4. Start in Development mode (with automatic hot-reload via node --watch)
npm run dev

# Or start in Production mode
npm start
```

### Option 2: Run from the repository root (`new_web/`)

```bash
# Run backend only
npm run backend

# Or run both backend and frontend concurrently
npm run dev
```

The backend server listens by default at: **`http://localhost:5000`**

---

## Environment Configuration (.env)

Configuration variables are stored in `backend/.env`. Below is a breakdown of each configuration option:

| Variable        | Default Value               | Description                                                                                       |
| :-------------- | :-------------------------- | :------------------------------------------------------------------------------------------------ |
| `PORT`          | `5000`                      | HTTP port the Express server listens on.                                                          |
| `SEPAY_API_KEY` | `sepay_demo_secret_key_123` | Secret API Token provided by SePay dashboard (`my.sepay.vn`) to verify incoming webhooks.         |
| `BANK_ACCOUNT`  | `0388888888`                | Beneficiary bank account number for receiving customer payments.                                  |
| `BANK_NAME`     | `MBBank`                    | Short code of the receiving bank (e.g., `MBBank`, `Vietcombank`, `ACB`, `TPBank`, `Techcombank`). |
| `ACCOUNT_NAME`  | `NGUYEN VAN A`              | Beneficiary account holder name (uppercase, unaccented).                                          |
| `QR_TEMPLATE`   | `compact`                   | SePay VietQR template style (`compact`, `qr_only`, `template1`).                                  |

---

## Project Structure & File Explanations

```
backend/
|-- .env                  # Active environment variables
|-- .env.example          # Template environment file (safe for version control)
|-- package.json          # Project manifest, dependencies, and npm scripts
|-- README.md             # Backend architecture and API documentation
`-- src/                  # Application source code
  |-- server.js         # Express entrypoint, middlewares, and HTTP listener
  |-- config/           # Configuration modules
  |   `-- sepay.js      # SePay config loader and VietQR URL generator helper
  |-- controllers/      # HTTP request/response handlers
  |   `-- orderController.js # Handles order creation, polling, cancellations, and webhooks
  |-- routes/           # Endpoint router definitions
  |   |-- orderRoutes.js     # Routes for /api/orders
  |   `-- webhookRoutes.js   # Route for /api/sepay/webhook
  `-- services/         # Core business logic layer
    `-- orderService.js    # In-memory storage, order generator, webhook matching logic
```

### 1. Root Files (`backend/`)

- **`package.json`**:
  - Configured with `"type": "module"` for native ES Module (`import` / `export`) support.
  - Dependencies:
    - `express` (`^4.21.0`): Web application framework.
    - `cors` (`^2.8.5`): Middleware to allow cross-origin requests from the React frontend.
    - `dotenv` (`^16.4.5`): Loads environment variables from `.env` into `process.env`.
  - Scripts:
    - `"dev"`: `node --watch src/server.js` (starts server with built-in file watcher).
    - `"start"`: `node src/server.js` (standard production process execution).
- **`.env` / `.env.example`**:
  - Securely stores sensitive parameters like API tokens and bank account credentials.

### 2. `src/config/`

- **`src/config/sepay.js`**:
  - Centralizes application settings from environment variables into `sepayConfig`.
  - Exports `generateVietQRUrl({ amount, des })` to produce direct VietQR image URLs using SePay standards:
    `https://qr.sepay.vn/img?acc={ACC}&bank={BANK}&amount={AMOUNT}&des={CODE}&template={TEMPLATE}`

### 3. `src/services/`

- **`src/services/orderService.js`**:
  - **In-Memory Store**: Manages active orders in a JavaScript `Map`.
  - **`generateOrderCode()`**: Produces compact transfer codes (e.g. `DH43767`) suitable for banking app descriptions.
  - **`createOrder()`**: Initializes an order with status `PENDING`, VietQR link, and a 10-minute expiration window.
  - **`getOrderById(id)`**: Retrieves an order and automatically marks it as `EXPIRED` if the 10-minute limit has passed.
  - **`cancelOrder(id, reason)`**: Transitions order state to `CANCELLED`.
  - **`processSepayWebhook(webhookData, authHeader)`**:
    - Validates the Authorization header against `SEPAY_API_KEY`.
    - Filters for incoming transactions (`transferType === 'in'`).
    - Locates matching pending order using order code in transaction description.
    - Verifies amount received is greater than or equal to the required order price.
    - Updates order to `PAID`, storing transaction reference ID and timestamp.
  - **`simulatePayment(id, status, reason)`**: Allows triggering instant mock success or failure for developer testing without real bank transfers.

### 4. `src/controllers/`

- **`src/controllers/orderController.js`**:
  - Bridges HTTP requests and the service layer:
  - `createOrder`: Validates amount and customer payload, responds with HTTP 201.
  - `getOrder`: Returns order status for client-side polling.
  - `cancelOrder`: Handles customer cancellation requests.
  - `simulatePayment`: Dev testing endpoint to force order state to `PAID` or `FAILED`.
  - `handleSepayWebhook`: Processes incoming SePay webhook payload, logging results.
  - `getAllOrders`: Lists orders for debugging purposes.

### 5. `src/routes/`

- **`src/routes/orderRoutes.js`**:
  - `POST /` -> Create order
  - `GET /` -> List all orders
  - `GET /:id` -> Fetch single order status
  - `POST /:id/cancel` -> Cancel order
  - `POST /:id/simulate` -> Simulate webhook status
- **`src/routes/webhookRoutes.js`**:
  - `POST /webhook` -> SePay webhook receiver

### 6. Entrypoint `src/server.js`

- Initializes Express, mounts CORS and JSON parsers, sets up logging middleware, mounts routers, serves public bank details at `GET /api/config`, provides a healthcheck at `GET /api/health`, and provides a user-friendly root message at `GET /`.

---

## API Endpoints Reference

### 1. Health Check

- **Method**: `GET`
- **Path**: `/api/health`
- **Response**:
  ```json
  {
    "status": "ok",
    "service": "SePay Payment Gateway Integration Backend",
    "timestamp": "2026-09-05T15:36:18.835Z"
  }
  ```

### 2. Create Payment Order

- **Method**: `POST`
- **Path**: `/api/orders`
- **Request Body**:
  ```json
  {
    "customer": {
      "name": "Nguyen Van A",
      "phone": "0912345678",
      "email": "customer@gmail.com"
    },
    "amount": 200000,
    "serviceName": "Gói Chuyên nghiệp (Pro)",
    "note": "Payment note"
  }
  ```
- **Response (201 Created)**: Returns order metadata, orderCode, bank information, and VietQR URL.

### 3. Check Order Status (Polling)

- **Method**: `GET`
- **Path**: `/api/orders/:id`
- **Purpose**: Frontend polls this endpoint every 2 seconds to check if status transitioned from `PENDING` to `PAID`, `FAILED`, or `EXPIRED`.

### 4. Cancel Order

- **Method**: `POST`
- **Path**: `/api/orders/:id/cancel`
- **Request Body**: `{ "reason": "User cancelled" }`

### 5. SePay Webhook Endpoint

- **Method**: `POST`
- **Path**: `/api/sepay/webhook`
- **Headers**: `Authorization: Apikey <SEPAY_API_KEY>`
- **Standard SePay Payload Format**:
  ```json
  {
    "id": 998877,
    "gateway": "MBBank",
    "transactionDate": "2026-09-05 22:36:00",
    "accountNumber": "0388888888",
    "transferType": "in",
    "transferAmount": 200000,
    "content": "DH43767 transfer",
    "referenceCode": "MBFT12345678",
    "description": "Order payment"
  }
  ```

### 6. Dev Payment Simulation

- **Method**: `POST`
- **Path**: `/api/orders/:id/simulate`
- **Request Body**:
  - Success: `{ "status": "PAID" }`
  - Failure: `{ "status": "FAILED", "reason": "Insufficient balance" }`

---

## Production Deployment with Live SePay

When deploying with a real bank account to accept live payments:

1. Register an account at [sepay.vn](https://sepay.vn).
2. Connect your bank account under **Bank Accounts**.
3. Under **Webhook Configuration**, configure:
   - **Webhook URL**: `https://your-domain.com/api/sepay/webhook`
   - **Authentication Type**: `API Key`
4. Update `backend/.env` with your actual bank credentials and API key.
