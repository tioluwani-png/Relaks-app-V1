/**
 * Rental Identity Verification
 *
 * TODO PHASE 4: Replace with real Core ID integration.
 * This stub approves everyone so Phase 2/3 can ship and be tested.
 *
 * When implementing Core ID:
 * 1. Call Core ID API to verify user identity
 * 2. Store verification status in a user_verifications table
 * 3. Return false if user is not verified or verification is expired
 * 4. Consider adding re-verification after X months
 */

export async function isVerifiedForRental(userId: string): Promise<boolean> {
  // TODO PHASE 4: Implement real Core ID verification
  // For now, approve all users to enable testing
  console.log(`[Rental Verification] Stub: approving user ${userId}`)
  return true
}

/**
 * Check if user needs to complete identity verification
 * TODO PHASE 4: Check user_verifications table
 */
export async function needsVerification(userId: string): Promise<boolean> {
  // TODO PHASE 4: Check if user has completed identity verification
  return false
}

/**
 * Get verification status for display
 * TODO PHASE 4: Return actual verification status
 */
export async function getVerificationStatus(userId: string): Promise<{
  verified: boolean
  verifiedAt: string | null
  expiresAt: string | null
}> {
  // TODO PHASE 4: Fetch from user_verifications table
  return {
    verified: true,
    verifiedAt: new Date().toISOString(),
    expiresAt: null,
  }
}
