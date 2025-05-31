import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from "bun";
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { RateLimiter } from './rate-limiter';

// Types
interface AnalyzeRequest {
  pgn: string;
  locale?: string;
}

interface AnalyzeResponse {
  ok: boolean;
  summary: string;
  cached?: boolean; // Zeigt an, ob die Antwort aus dem Cache kam
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

// Initialisiere den Cache-Ordner
async function initializeCache() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    console.log(`Cache directory initialized at ${CACHE_DIR}`);
  } catch (error) {
    console.error('Failed to initialize cache directory:', error);
  }
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
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
  credentials: true,
}));

// Health check endpoint
app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'Chess-GPT API is running' });
});

// Cache-Check Endpoint
app.post('/check-cache', cacheLimiter.middleware(), async (c) => {
  try {
    const body = await c.req.json<CheckCacheRequest>();
    console.log('[LOCALE] Cache check received locale:', body.locale);
    
    if (!body.pgn) {
      return c.json({ inCache: false }, 400);
    }
    
    // Normalisiere das PGN
    console.log('[CACHE] Original PGN hash:', crypto.createHash('md5').update(body.pgn).digest('hex'));
    const normalizedPgn = body.pgn.trim();
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
        
        // Gibt zurück, dass die Analyse im Cache ist, zusammen mit der Analyse selbst
        return c.json({
          inCache: true,
          analysis: {
            ...cachedEntry.response,
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
app.post('/analyze', analyzeLimiter.middleware(), async (c) => {
  try {
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
    
    // Normalisiere das PGN (entferne Whitespace), um bessere Cache-Treffer zu erzielen
    console.log('[CACHE] Analyze: Original PGN hash:', crypto.createHash('md5').update(body.pgn).digest('hex'));
    const normalizedPgn = body.pgn.trim();
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
      "comment": "string",
      "recommendation": "string",
      "reasoning": "string"
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
   - \`recommendation\`: (optional) A better move if the played move wasn't optimal
   - \`reasoning\`: (optional) Why the recommended move would have been better
   - (optional) \`eval\`: Evaluation before and after the move (e.g. \`+0.3 → -1.2\`), if known

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
      
      // Sanitize und repariere die Claude-Antwort, falls nötig
      summary = sanitizeClaudeResponse(summary);

      // Erstelle die Antwort
      const response: AnalyzeResponse = {
        ok: true,
        summary: summary,
        cached: false
      };
      
      // Speichere die Analyse im Cache (mit Locale, wenn vorhanden)
      await saveToCache(normalizedPgn, {
        timestamp: Date.now(),
        response: response
      }, locale);
      
      // Logging
      console.log(`Saved analysis to filesystem cache`);
      
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
