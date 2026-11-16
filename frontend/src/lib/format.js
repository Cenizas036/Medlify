/**
 * lib/format.js — Shared formatting utilities
 */

/** Format distance in metres to human-readable string */
export function formatDist(m) {
  const n = Number(m);
  if (isNaN(n)) return '';
  return n < 1000 ? `${Math.round(n)} m` : `${(n / 1000).toFixed(1)} km`;
}

/** Format INR currency */
export function formatPrice(p) {
  return `₹${Number(p).toFixed(0)}`;
}

/** Format date to Indian locale */
export function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format date to short */
export function formatDateShort(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
  });
}

/** Stock status from quantity */
export function stockStatus(qty) {
  const q = Number(qty);
  if (q <= 0) return 'out';
  if (q <= 10) return 'low';
  return 'in';
}

export function stockLabel(qty) {
  const q = Number(qty);
  if (q <= 0) return 'Out of stock';
  if (q <= 10) return `Only ${q} left`;
  return 'In stock';
}

/** Order status display */
export const STATUS_LABELS = {
  placed:          'Placed',
  accepted:        'Accepted',
  out_for_delivery:'Out for delivery',
  delivered:       'Delivered',
  cancelled:       'Cancelled',
};

export const STATUS_STEPS = ['placed', 'accepted', 'out_for_delivery', 'delivered'];
