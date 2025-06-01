import { v4 as uuidv4, v5 as uuidv5, validate, version } from 'uuid';
import logger from './logger';

// Define namespace for name-based UUIDs (using a UUID v4)
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

/**
 * Generate a random UUID v4
 * @returns UUID v4 string
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Generate a deterministic UUID v5 based on a name and namespace
 * @param name Name to generate UUID from
 * @param namespace Optional namespace UUID (default: predefined namespace)
 * @returns UUID v5 string
 */
export function generateNamedUUID(name: string, namespace: string = NAMESPACE): string {
  try {
    return uuidv5(name, namespace);
  } catch (error: any) {
    logger.error('Error generating named UUID:', { name, namespace, error: error.message });
    // Fallback to random UUID
    return uuidv4();
  }
}

/**
 * Validate if a string is a valid UUID
 * @param uuid UUID string to validate
 * @returns true if the UUID is valid
 */
export function validateUUID(uuid: string): boolean {
  try {
    return validate(uuid);
  } catch (error: any) {
    logger.error('Error validating UUID:', { uuid, error: error.message });
    return false;
  }
}

/**
 * Check UUID version
 * @param uuid UUID string to check
 * @returns UUID version (1-5) or null if invalid
 */
export function getUUIDVersion(uuid: string): number | null {
  try {
    if (!validate(uuid)) {
      return null;
    }
    return version(uuid);
  } catch (error: any) {
    logger.error('Error getting UUID version:', { uuid, error: error.message });
    return null;
  }
}

/**
 * Generate a short unique ID (first 8 characters of a UUID)
 * @returns Short unique ID
 */
export function generateShortId(): string {
  return uuidv4().substring(0, 8);
}

/**
 * Generate a timestamp-prefixed UUID for sortable unique IDs
 * @returns Timestamp-prefixed UUID
 */
export function generateTimeUUID(): string {
  const timestamp = new Date().getTime().toString(16);
  const uuid = uuidv4().substring(0, 24);
  return `${timestamp}-${uuid}`;
}

/**
 * Generate a UUID with a specific prefix
 * @param prefix Prefix for the UUID
 * @returns Prefixed UUID
 */
export function generatePrefixedUUID(prefix: string): string {
  return `${prefix}-${uuidv4()}`;
}

/**
 * Extract the prefix from a prefixed UUID
 * @param prefixedUUID Prefixed UUID
 * @returns Extracted prefix or null if no prefix
 */
export function extractPrefix(prefixedUUID: string): string | null {
  const parts = prefixedUUID.split('-');
  if (parts.length < 2) {
    return null;
  }
  
  // The UUID itself is the last 5 segments joined with hyphens
  const uuidParts = parts.slice(-5);
  if (uuidParts.join('-').length !== 36) {
    return null;
  }
  
  // The prefix is everything before the UUID
  return parts.slice(0, -5).join('-');
}

export default {
  generateUUID,
  generateNamedUUID,
  validateUUID,
  getUUIDVersion,
  generateShortId,
  generateTimeUUID,
  generatePrefixedUUID,
  extractPrefix,
}; 