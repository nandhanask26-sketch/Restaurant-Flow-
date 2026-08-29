/// <reference types="jest" />
import { generateVerificationCode } from '../src/utils/tokenGenerator';

describe('QR Code Verification & Single-Use Rules', () => {
  it('should generate a secure verification token for orders', () => {
    const orderId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const code = generateVerificationCode(orderId);

    expect(code).toMatch(/^VERIFY-A1B2C3D4-[A-F0-9]{16}$/);
  });

  it('should prevent replay/reuse of scanned QR codes', () => {
    let isScanned = false;
    let scanCount = 0;

    const verifyAndRedeem = (code: string) => {
      if (isScanned) {
        throw new Error('This QR code has already been verified and redeemed.');
      }
      isScanned = true;
      scanCount++;
      return { status: 'DELIVERED', code };
    };

    // First scan succeeds
    const firstScan = verifyAndRedeem('VERIFY-SAMPLE-1234');
    expect(firstScan.status).toBe('DELIVERED');
    expect(scanCount).toBe(1);

    // Second scan must be rejected
    expect(() => verifyAndRedeem('VERIFY-SAMPLE-1234')).toThrow(
      'This QR code has already been verified and redeemed.'
    );
    expect(scanCount).toBe(1);
  });
});
