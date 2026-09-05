import dotenv from 'dotenv';
dotenv.config();

export const sepayConfig = {
  port: process.env.PORT || 5000,
  apiKey: process.env.SEPAY_API_KEY || 'sepay_demo_secret_key_123',
  bankAccount: process.env.BANK_ACCOUNT || '0388888888',
  bankName: process.env.BANK_NAME || 'MBBank',
  accountName: process.env.ACCOUNT_NAME || 'NGUYEN VAN A',
  qrTemplate: process.env.QR_TEMPLATE || 'compact',
};

/**
 * Generate VietQR image URL from SePay gateway
 * Format: https://qr.sepay.vn/img?acc={ACCOUNT}&bank={BANK}&amount={AMOUNT}&des={DESCRIPTION}&template={TEMPLATE}
 */
export function generateVietQRUrl({ amount, des }) {
  const params = new URLSearchParams({
    acc: sepayConfig.bankAccount,
    bank: sepayConfig.bankName,
    amount: String(amount || 0),
    des: des || '',
    template: sepayConfig.qrTemplate,
  });

  return `https://qr.sepay.vn/img?${params.toString()}`;
}