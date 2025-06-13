// Einfache API-Key-Validierung für die Chess-GPT API
// Stellt sicher, dass nur autorisierte Clients auf die API zugreifen können

import { env } from "bun";
import { Context } from 'hono';

// API-Key aus der Umgebungsvariable lesen
const API_KEY = env.CHESS_GPT_API_KEY || 'default-dev-key-change-in-production';

// Protokolliere den API-Key beim Start (nur die ersten 4 Zeichen zur Sicherheit)
const maskedKey = API_KEY ? `${API_KEY.substring(0, 4)}...` : 'NOT SET';
console.log(`[AUTH] API Key configured: ${maskedKey}`);
console.log(`[AUTH] API Key length: ${API_KEY?.length || 0} characters`);

// Prüfen, ob ein API-Key gesetzt ist und warnen, wenn nicht
if (!env.CHESS_GPT_API_KEY) {
  console.warn('[AUTH] WARNING: CHESS_GPT_API_KEY is not set. Using default development key.');
  console.warn('[AUTH] Set CHESS_GPT_API_KEY environment variable for production use.');
}

// Middleware zur Validierung des API-Keys
export function apiKeyAuth() {
  return async (c: Context, next: () => Promise<void>) => {
    const path = c.req.path;
    console.log(`[AUTH] Validating API key for request to: ${path}`);
    
    // API-Key aus dem X-Api-Key-Header extrahieren
    const apiKey = c.req.header('X-Api-Key');
    console.log(`[AUTH] X-Api-Key header present: ${!!apiKey}`);
    console.log(`[AUTH] Extracted key from X-Api-Key: ${apiKey ? apiKey.substring(0, 4) + '...' : 'null'}`);
    console.log(`[AUTH] Extracted key length: ${apiKey?.length || 0} characters`);

    if (!apiKey) {
      console.log('[AUTH] Request rejected: No X-Api-Key header or key is empty');
      return c.json(
        { error: 'Unauthorized: Missing API key in X-Api-Key header' },
        401
      );
    }
    
    const isValid = apiKey === API_KEY;
    console.log(`[AUTH] API key valid: ${isValid}`);
    
    if (!isValid) {
      console.log('[AUTH] Request rejected: Invalid API key');
      return c.json(
        { error: 'Unauthorized: Invalid API key' },
        401
      );
    }
    
    // API-Key ist gültig, Anfrage weiterleiten
    console.log('[AUTH] Request authorized');
    await next();
  };
}
