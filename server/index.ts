import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from "bun";
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { RateLimiter } from './rate-limiter';
import { getClientIp, hashIp } from './src/utils/ip-utils';
import { getUsage, directUpdateUsage, ensureUserUsageRecordExists, migrateUsage } from './src/supabaseClient'; // ensureUserUsageRecordExists und migrateUsage hinzugefügt, UserUsageRow entfernt
import { IP_HASHING_SALT, MAX_ANONYMOUS_ANALYSES, MAX_AUTHENTICATED_ANALYSES } from './src/config'; // MAX_AUTHENTICATED_ANALYSES hinzugefügt
import type { User } from '@supabase/supabase-js'; // User Typ hinzugefügt
import { apiKeyAuth } from './auth-middleware';
import { createMiddleware } from 'hono/factory';
import { supabase } from './src/supabaseClient';
import { Chess } from 'chess.js'; // Added: Import Chess for PGN validation and move generation

const DEV_FALLBACK_IP = 'dev-fallback-ip'; // Diese Konstante wieder hinzufügen

// Types
interface AnalyzeRequest {
  pgn: string;
  locale?: string;
}

interface AnalyzeResponse {
  ok: boolean;
  summary: string;
  moments?: AnalysisMoment[]; // Array der wichtigsten Züge mit Kommentaren
  cached?: boolean; // Zeigt an, ob die Antwort aus dem Cache kam
}

// Interface für Analyse-Momente
export interface AnalysisMoment {
  ply: number;
  move?: string;
  color?: string;
  comment?: string;
  isValidMove?: boolean; // Wird nicht mehr verwendet, da keine Empfehlungen mehr gegeben werden
}

interface CheckCacheRequest {
  pgn: string;
  locale?: string;
}

// Cache für PGN-Analysen
interface CacheEntry {
  timestamp: number;
  response: AnalyzeResponse;
}

// Konfiguration für den Filesystem-Cache
const CACHE_DIR = path.join(process.cwd(), 'cache');
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 Tage in Millisekunden

// Initialize server components (cache and database) on startup
initializeServer();

// JWT Authentication Middleware
const jwtAuthMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  let user = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Entferne "Bearer "
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
      if (authError) {
        if (authError.message.includes('token expired')) {
          console.log('[AUTH] JWT token expired.');
        } else {
          console.warn('[AUTH] Error validating token with Supabase:', authError.message);
        }
      } else if (userData && userData.user) {
        user = userData.user;
        console.log(`[AUTH] User ${user.id} authenticated via JWT for path: ${c.req.path}`);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('[AUTH] Exception during token validation:', errorMessage);
    }
  }
  c.set('user', user); // user ist entweder das User-Objekt oder null
  await next();
});


async function initializeServer() {
  await initializeCache(); // Initialize file system cache
  console.log('Server components initialized successfully.');
}

// Stelle sicher, dass der Cache-Ordner existiert
async function initializeCache() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    console.log(`Cache directory ensured at ${CACHE_DIR}`);
  } catch (error) {
    console.error('Failed to ensure cache directory exists:', error);
  }
}

// Normalisiert ein PGN für konsistente Cache-Lookups
function normalizePgn(pgn: string): string {
  // Entferne Kommentare, Varianten und überflüssige Leerzeichen
  return pgn.replace(/\{[^\}]*\}/g, '').replace(/\([^\)]*\)/g, '').trim();
}

// Generiere einen Hash für das PGN als Dateinamen
function getCacheFilename(pgn: string, locale?: string): string {
  // Wenn eine Locale angegeben ist, füge sie zum Hash hinzu
  const contentToHash = locale ? `${pgn}_${locale}` : pgn;
  const hash = crypto.createHash('md5').update(contentToHash).digest('hex');
  return `${hash}.json`;
}

// Lade einen Cache-Eintrag
async function loadFromCache(pgn: string, locale?: string): Promise<CacheEntry | null> {
  // Wenn eine Locale angegeben ist, versuche zuerst mit dieser Locale
  if (locale) {
    const cacheFileWithLocale = path.join(CACHE_DIR, getCacheFilename(pgn, locale));
    console.log(`[CACHE] Versuche Cache mit Locale '${locale}' zu laden: ${cacheFileWithLocale}`);
    
    try {
      const data = await fs.readFile(cacheFileWithLocale, 'utf-8');
      console.log(`[CACHE] Cache-Eintrag mit Locale '${locale}' gefunden!`);
      return JSON.parse(data) as CacheEntry;
    } catch (error) {
      console.log(`[CACHE] Kein Cache-Eintrag mit Locale '${locale}' gefunden`);
      // Weiter zum Fallback ohne Locale
    }
  }
  
  // Fallback: Versuche ohne Locale (für Backward-Kompatibilität)
  const cacheFile = path.join(CACHE_DIR, getCacheFilename(pgn));
  console.log(`[CACHE] Versuche Cache ohne Locale zu laden: ${cacheFile}`);
  
  try {
    const data = await fs.readFile(cacheFile, 'utf-8');
    console.log('[CACHE] Cache-Eintrag ohne Locale gefunden!');
    return JSON.parse(data) as CacheEntry;
  } catch (error) {
    // Datei existiert nicht oder kann nicht gelesen werden
    console.log('[CACHE] Kein Cache-Eintrag gefunden');
    return null;
  }
}

