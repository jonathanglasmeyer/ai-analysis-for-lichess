import * as crypto from 'node:crypto';

// The 'Request' type is the standard Fetch API Request type, which is globally available in Bun environments.

/**
 * Extracts the client's IP address from a Request object.
 * It checks common headers like 'x-forwarded-for', 'x-real-ip', and 'cf-connecting-ip'.
 * The 'x-forwarded-for' header can contain a list of IPs (client, proxy1, proxy2);
 * the client IP is typically the first one.
 * @param request The Request object.
 * @returns The client's IP address as a string, or null if not found or if headers are invalid.
 */
export function getClientIp(request: Request): string | null {
  const headers = request.headers;

  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // Split by comma and take the first IP, trimming whitespace.
    const ips = xForwardedFor.split(',');
    const clientIp = ips[0]?.trim();
    if (clientIp) {
      return clientIp;
    }
  }

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp.trim();
  }

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // Further IP extraction methods (e.g., from a direct connection object if available
  // and if the request object is more specific than the standard Fetch Request)
  // would go here. For now, we rely on common proxy headers.
  return null;
}

/**
 * Hashes an IP address using SHA-256 with a salt.
 * @param ip The IP address to hash. Must be a non-empty string.
 * @param salt The salt to use for hashing. Must be a non-empty string.
 * @returns The SHA-256 hashed IP address as a hex string.
 * @throws Error if ip or salt is empty or not provided, to prevent insecure hashing.
 */
export function hashIp(ip: string, salt: string): string {
  if (!ip || typeof ip !== 'string') {
    throw new Error('IP address must be a non-empty string for hashing.');
  }
  if (!salt || typeof salt !== 'string') {
    throw new Error('Salt must be a non-empty string for hashing.');
  }

  const hash = crypto.createHash('sha256');
  hash.update(ip + salt); // Combine IP and salt for hashing
  return hash.digest('hex');
}
