import { env } from "@/env";

/**
 * Check if the credit system is enabled
 * Can be toggled via ENABLE_CREDIT_SYSTEM environment variable
 * @returns true if credit system is enabled, false otherwise
 */
export function isCreditSystemEnabled(): boolean {
  const enabled = env.ENABLE_CREDIT_SYSTEM?.toLowerCase();
  return enabled !== "false" && enabled !== "0" && enabled !== "no";
}

/**
 * Helper to conditionally execute credit operations
 * If credit system is disabled, returns true (allows operation)
 * If enabled, executes the provided function
 */
export async function withCreditCheck<T>(
  operation: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  if (!isCreditSystemEnabled()) {
    return fallbackValue;
  }
  return operation();
}