// Speichere einen Eintrag im Cache
async function saveToCache(pgn: string, entry: CacheEntry, locale?: string): Promise<void> {
  try {
    // Speichere mit Locale, wenn angegeben
    const cacheFile = path.join(CACHE_DIR, getCacheFilename(pgn, locale));
    await fs.writeFile(cacheFile, JSON.stringify(entry, null, 2), 'utf8');
    console.log(`Cache-Eintrag gespeichert in: ${cacheFile}`);
  } catch (error) {
    console.error('Failed to save to cache:', error);
    // Wir lassen den Fehler hier nicht weiter propagieren, um den Hauptablauf nicht zu stören
  }
}

// Bereinigt und repariert die Antwort von Claude
function sanitizeClaudeResponse(response: string): string {
  console.log('==== SANITIZE CLAUDE RESPONSE START ====');
  console.log('Original response length:', response.length);
  console.log('First 100 chars:', response.substring(0, 100));
  
  // 1. Prüfe, ob die Antwort in einen Markdown-Codeblock eingebettet ist
  const jsonBlockRegex = /```(?:json)?([\s\S]*?)```/g;
  const match = jsonBlockRegex.exec(response);
  
  // Fall 1: JSON in Markdown-Codeblock - wir überprüfen das JSON im Block
  if (match && match[1]) {
    console.log('✅ Found JSON in markdown codeblock!');
    const jsonContent = match[1].trim();
    console.log('JSON content length in block:', jsonContent.length);
    
    // Versuche das JSON zu parsen
    try {
      JSON.parse(jsonContent);
      console.log('✅ JSON in codeblock is valid!');
      console.log('==== SANITIZE CLAUDE RESPONSE END (VALID BLOCK) ====');
      // Original response zurückgeben, da das JSON bereits gültig ist
      return response;
    } catch (error) {
      // JSON in Block ist ungültig, versuchen wir es zu reparieren
      console.warn('❌ Invalid JSON in codeblock, attempting to fix...', error);
      console.log('Error message:', (error as Error).message);
      
      // JSON reparieren
      const fixedJson = fixJsonContent(jsonContent);
      
      // Wenn erfolgreich repariert, ersetzen wir nur den JSON-Teil im Codeblock
      try {
        JSON.parse(fixedJson);
        console.log('✅ Successfully fixed JSON in codeblock!');
        // Ersetze nur den JSON-Teil im Codeblock
        const fixedResponse = response.replace(jsonBlockRegex, 
          (_, blockContent) => '```json\n' + fixedJson + '\n```');
        console.log('==== SANITIZE CLAUDE RESPONSE END (FIXED BLOCK) ====');
        return fixedResponse;
      } catch (jsonError) {
        console.error('❌ Could not fix JSON in codeblock:', (jsonError as Error).message);
        console.log('==== SANITIZE CLAUDE RESPONSE END (FAILED BLOCK) ====');
        return response; // Original zurückgeben, wenn wir es nicht reparieren können
      }
    }
  } 
  
  // Fall 2: Kein Markdown-Block - prüfen, ob es direktes JSON ist
  console.log('No markdown code block found, checking if direct JSON');
  try {
    // Versuche zu parsen (nur als Test)
    JSON.parse(response);
    console.log('✅ Direct JSON is valid!');
    console.log('==== SANITIZE CLAUDE RESPONSE END (VALID DIRECT) ====');
    // Für konsistente Verarbeitung im Client: Wir verpacken es in einen Markdown-Block
    return '```json\n' + response + '\n```';
  } catch (error) {
    console.warn('❌ Invalid direct JSON detected, attempting to fix...', error);
    
    // Versuche, das JSON zu reparieren
    const fixedJson = fixJsonContent(response);
    
    try {
      JSON.parse(fixedJson);
      console.log('✅ Successfully fixed direct JSON!');
      console.log('==== SANITIZE CLAUDE RESPONSE END (FIXED DIRECT) ====');
      // Wir verpacken es in einen Markdown-Block für die Konsistenz
      return '```json\n' + fixedJson + '\n```';
    } catch (jsonError) {
      console.error('❌ Could not fix direct JSON:', (jsonError as Error).message);
      console.log('==== SANITIZE CLAUDE RESPONSE END (FAILED DIRECT) ====');
      // Wir geben die ursprüngliche Antwort zurück
      return response;
    }
  }
}

// Interface für Ply-Korrekturen
export interface PlyCorrection {
  san: string;
  originalPly: number;
  newPly: number;
  diff: number;
}

