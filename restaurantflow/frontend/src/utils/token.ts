/**
 * Token & Pass OTP Utilities for Cafeteria Order Management
 */

/**
 * Computes a consistent, memorable 6-digit numeric Pass OTP from a verification code or order ID.
 * Ensures customer and management counter staff always see the exact same 6-digit OTP.
 */
export function getPassOtp(code?: string, orderId?: string): string {
  if (code) {
    // If the code already embeds an explicit 6-digit OTP (e.g. VERIFY-782914-...)
    const match = code.match(/VERIFY-(\d{6})/i);
    if (match) return match[1];
  }

  // Deterministic 6-digit hash from the verification code or order ID
  const seed = (code || orderId || 'NALAN-ORDER').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) + hash + seed.charCodeAt(i);
  }
  const num = (Math.abs(hash) % 900000) + 100000;
  return num.toString();
}

/**
 * Formats token date into user-friendly format (e.g., "17 Sep 2026" or "Today, 17 Sep 2026")
 */
export function formatTokenDate(dateInput?: string | Date): string {
  if (!dateInput) return 'Today';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Today';

  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  const formatted = d.toLocaleDateString('en-IN', options);
  return isToday ? `Today, ${formatted}` : formatted;
}

/**
 * Formats token pickup time and serving slot (e.g., "12:30 PM (Immediate / Lunch Slot)")
 */
export function formatTokenTime(
  dateInput?: string | Date,
  preferredTimeType?: string
): { timeStr: string; slotLabel: string } {
  if (!dateInput) {
    return { timeStr: 'Immediate', slotLabel: 'Counter Pickup' };
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return { timeStr: 'Immediate', slotLabel: 'Counter Pickup' };
  }

  const timeStr = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  let slotLabel = 'Immediate Serving';
  if (preferredTimeType === 'SCHEDULED') {
    slotLabel = 'Scheduled Slot';
  } else if (preferredTimeType === 'LUNCH') {
    slotLabel = 'Lunch Serving';
  } else if (preferredTimeType === 'DINNER') {
    slotLabel = 'Dinner Serving';
  } else if (preferredTimeType === 'BREAKFAST') {
    slotLabel = 'Breakfast Serving';
  } else if (preferredTimeType === 'SNACKS') {
    slotLabel = 'Snacks Slot';
  }

  return { timeStr, slotLabel };
}
