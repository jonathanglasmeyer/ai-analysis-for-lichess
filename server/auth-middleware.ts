// Einfache API-Key-Validierung für die Chess-GPT API
// Stellt sicher, dass nur autorisierte Clients auf die API zugreifen können

import { env } from "bun";

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
  return async (c: any, next: () => Promise<void>) => {
    const path = c.req.path;
    console.log(`[AUTH] Validating API key for request to: ${path}`);
    
    // API-Key aus dem Authorization-Header extrahieren
    const authHeader = c.req.header('Authorization');
    console.log(`[AUTH] Authorization header present: ${!!authHeader}`);
    
    if (!authHeader) {
      console.log('[AUTH] Request rejected: No Authorization header');
      return c.json(
        { error: 'Unauthorized: Missing API key' },
        401
      );
    }
    
    const apiKey = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7).trim() 
      : null;
    
    console.log(`[AUTH] API key extracted: ${!!apiKey}`);
    console.log(`[AUTH] Extracted key length: ${apiKey?.length || 0} characters`);
    
    // Prüfen, ob der API-Key gültig ist
    if (!apiKey) {
      console.log('[AUTH] Request rejected: Invalid Bearer format');
      return c.json(
        { error: 'Unauthorized: Invalid API key format' },
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