// Funktion zur Korrektur der Ply-Werte basierend auf der tatsächlichen Zugshistorie
export function correctPlies(pgn: string, moments: AnalysisMoment[]): {
  correctedMoments: AnalysisMoment[],
  corrections: PlyCorrection[]
} {
  console.log('[PlyCorrection] Starting ply correction for', moments.length, 'moments');
  
  // Erstelle ein neues Chess-Objekt und lade das PGN
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch (error) {
    console.error('[PlyCorrection] Error loading PGN into chess.js:', error);
    return { correctedMoments: moments, corrections: [] }; // Rückgabe der unveränderten Momente bei Fehler
  }
  
  // Hole die vollständige Zugshistorie
  const history = chess.history({ verbose: true });
  console.log('[PlyCorrection] Game history length:', history.length, 'moves');
  
  // Map für korrigierte Momente und Korrekturen
  const correctedMomentsMap: Record<number, AnalysisMoment> = {};
  const corrections: PlyCorrection[] = [];
  const assignedMoments = new Set<AnalysisMoment>();
  
  // Pass 1: Exakter Match von API-Ply und tatsächlichem Ply, sowie SAN-Match
  moments.forEach(moment => {
    if (!moment.move || assignedMoments.has(moment)) return;
    
    // Normalisiere den Zug (entferne Annotationen)
    const normalizedMove = moment.move.replace(/[\s\?\!\.]+/g, '');
    
    // Prüfe, ob der Ply-Wert innerhalb der Spielhistorie liegt
    // Da wir zu 1-basierter Ply-Zählung wechseln, müssen wir moment.ply - 1 verwenden
    // um den korrekten Index im history-Array zu erhalten
    if (moment.ply >= 1 && moment.ply - 1 < history.length) {
      // Da Ply-Werte 1-basiert sind, müssen wir moment.ply - 1 verwenden
      // um den korrekten Index im history-Array zu erhalten
      const historyMove = history[moment.ply - 1];
      const historySan = historyMove.san;
      
      // Prüfe auf exakten Match
      if (normalizedMove === historySan) {
        console.log(`[PlyCorrection] Pass 1: Exact match for SAN '${normalizedMove}' at ply ${moment.ply}`);
        // Bei exaktem Match ist keine Korrektur nötig, da wir bereits 1-basierte Ply-Werte verwenden
        correctedMomentsMap[moment.ply] = { ...moment };
        assignedMoments.add(moment);
        
        // Keine Korrektur nötig, aber wir tracken es trotzdem
        corrections.push({
          san: normalizedMove,
          originalPly: moment.ply,
          newPly: moment.ply,
          diff: 0
        });
      }
    }
  });
  
  // Pass 2: SAN-Match, aber API-Ply ist um +/-2 daneben
  moments.forEach(moment => {
    if (!moment.move || assignedMoments.has(moment)) return;
    
    // Normalisiere den Zug (entferne Annotationen)
    const normalizedMove = moment.move.replace(/[\s\?\!\.]+/g, '');
    
    // Suche nach dem Zug in der Historie mit einer Toleranz von +/-2 Plies
    for (let offset = -2; offset <= 2; offset++) {
      if (offset === 0) continue; // Bereits in Pass 1 geprüft
      
      // Berechne den zu prüfenden Ply-Wert (1-basiert)
      const checkPly = moment.ply + offset;
      // Konvertiere zu 0-basiertem Index für history-Array
      const historyIndex = checkPly - 1;
      
      if (checkPly >= 1 && historyIndex < history.length) {
        const historyMove = history[historyIndex];
        const historySan = historyMove.san;
        
        if (normalizedMove === historySan && !correctedMomentsMap[checkPly]) {
          console.log(`[PlyCorrection] Pass 2: Adjusting moment for SAN '${normalizedMove}' from API ply ${moment.ply} to history ply ${checkPly} (diff: ${offset})`);
          
          // Korrigiere den Ply-Wert auf den gefundenen checkPly (bereits 1-basiert)
          const correctedMoment = { ...moment, ply: checkPly };
          correctedMomentsMap[checkPly] = correctedMoment;
          assignedMoments.add(moment);
          
          // Tracke die Korrektur
          corrections.push({
            san: normalizedMove,
            originalPly: moment.ply,
            newPly: checkPly,
            diff: offset
          });
          
          break; // Sobald ein Match gefunden wurde, beenden
        }
      }
    }
  });
  
  // Erstelle ein Array aus den korrigierten Momenten
  const correctedMoments = Object.values(correctedMomentsMap);
  
  // Füge unkorrigierte Momente hinzu
  moments.forEach(moment => {
    if (!assignedMoments.has(moment)) {
      console.log(`[PlyCorrection] Moment for move '${moment.move}' at ply ${moment.ply} could not be corrected`);
      correctedMoments.push(moment);
    }
  });
  
  // Sortiere nach Ply
  correctedMoments.sort((a, b) => a.ply - b.ply);
  
  console.log(`[PlyCorrection] Completed with ${corrections.length} corrections`);
  return { correctedMoments, corrections };
}

// Funktion zur Korrektur der Ply-Werte in den Momenten
export function correctMomentPlies(pgn: string, moments: AnalysisMoment[]): AnalysisMoment[] {
  // Korrigiere die Ply-Werte
  const { correctedMoments } = correctPlies(pgn, moments);
  return correctedMoments;
}

