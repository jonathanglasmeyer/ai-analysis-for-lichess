import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from "bun";
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { RateLimiter } from './rate-limiter';
import { getClientIp, hashIp } from './src/utils/ip-utils';
import { getUsage, directUpdateUsage, UserUsageRow } from './src/supabaseClient';
import { IP_HASHING_SALT, MAX_ANONYMOUS_ANALYSES } from './src/config';
import { apiKeyAuth } from './auth-middleware';
import { Chess } from 'chess.js';

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

interface CheckCacheResponse {
  inCache: boolean;
  // Wenn im Cache, senden wir die Analyse direkt zurück
  analysis?: AnalyzeResponse;
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
  // credentials: true, // Temporarily removed for debugging
}));

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
    let clientIp = getClientIp(c.req.raw);
    const isProduction = env.NODE_ENV === 'production';

    let isDevFallbackIp = false;
    if (!clientIp && !isProduction) {
      // In development, if no IP is found (e.g. direct localhost call without proxy), use a fallback.
      clientIp = 'dev-fallback-ip'; 
      isDevFallbackIp = true;
      console.log('[USAGE] No client IP found in development, using fallback:', clientIp);
    }

    // Special response if in development mode and using the fallback IP
    if (!isProduction && isDevFallbackIp) {
      console.log('[USAGE] Development mode with fallback IP. Reporting usage tracking as effectively disabled.');
      return c.json({
        ok: true,
        developmentMode: true, // Flag for the frontend
        usage: { current: 0, limit: 0 }, // Dummy-values
        message: "Usage tracking is effectively disabled in development when a real client IP cannot be determined."
      });
    }

    // Ensure IP_HASHING_SALT is available
    if (!IP_HASHING_SALT) {
      console.error('[USAGE] IP_HASHING_SALT is not configured. Cannot proceed with usage tracking.');
      return c.json({ ok: false, error: "Server configuration error: IP_HASHING_SALT is missing.", errorCode: "SERVER_CONFIG_ERROR" }, 500);
    }

    const hashedIp = hashIp(clientIp!, IP_HASHING_SALT); // clientIp is guaranteed to be non-null here
    console.log(`[USAGE] Hashed IP (prefix): ${hashedIp.substring(0,8)}... for original IP (prefix): ${clientIp.substring(0,3)}...`);

    let currentUsage = 0;
    try {
      const usageData: UserUsageRow | null = await getUsage(hashedIp);

      if (usageData) {
        currentUsage = usageData.analysis_count;
      } else {
        // User not found (getUsage returned null), means usage is 0 (new user)
        console.log(`[USAGE] No usage data found for hashed IP (prefix): ${hashedIp.substring(0,8)}..., assuming new user.`);
        currentUsage = 0; // Explicitly set to 0, though it's already the default
      }
    } catch (dbError) {
      // This catch block now specifically handles errors thrown by getUsage (actual DB errors)
      console.error('[USAGE] Supabase error fetching usage:', dbError);
      return c.json({ ok: false, error: 'Failed to fetch usage data due to a database error.', errorCode: 'USAGE_FETCH_FAILED_DB' }, 500);
    }

    return c.json({
      ok: true,
      usage: {
        current: currentUsage,
        limit: MAX_ANONYMOUS_ANALYSES,
      },
    });

  } catch (error) {
    console.error('[USAGE] Unexpected error in /usage handler:', error);
    return c.json({ ok: false, error: 'An unexpected error occurred', errorCode: 'USAGE_UNEXPECTED_ERROR' }, 500);
  }
});

