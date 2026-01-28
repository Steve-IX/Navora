/**
 * Check if a user ID is a guest user ID
 * Guest IDs follow the pattern: guest_<timestamp>_<random>
 */
export function isGuestUserId(userId: string): boolean {
  return typeof userId === 'string' && userId.startsWith('guest_');
}