// Hilfsfunktion zur Reparatur von JSON-Inhalten
function fixJsonContent(jsonContent: string): string {
  let fixedResponse = jsonContent;
  
  // a) Doppelte Kommas entfernen (z.B. {"a": 1,, "b": 2})
  const originalLength1 = fixedResponse.length;
  fixedResponse = fixedResponse.replace(/,\s*,/g, ',');
  if (originalLength1 !== fixedResponse.length) {
    console.log('🔧 Fixed double commas');
  }
  
  // b) Kommas vor schließenden Klammern entfernen (z.B. {"a": 1, "b": 2,})
  const originalLength2 = fixedResponse.length;
  fixedResponse = fixedResponse.replace(/,\s*}/g, '}');
  fixedResponse = fixedResponse.replace(/,\s*\]/g, ']');
  if (originalLength2 !== fixedResponse.length) {
    console.log('🔧 Fixed trailing commas');
  }
  
  // c) Kommas nach den öffnenden Klammern entfernen
  const originalLength3 = fixedResponse.length;
  fixedResponse = fixedResponse.replace(/{\s*,/g, '{');
  fixedResponse = fixedResponse.replace(/\[\s*,/g, '[');
  if (originalLength3 !== fixedResponse.length) {
    console.log('🔧 Fixed leading commas');
  }
  
  // d) Unbalancierte Anführungszeichen beheben (sehr vereinfacht)
  // Zähle die Anführungszeichen außerhalb von Escape-Sequenzen
  const quoteCount = (fixedResponse.match(/(?<!\\)"/g) || []).length;
  console.log('Quote count:', quoteCount);
  if (quoteCount % 2 !== 0) {
    console.warn('⚠️ Unbalanced quotes detected in JSON - this is harder to fix automatically');
  }
  
  console.log('After fixes, first 100 chars:', fixedResponse.substring(0, 100));
  return fixedResponse;
}

// Load environment variables
const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;

// Check if API key is available
if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY environment variable');
  console.error('Please create a .env file with your API key');
}

// Initialize Anthropic client - die neue Version nutzt andere API-Aufrufe
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY || '',
});
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://ai-analysis-for-lichess.vercel.app',
  'https://ai-analysis-for-lichess-git-main.vercel.app',
  'https://ai-analysis-for-lichess-api.onrender.com'
];

const app = new Hono();

// Initialisiere den Cache-Ordner beim Serverstart
initializeCache();

// Rate-Limiter für verschiedene Endpunkte
const analyzeLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  maxRequests: 30,          // 30 Anfragen pro Stunde
  message: 'Rate limit exceeded: 30 requests per hour allowed for analysis'
});

const cacheLimiter = new RateLimiter({
  windowMs: 60 * 1000,      // 1 Minute
  maxRequests: 10,          // 10 Anfragen pro Minute
  message: 'Rate limit exceeded: 10 requests per minute allowed for cache checking'
});

// CORS middleware
app.use('*', cors({
  origin: (origin) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return '*';
    
    // Erlaube alle Chrome Extensions
    if (origin.startsWith('chrome-extension://')) {
      return origin;
    }
    
    // Check if origin is allowed
    if (ALLOWED_ORIGINS.includes(origin)) {
      return origin;
    }
    
    return ALLOWED_ORIGINS[0]; // Default to first origin if not in the list
  },
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
  credentials: true,
}));

// JWT Auth Middleware für alle Routen
app.use('*', jwtAuthMiddleware);

// Health check endpoint
app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'Chess-GPT API is running' });
});

// Cache-Check Endpoint
app.post('/check-cache', apiKeyAuth(), async (c) => {
  try {
    const body = await c.req.json<CheckCacheRequest>();
    console.log('[LOCALE] Cache check received locale:', body.locale);
    
    if (!body.pgn) {
      return c.json({ inCache: false }, 400);
    }
    
    // Normalisiere das PGN mit der gemeinsamen Funktion
    console.log('[CACHE] Original PGN hash:', crypto.createHash('md5').update(body.pgn).digest('hex'));
    const normalizedPgn = normalizePgn(body.pgn);
    console.log('[CACHE] Normalized PGN hash:', crypto.createHash('md5').update(normalizedPgn).digest('hex'));
    console.log('[CACHE] Cache key with locale:', getCacheFilename(normalizedPgn, body.locale));
    console.log('[CACHE] Cache key without locale:', getCacheFilename(normalizedPgn));
    
    // Prüfe, ob die Analyse bereits im Cache ist (mit Locale-Unterstützung)
    console.log('[CACHE] Check-Cache: Trying to load with locale first');
    let cachedEntry = await loadFromCache(normalizedPgn, body.locale);
    
    // Wenn kein Eintrag mit Locale gefunden wurde, versuche es ohne
    if (!cachedEntry) {
      console.log('[CACHE] Check-Cache: No entry with locale found, trying without locale');
      cachedEntry = await loadFromCache(normalizedPgn);
    }
    
    if (cachedEntry) {
      // Prüfe, ob der Cache-Eintrag noch gültig ist
      const now = Date.now();
      
      if (now - cachedEntry.timestamp < CACHE_EXPIRY) {
        console.log('Cache check: HIT', body.locale ? 'mit Locale' : 'ohne Locale');
        
        // Stelle sicher, dass die Cache-Einträge korrekte Ply-Werte haben
        let cachedResponse = cachedEntry.response;
        if (cachedResponse && cachedResponse.moments && Array.isArray(cachedResponse.moments)) {
          // Korrigiere die Ply-Werte
          const { correctedMoments } = correctPlies(normalizedPgn, cachedResponse.moments);
          cachedResponse.moments = correctedMoments;
        }
        
        // Gibt zurück, dass die Analyse im Cache ist, zusammen mit der Analyse selbst
        return c.json({
          inCache: true,
          analysis: {
            ...cachedResponse,
            cached: true
          }
        });
      } else {
        console.log('Cache check: EXPIRED');
      }
    } else {
      console.log('Cache check: MISS');
    }
    
    // Analyse ist nicht im Cache oder abgelaufen
    return c.json({ inCache: false });
  } catch (error) {
    console.error('Error checking cache:', error);
    return c.json({ inCache: false, error: 'Invalid request' }, 400);
  }
});