app.post('/analyze', apiKeyAuth(), analyzeLimiter.middleware(), async (c) => {
  try {
    // Extract and hash the client IP to create a unique user key for tracking usage
    const clientIp = getClientIp(c.req.raw);
    
    // For local development or testing, provide a default IP if none is found
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (!clientIp && !isDevelopment) {
      // In production, we require a valid client IP
      console.error('[ANALYZE] No client IP could be determined');
      return c.json({ 
        ok: false, 
        error: 'Could not determine client IP. Please ensure your request includes appropriate headers.' 
      }, 400);
    }
    
    // Use a placeholder IP for local development if no real IP is detected
    const effectiveIp = clientIp || '127.0.0.1';
    console.log(`[ANALYZE] Using IP: ${clientIp ? 'Real client IP' : 'Development fallback IP'}`);
    
    // Determine if usage should be tracked for this request
    // Skip tracking for development fallback IP (127.0.0.1) in development mode
    const shouldTrackUsage = !(isDevelopment && effectiveIp === '127.0.0.1');
    
    if (!shouldTrackUsage) {
      console.log('[ANALYZE] Development mode with fallback IP detected, skipping usage tracking');
    }
    
    // Create a salted hash of the IP for anonymous tracking
    let userKey;
    try {
      userKey = hashIp(effectiveIp, IP_HASHING_SALT || '');
      console.log(`[ANALYZE] Request from hashed IP: ${userKey.substring(0, 8)}...`);
    } catch (hashError) {
      console.error('[ANALYZE] Failed to hash client IP:', hashError);
      return c.json({ 
        ok: false, 
        error: 'Internal server error processing client identifier.' 
      }, 500);
    }
    
    // Fetch the current usage for this user from Supabase, if tracking is enabled
    if (shouldTrackUsage) {
      try {
        const usage = await getUsage(userKey);
        if (usage && usage.analysis_count >= MAX_ANONYMOUS_ANALYSES) {
          console.log(`[ANALYZE] User ${userKey.substring(0,8)}... has reached the analysis limit.`);
          return c.json({
            ok: false,
            error: `You have reached the limit of ${MAX_ANONYMOUS_ANALYSES} free analyses. Please create an account for unlimited analyses.`,
            errorCode: 'USAGE_LIMIT_EXCEEDED'
          }, 429); // Too Many Requests
        }
        console.log(`[ANALYZE] Current usage for ${userKey.substring(0,8)}...: ${usage?.analysis_count || 0} analyses`);
      } catch (dbError) {
        console.error('[ANALYZE] Failed to fetch usage data, proceeding without usage check:', dbError);
        // Graceful degradation: If DB is down, allow analysis but log the error.
        // This prevents the service from being entirely unavailable due to DB issues.
      }
    }
    const body = await c.req.json<AnalyzeRequest>();
    const locale = (body.locale && ['de', 'en', 'fr', 'es', 'it', 'pl', 'pt', 'nl'].includes(body.locale)) ? body.locale : 'de';
    // Map locale to language name for system prompt
    // Liste der unterstützten Sprachen
    const supportedLanguages = ['en', 'de', 'fr', 'es', 'it', 'pl', 'pt', 'nl'];
    
    // Funktion zur Auflösung der Sprache für den Prompt
    function resolveLanguageForPrompt(userLang: string): string {
      if (supportedLanguages.includes(userLang)) return userLang;
      return 'en'; // Fallback
    }
    
    // Bestimme die Sprache für den System-Prompt
    const resolvedLang = resolveLanguageForPrompt(locale || 'en');
    
    // Mapping von Sprachcodes zu vollständigen Sprachnamen
    const languageNames: Record<string, string> = {
      'en': 'English',
      'de': 'Deutsch',
      'fr': 'Français',
      'es': 'Español',
      'it': 'Italiano',
      'pl': 'Polski',
      'pt': 'Português',
      'nl': 'Nederlands'
    };
    
    const localeLang = languageNames[resolvedLang];
    console.log(`[LOCALE] Received locale from frontend:`, body.locale, '| Used locale:', locale, '| Resolved lang:', resolvedLang, '| Language for system prompt:', localeLang);
    
    if (!body.pgn) {
      return c.json({ ok: false, error: 'Missing PGN data' }, 400);
    }
    
    // Normalisiere das PGN mit der gemeinsamen Funktion
    console.log('[CACHE] Analyze: Original PGN hash:', crypto.createHash('md5').update(body.pgn).digest('hex'));
    const normalizedPgn = normalizePgn(body.pgn);
    console.log('[CACHE] Analyze: Normalized PGN hash:', crypto.createHash('md5').update(normalizedPgn).digest('hex'));
    console.log('[CACHE] Analyze: Cache key with locale:', getCacheFilename(normalizedPgn, locale));
    console.log('[CACHE] Analyze: Cache key without locale:', getCacheFilename(normalizedPgn));
    
    // Erstelle einen Hash-Schlüssel für das PGN
    const cacheKey = normalizedPgn;
    
    // Prüfe, ob die Analyse bereits im Cache ist (mit Locale-Unterstützung)
    console.log('[CACHE] Analyze: Trying to load with locale first');
    let cachedEntry = await loadFromCache(normalizedPgn, locale);
    
    // Wenn kein Eintrag mit Locale gefunden wurde, versuche es ohne
    if (!cachedEntry) {
      console.log('[CACHE] Analyze: No entry with locale found, trying without locale');
      cachedEntry = await loadFromCache(normalizedPgn);
    }
    
    if (cachedEntry) {
      // Prüfe, ob der Cache-Eintrag noch gültig ist
      const now = Date.now();
      
      if (now - cachedEntry.timestamp < CACHE_EXPIRY) {
        console.log('Cache hit for PGN analysis');
        
        // Gib die gecachte Antwort zurück, mit einem Flag, dass es aus dem Cache kommt
        return c.json({
          ...cachedEntry.response,
          cached: true
        });
      } else {
        // Cache-Eintrag ist abgelaufen
        console.log('Cache expired for PGN analysis');
        // Keine Notwendigkeit zu löschen, wird überschrieben
      }
    }
    
    // Cache-Miss: Nutze die Anthropic API für die Schachanalyse
    try {
      console.log('Cache miss, calling Anthropic API');
      
      // Erstelle den System-Prompt mit der gewünschten Sprache
      const systemPrompt = `You are a helpful chess analysis assistant. Please provide your analysis in ${localeLang}. The entire response must be in ${localeLang}, including all explanations, move descriptions, and strategic insights.`;
      console.log('[LOCALE] Setting system prompt with language:', localeLang);
      
      // Verwende einen einheitlichen englischen Prompt - die Sprache wird über den System-Prompt gesteuert
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

      // Definiere Modelle für primäre Nutzung und Fallback
      const primaryModel = "claude-sonnet-4-20250514";
      const fallbackModel = "claude-3-sonnet@20240229";
      let modelToUse = primaryModel;
      let message;
      
      try {
        console.log(`Attempting analysis with primary model: ${primaryModel}`);
        message = await anthropic.messages.create({
          model: modelToUse,
          max_tokens: 10000,
          temperature: 0.5,
          system: systemPrompt,
          messages: [
            { role: "user", content: prompt }
          ]
        });
      } catch (primaryModelError) {
        // Prüfe, ob der Fehler eine Überlastung des Modells anzeigt
        const errorString = String(primaryModelError);
        if (errorString.includes('Overloaded') || errorString.includes('529')) {
          console.log(`Primary model ${primaryModel} overloaded, attempting fallback to ${fallbackModel}`);
          modelToUse = fallbackModel;
          
          // Versuche es mit dem Fallback-Modell
          message = await anthropic.messages.create({
            model: modelToUse,
            max_tokens: 10000,
            temperature: 0.5,
            system: systemPrompt,
            messages: [
              { role: "user", content: prompt }
            ]
          });
          console.log(`Successfully used fallback model ${fallbackModel} for analysis`);
        } else {
          // Wenn es ein anderer Fehler ist, wirf ihn weiter
          throw primaryModelError;
        }
      }

      // Logge die vollständige Antwort von Anthropic
      console.log('Raw Anthropic response:', JSON.stringify(message, null, 2));
      
      // Die aktuelle Anthropic SDK-Version gibt das Ergebnis in einer anderen Struktur zurück
      let summary = '';
      if (message.content && message.content.length > 0) {
        // Extrahiere den Text aus den Content-Blöcken
        for (const block of message.content) {
          if ('text' in block) {
            summary += block.text;
          }
        }
      }
      
      // Logge die extrahierte Summary
      console.log('Extracted summary:', summary);
      
      // Sanitize und repariere die Claude-Antwort, falls nötig
      summary = sanitizeClaudeResponse(summary);
      
      // Parse the JSON response
      let parsedResponse: any = {};
      try {
        // Versuche, die Antwort als JSON zu parsen
        const jsonBlockRegex = /```(?:json)?([\s\S]*?)```/g;
        const match = jsonBlockRegex.exec(summary);
        
        if (match && match[1]) {
          parsedResponse = JSON.parse(match[1].trim());
        } else {
          // Try parsing directly
          parsedResponse = JSON.parse(summary);
        }
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        // Continue with empty response if parsing fails
      }
      
      // Korrigiere die Ply-Werte, wenn Momente vorhanden sind
      if (parsedResponse.moments && Array.isArray(parsedResponse.moments)) {
        const { correctedMoments } = correctPlies(normalizedPgn, parsedResponse.moments);
        console.log('Corrected moments:', JSON.stringify(correctedMoments, null, 2));
        
        // Setze die korrigierten Momente
        parsedResponse.moments = correctedMoments;
      }
      
      // Erstelle die Antwort
      const response: AnalyzeResponse = {
        ok: true,
        summary: summary,
        moments: parsedResponse.moments || [],
        cached: false
      };
      
      // Speichere die Analyse im Cache (mit Locale, wenn vorhanden)
      await saveToCache(normalizedPgn, {
        timestamp: Date.now(),
        response: response
      }, locale);
      
      // Logging
      console.log(`Saved analysis to filesystem cache`);
      
      // Increment usage count for this user after successful analysis, if tracking is enabled
      if (shouldTrackUsage) {
        try {
          console.log(`[ANALYZE] Attempting to increment usage for user_key: ${userKey.substring(0, 8)}...`);
          const updateResult = await directUpdateUsage(userKey, true); // true indicates anonymous user
          if (updateResult.error) {
            console.error('[ANALYZE] Failed to increment usage count:', updateResult.error);
            // In Entwicklung können wir trotzdem fortfahren - für Debugging-Zwecke
            const errorCode = updateResult.error.code || 'unknown';
            console.log(`[ANALYZE] Increment error code: ${errorCode}`);
            
            // Füge nur in der Entwicklung Debug-Informationen hinzu
            if (isDevelopment) {
              console.log(`[DEBUG] This is likely a SQL error in the Supabase stored procedure. ` +
                `Check if column "user_key" is properly qualified in the function.`);
            }
          } else {
            console.log(`[ANALYZE] Usage count updated: ${updateResult.data?.analysis_count || 'unknown'} analyses used`);
          }
        } catch (incrementError) {
          console.error('[ANALYZE] Error incrementing usage:', incrementError);
          // Continue despite error - we don't want to block returning the analysis results
        }
      }
      
      return c.json(response);
    } catch (anthropicError) {
      console.error('Anthropic API error:', anthropicError);
      return c.json({
        ok: false, 
        error: 'Error analyzing game with Anthropic API',
        details: anthropicError instanceof Error ? anthropicError.message : 'Unknown error'
      }, 500);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return c.json({ ok: false, error: 'Invalid request' }, 400);
  }
});

// Start the server
const port = parseInt(env.PORT || '3001');
console.log(`Server is running on port ${port}`);

export default {
  port,
  fetch: app.fetch
};
