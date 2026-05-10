/**
 * Inventory helper utilities for tracking expiration dates
 */

export interface ExpiryStatus {
  isExpired: boolean
  isNearExpiry: boolean
  daysUntilExpiry: number | null
  status: 'expired' | 'near-expiry' | 'ok' | 'no-date'
}

/**
 * Calculate expiry status for an item
 * @param expirationDate - ISO date string (YYYY-MM-DD) or null
 * @param daysThreshold - Number of days to consider as "near expiry" (default: 30)
 * @returns ExpiryStatus object
 */
export function getExpiryStatus(expirationDate: string | null | undefined, daysThreshold: number = 30): ExpiryStatus {
  if (!expirationDate) {
    return {
      isExpired: false,
      isNearExpiry: false,
      daysUntilExpiry: null,
      status: 'no-date'
    }
  }

  const expiry = new Date(expirationDate)
  const today = new Date()
  
  // Reset time to midnight for accurate day calculation
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)

  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) {
    return {
      isExpired: true,
      isNearExpiry: false,
      daysUntilExpiry: daysUntilExpiry,
      status: 'expired'
    }
  }

  if (daysUntilExpiry <= daysThreshold) {
    return {
      isExpired: false,
      isNearExpiry: true,
      daysUntilExpiry: daysUntilExpiry,
      status: 'near-expiry'
    }
  }

  return {
    isExpired: false,
    isNearExpiry: false,
    daysUntilExpiry: daysUntilExpiry,
    status: 'ok'
  }
}

/**
 * Get human-readable expiry message
 */
export function getExpiryMessage(expiryStatus: ExpiryStatus): string {
  if (expiryStatus.status === 'no-date') {
    return 'No expiry date'
  }
  if (expiryStatus.status === 'expired') {
    const daysAgo = Math.abs(expiryStatus.daysUntilExpiry ?? 0)
    return daysAgo === 0 ? 'Expired today' : `Expired ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`
  }
  if (expiryStatus.status === 'near-expiry') {
    const days = expiryStatus.daysUntilExpiry ?? 0
    return days === 0 ? 'Expires today' : `Expires in ${days} day${days === 1 ? '' : 's'}`
  }
  return 'OK'
}