// Analyze endpoint
// Endpoint to get current usage status
app.get('/usage', apiKeyAuth(), async (c) => {
  try {
    const authenticatedUser = c.get('user') as User | null;
    let clientIp = getClientIp(c.req.raw); // clientIp hier holen
    const isProduction = env.NODE_ENV === 'production';

    let userKeyForUsage: string;
    let isAnonymousUsage = true;
    let currentLimit = MAX_ANONYMOUS_ANALYSES;

    if (authenticatedUser && authenticatedUser.id) {
        userKeyForUsage = authenticatedUser.id;
        isAnonymousUsage = false;
        currentLimit = MAX_AUTHENTICATED_ANALYSES;
        console.log(`[USAGE] Authenticated user: ${authenticatedUser.id}. Using user ID for usage check.`);
        // Migration logic removed, will be handled by a dedicated POST endpoint
    } else {
        // Anonymer Nutzer oder Dev Fallback
        if (!isProduction && (!clientIp || clientIp === '::1' || clientIp === '127.0.0.1')) {
            clientIp = DEV_FALLBACK_IP; // Die Konstante verwenden
            console.log('[USAGE] Development mode (anonymous): Using DEV_FALLBACK_IP for usage check.');
        }

        if (!clientIp) {
            console.warn('[USAGE] Anonymous user: Client IP could not be determined.');
            return c.json({ ok: false, error: 'Client IP could not be determined for anonymous user.' }, 400);
        }

        if (!IP_HASHING_SALT) {
            console.error('[USAGE] IP_HASHING_SALT is not configured. Cannot proceed with usage tracking.');
            return c.json({ ok: false, error: "Server configuration error: IP_HASHING_SALT is missing.", errorCode: "SERVER_CONFIG_ERROR" }, 500);
        }
        
        const ipHash = hashIp(clientIp, IP_HASHING_SALT);
        userKeyForUsage = ipHash;
        console.log(`[USAGE] Anonymous user. Using IP: ${clientIp}. Hashed IP for usage check: ${userKeyForUsage.substring(0, 8)}...`);

        if (clientIp === DEV_FALLBACK_IP) {
            console.log('[USAGE] Development mode: DEV_FALLBACK_IP. Ensuring DB record and showing actual usage data.');
            await ensureUserUsageRecordExists(ipHash, true); // true für anonym
        }
    }

    // Tatsächliche Nutzungsdaten abrufen
    const usageData = await getUsage(userKeyForUsage);
    let currentUsage = 0;
    if (usageData) {
        currentUsage = usageData.analysis_count;
    } else {
        console.log(`[USAGE] No usage data found for ${isAnonymousUsage ? 'IP Hash' : 'user ID'} ${userKeyForUsage.substring(0,8)}..., assuming new user.`);
    }

    // Frontend-Hinweis für DEV_FALLBACK_IP, aber mit echten Daten
    const devModeResponsePart = (!isProduction && clientIp === DEV_FALLBACK_IP && isAnonymousUsage) 
        ? { developmentModeHint: true, message: "Displaying actual usage for DEV_FALLBACK_IP." }
        : {};

    return c.json({
        ok: true,
        usage: {
            current: currentUsage,
            limit: currentLimit
        },
        ...devModeResponsePart
    });

} catch (error) { // Combined error handling for DB or other issues
    console.error('[USAGE] Unexpected error in /usage handler:', error);
    // Check if it's a DB specific error if needed, otherwise generic
    if (error.code && error.message) { // Basic check for Supabase/PostgREST error structure
         console.error('[USAGE] Supabase error details:', JSON.stringify(error));
         return c.json({ ok: false, error: 'Failed to fetch usage data due to a database issue.', errorCode: 'USAGE_FETCH_FAILED_DB' }, 500);
    }
    return c.json({ ok: false, error: 'An unexpected error occurred in /usage.', errorCode: 'USAGE_UNEXPECTED_ERROR' }, 500);
}
});

