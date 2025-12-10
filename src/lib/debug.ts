/**
 * Debug logging utility
 * Set DEBUG_LOGS=true in environment to enable verbose logging
 */

const DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_LOGS === "true" || false;

export const debug = {
  log: DEBUG_ENABLED ? console.log.bind(console) : () => {},
  warn: DEBUG_ENABLED ? console.warn.bind(console) : () => {},
  error: console.error.bind(console), // Always keep errors
  info: DEBUG_ENABLED ? console.info.bind(console) : () => {},
};
