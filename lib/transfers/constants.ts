// ============================================
// SidelineHQ Transfer System
// Constants
// ============================================

export const TRANSFER_LIMITS = {
  MAX_TRANSACTIONS_PER_WEEK: 3,  // buys + sells combined
  MIN_SQUAD_SIZE: 17,
  MAX_SQUAD_SIZE: 30,
} as const;

export const TRANSFER_STATUS = {
  ACTIVE: 'active',
  SOLD: 'sold',
  WITHDRAWN: 'withdrawn',
  EXPIRED: 'expired',
} as const;

export const OFFER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;