// Endpoint to explicitly trigger usage migration
app.post('/usage/migrate', jwtAuthMiddleware, apiKeyAuth(), async (c) => {
  try {
    const authenticatedUser = c.get('user') as User | null;

    if (!authenticatedUser || !authenticatedUser.id) {
      console.log('[MIGRATE] User not authenticated.');
      return c.json({ ok: false, error: 'User not authenticated.' }, 401);
    }

    const userId = authenticatedUser.id;
    const clientIpForHashing: string | undefined = getClientIp(c.req.raw);
    const isDevelopment = process.env.NODE_ENV !== 'production';
    let ipToUseForHash: string;

    if (isDevelopment && (!clientIpForHashing || clientIpForHashing === '127.0.0.1' || clientIpForHashing === '::1')) {
      console.log(`[MIGRATE] User ${userId}: Development mode - No real IP or localhost, using DEV_FALLBACK_IP: ${DEV_FALLBACK_IP} for source hash.`);
      ipToUseForHash = DEV_FALLBACK_IP;
    } else if (!clientIpForHashing) {
      console.warn(`[MIGRATE] User ${userId}: Could not determine client IP for migration source and not in dev fallback. Migration might not find relevant anonymous usage.`);
      // Proceeding, but migrateUsage might find nothing if the original anonymous IP was different and not dev_fallback
      // For the user's current simplified scenario, this path is less critical.
      // If we wanted to be strict, we could return an error here if !isDevelopment.
      // However, if an anonymous user used a real IP, and then logs in from the same real IP, this should still work.
      return c.json({ ok: false, error: 'Could not determine source IP for migration and not in development fallback.' }, 400); 
    } else {
      ipToUseForHash = clientIpForHashing;
    }

    const ipHashToMigrate = await hashIp(ipToUseForHash, IP_HASHING_SALT);
    console.log(`[MIGRATE] User ${userId}: Determined source IP hash for migration as ${ipHashToMigrate.substring(0,8)}... (based on current request IP/fallback). Attempting migration.`);

    try {
      const migrationSuccess = await migrateUsage(userId, ipHashToMigrate);

      if (migrationSuccess) {
        console.log(`[MIGRATE] User ${userId}: Successfully migrated usage from IP hash ${ipHashToMigrate.substring(0,8)}...`);
        return c.json({ ok: true, message: 'Usage successfully migrated.' });
      } else {
        console.log(`[MIGRATE] User ${userId}: Migration from IP hash ${ipHashToMigrate.substring(0,8)}... reported no records migrated or failed (this is expected if no prior anonymous usage from this IP/fallback).`);
        return c.json({ ok: true, message: 'No usage data found to migrate from the determined IP hash, or migration failed.' });
      }
    } catch (migrationError) {
      console.error(`[MIGRATE] User ${userId}: Error during migration from IP hash ${ipHashToMigrate.substring(0,8)}...:`, migrationError);
      return c.json({ ok: false, error: 'An error occurred during usage migration.' }, 500);
    }
  } catch (error) {
    console.error('[MIGRATE] Unexpected error in /usage/migrate handler:', error);
    return c.json({ ok: false, error: 'An unexpected error occurred.' }, 500);
  }
});

app.post('/analyze', apiKeyAuth(), analyzeLimiter.middleware(), async (c) => {
  try {
    const authenticatedUser = c.get('user') as User | null;
    let clientIpForHashing: string | undefined = getClientIp(c.req.raw); // Potentially undefined
    const isDevelopment = process.env.NODE_ENV !== 'production';

    let userKeyForUsage: string;
    let isAnonymousUsage = true;
    let shouldTrackThisRequest = true; // Default to tracking
    let currentLimit = MAX_ANONYMOUS_ANALYSES;

    if (authenticatedUser && authenticatedUser.id) {
        userKeyForUsage = authenticatedUser.id;
        isAnonymousUsage = false;
        currentLimit = MAX_AUTHENTICATED_ANALYSES;
        console.log(`[ANALYZE] Authenticated user: ${authenticatedUser.id}. Using user ID for usage check. Limit: ${currentLimit}`);
    } else {
        // Anonymous user logic
        if (isDevelopment && (!clientIpForHashing || clientIpForHashing === '::1' || clientIpForHashing === '127.0.0.1')) {
            clientIpForHashing = DEV_FALLBACK_IP;
            console.log(`[ANALYZE] Development mode (anonymous): No real IP or localhost, using DEV_FALLBACK_IP: ${clientIpForHashing}`);
        }

        if (!clientIpForHashing) {
            console.error('[ANALYZE] Anonymous user: Client IP could not be determined.');
            return c.json({ ok: false, error: 'Client IP could not be determined for anonymous user.' }, 400);
        }

        if (!IP_HASHING_SALT) {
            console.error('[ANALYZE] IP_HASHING_SALT is not configured.');
            return c.json({ ok: false, error: 'Server configuration error: IP_HASHING_SALT is missing.' }, 500);
        }
        
        userKeyForUsage = hashIp(clientIpForHashing, IP_HASHING_SALT);
        console.log(`[ANALYZE] Anonymous user. IP used for hash: ${clientIpForHashing}. Hashed IP (userKey): ${userKeyForUsage.substring(0, 8)}... Limit: ${currentLimit}`);

        if (clientIpForHashing === DEV_FALLBACK_IP) {
            shouldTrackThisRequest = true; // Explicitly enable tracking for DEV_FALLBACK_IP
            console.log(`[ANALYZE] DEV_FALLBACK_IP detected. Usage tracking IS ENABLED. Ensuring DB record. Cookie setting for migration is removed.`);
            await ensureUserUsageRecordExists(userKeyForUsage, true); // true for anonymous
        } else if (isDevelopment) {
            // For other IPs in development (e.g., a real IP if ngrok is used),
            // tracking remains enabled by default (shouldTrackThisRequest = true).
            console.log(`[ANALYZE] Development mode with non-DEV_FALLBACK_IP (${clientIpForHashing}). Tracking enabled by default.`);
        }
        // In production, for anonymous users, shouldTrackThisRequest remains true by default.
    }
    
    // Fetch the current usage for this user, if tracking is enabled for this request
    if (shouldTrackThisRequest) {
        try {
            const usage = await getUsage(userKeyForUsage);
            if (usage && usage.analysis_count >= currentLimit) {
                console.log(`[ANALYZE] User ${userKeyForUsage.substring(0,8)}... (anon: ${isAnonymousUsage}) has reached the analysis limit of ${currentLimit}.`);
                return c.json({
                    ok: false,
                    error: `You have reached the limit of ${currentLimit} free analyses.`,
                    errorCode: 'USAGE_LIMIT_EXCEEDED'
                }, 429); // Too Many Requests
            }
            console.log(`[ANALYZE] Current usage for ${userKeyForUsage.substring(0,8)}... (anon: ${isAnonymousUsage}): ${usage?.analysis_count || 0}/${currentLimit} analyses`);
        } catch (dbError) {
            console.error(`[ANALYZE] Failed to fetch usage data for ${userKeyForUsage.substring(0,8)} (anon: ${isAnonymousUsage}), proceeding without usage check (graceful degradation):`, dbError);
        }
    } else {
        console.log(`[ANALYZE] Usage tracking is disabled for this request (userKey: ${userKeyForUsage.substring(0,8)}..., anon: ${isAnonymousUsage}).`);
    }

    const body = await c.req.json<AnalyzeRequest>();
    const locale = (body.locale && ['de', 'en', 'fr', 'es', 'it', 'pl', 'pt', 'nl'].includes(body.locale)) ? body.locale : 'de';
    
    const supportedLanguages = ['en', 'de', 'fr', 'es', 'it', 'pl', 'pt', 'nl'];
    function resolveLanguageForPrompt(userLang: string): string {
      if (supportedLanguages.includes(userLang)) return userLang;
      return 'en'; 
    }
    const resolvedLang = resolveLanguageForPrompt(locale || 'en');
    const languageNames: Record<string, string> = {
      'en': 'English', 'de': 'Deutsch', 'fr': 'Français', 'es': 'Español', 
      'it': 'Italiano', 'pl': 'Polski', 'pt': 'Português', 'nl': 'Nederlands'
    };
    const localeLang = languageNames[resolvedLang];
    console.log(`[LOCALE] Received locale from frontend:`, body.locale, '| Used locale:', locale, '| Resolved lang:', resolvedLang, '| Language for system prompt:', localeLang);

    if (!body.pgn) {
      return c.json({ ok: false, error: 'Missing PGN data' }, 400);
    }

    const normalizedPgn = normalizePgn(body.pgn);
    console.log('[CACHE] Analyze: Normalized PGN hash:', crypto.createHash('md5').update(normalizedPgn).digest('hex'));
    
    let cachedEntry = await loadFromCache(normalizedPgn, locale);
    if (!cachedEntry) {
      cachedEntry = await loadFromCache(normalizedPgn); // Fallback without locale
    }

    if (cachedEntry) {
      const now = Date.now();
      if (now - cachedEntry.timestamp < CACHE_EXPIRY) {
        console.log('Cache hit for PGN analysis. Key (locale part):', locale);
        return c.json({ ...cachedEntry.response, cached: true });
      } else {
        console.log('Cache expired for PGN analysis. Key (locale part):', locale);
      }
    }

    try {
      console.log('Cache miss or expired, calling Anthropic API. Key (locale part):', locale);
      const systemPrompt = `You are a helpful chess analysis assistant. Please provide your analysis in ${localeLang}. The entire response must be in ${localeLang}, including all explanations, move descriptions, and strategic insights.`;
      
      const prompt = `Please analyze the following game and provide the response in **JSON format**.
Provide the response exclusively as a valid JSON structure. No comments, no introduction, no explanations outside the JSON!
Use only valid JSON syntax, especially no trailing brackets or commas in the wrong place.
Use only double quotes (") and no typographic characters.

Example:
{
  "summary": "string",
  "moments": [
    {
      "ply": 0,
      "move": "string",
      "color": "white|black",
      "comment": "string"
    }
  ]
}

1. "summary": An overall assessment where you explain:
   - Who had the initiative and when
   - What was strategically interesting
   - Where the decisive turning point of the game was
   - What the player can learn from the game
   	•	Use vivid and illustrative language to capture the dynamics and drama of the game. Analyze why certain moves shift the initiative, and briefly explain the most important tactical and strategic motifs that play a role.
	•	Give concrete examples of variations or motifs if they are essential for understanding.
	•	In the conclusion, clearly highlight what concrete lessons can be derived from the game for similar situations. Formulate memorably and tangibly.
	•	If possible, work out how the psychological situation of the players might have changed during the game.

   Within the summary, you should always clearly identify references to moves in the following form, e.g. [14. Nf3], or for black [14... Nf6].

2. "moments": A list of the **5 to 10 most important or instructive moves** (critical moments), each with:
   - \`ply\`: Half-move number (e.g. 14 = 7... for Black)
   - \`move\`: The move played in SAN notation (e.g. Nf3, Qxd5, O-O)
   - \`color\`: \`"white"\` or \`"black"\`
   - \`comment\`: Explanation of why this move is important, what it achieves, or why it's good/bad

Write the analysis so that it is understandable and useful for advanced beginners up to lower club level (around 1400 Elo). **Do not return any text outside the JSON block.**

Here is the game in PGN format:
${normalizedPgn}`;

      const primaryModel = "claude-sonnet-4-20250514";
      const fallbackModel = "claude-3-sonnet@20240229";
      let modelToUse = primaryModel;
      let message;
      
      try {
        console.log(`Attempting analysis with primary model: ${primaryModel}`);
        message = await anthropic.messages.create({
          model: modelToUse, max_tokens: 10000, temperature: 0.5, system: systemPrompt,
          messages: [{ role: "user", content: prompt }]
        });
      } catch (primaryModelError) {
        const errorString = String(primaryModelError);
        if (errorString.includes('Overloaded') || errorString.includes('529')) {
          console.log(`Primary model ${primaryModel} overloaded, attempting fallback to ${fallbackModel}`);
          modelToUse = fallbackModel;
          message = await anthropic.messages.create({
            model: modelToUse, max_tokens: 10000, temperature: 0.5, system: systemPrompt,
            messages: [{ role: "user", content: prompt }]
          });
          console.log(`Successfully used fallback model ${fallbackModel} for analysis`);
        } else {
          throw primaryModelError;
        }
      }

      let summaryText = '';
      if (message.content && message.content.length > 0) {
        for (const block of message.content) {
          if ('text' in block) { summaryText += block.text; }
        }
      }
      console.log('Extracted summary from Anthropic:', summaryText.substring(0, 200) + "...");
      summaryText = sanitizeClaudeResponse(summaryText);
      
      let parsedResponseContent: any = {};
      try {
        const jsonBlockRegex = /```(?:json)?([\s\S]*?)```/g;
        const match = jsonBlockRegex.exec(summaryText);
        if (match && match[1]) {
          parsedResponseContent = JSON.parse(match[1].trim());
        } else {
          parsedResponseContent = JSON.parse(summaryText);
        }
      } catch (parseError) {
        console.error('Error parsing JSON response from Anthropic:', parseError);
      }
      
      if (parsedResponseContent.moments && Array.isArray(parsedResponseContent.moments)) {
        const { correctedMoments } = correctPlies(normalizedPgn, parsedResponseContent.moments);
        parsedResponseContent.moments = correctedMoments;
      }
      
      const analysisResponse: AnalyzeResponse = {
        ok: true,
        summary: summaryText, 
        moments: parsedResponseContent.moments || [],
        cached: false
      };
      
      await saveToCache(normalizedPgn, { timestamp: Date.now(), response: analysisResponse }, locale);
      console.log(`[ANALYZE] Saved analysis to filesystem cache. Key (locale part): ${locale}`);
      
      if (shouldTrackThisRequest) {
        try {
          console.log(`[ANALYZE] Attempting to increment usage for userKey: ${userKeyForUsage.substring(0, 8)}... (isAnonymous: ${isAnonymousUsage})`);
          const updateResult = await directUpdateUsage(userKeyForUsage, isAnonymousUsage);
          if (updateResult.error) {
            console.error(`[ANALYZE] Failed to increment usage count for ${userKeyForUsage.substring(0, 8)}...:`, updateResult.error);
          } else {
            console.log(`[ANALYZE] Usage count updated for ${userKeyForUsage.substring(0, 8)}... New count: ${updateResult.data?.analysis_count || 'unknown'}`);
          }
        } catch (incrementError) {
          console.error('[ANALYZE] Error during usage increment call:', incrementError);
        }
      }
      
      return c.json(analysisResponse);

    } catch (anthropicOrApiError) {
      console.error('Anthropic API or other upstream error in /analyze:', anthropicOrApiError);
      return c.json({
        ok: false, 
        error: 'Error analyzing game with Anthropic API or during processing.',
        details: anthropicOrApiError instanceof Error ? anthropicOrApiError.message : String(anthropicOrApiError)
      }, 500);
    }

} catch (error) { // Outer catch for the entire /analyze endpoint
    console.error('Outer error processing /analyze request:', error);
    return c.json({ ok: false, error: 'Invalid request or unexpected server error.', errorCode: 'ANALYZE_UNEXPECTED_ERROR' }, 500);
}
});

// Start the server
const port = parseInt(env.PORT || '3001');
console.log(`Server is running on port ${port}`);

export default {
  port,
  fetch: app.fetch
};
