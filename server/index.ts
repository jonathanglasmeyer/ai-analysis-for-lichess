import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from "bun";
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// Types
interface AnalyzeRequest {
  pgn: string;
}

interface AnalyzeResponse {
  ok: boolean;
  summary: string;
  cached?: boolean; // Zeigt an, ob die Antwort aus dem Cache kam
}

interface CheckCacheRequest {
  pgn: string;
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
function getCacheFilename(pgn: string): string {
  const hash = crypto.createHash('md5').update(pgn).digest('hex');
  return `${hash}.json`;
}

// Lade einen Cache-Eintrag
async function loadFromCache(pgn: string): Promise<CacheEntry | null> {
  const cacheFile = path.join(CACHE_DIR, getCacheFilename(pgn));
  console.log(`Versuche Cache zu laden von: ${cacheFile}`);
  
  try {
    const data = await fs.readFile(cacheFile, 'utf-8');
    console.log('Cache-Eintrag gefunden!');
    return JSON.parse(data) as CacheEntry;
  } catch (error) {
    // Datei existiert nicht oder kann nicht gelesen werden
    console.log('Kein Cache-Eintrag gefunden:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Speichere einen Eintrag im Cache
async function saveToCache(pgn: string, entry: CacheEntry): Promise<void> {
  try {
    const cacheFile = path.join(CACHE_DIR, getCacheFilename(pgn));
    await fs.writeFile(cacheFile, JSON.stringify(entry, null, 2), 'utf8');
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
  'https://chess-gpt.vercel.app',
  'https://chess-gpt-git-main.vercel.app'
];

const app = new Hono();

// Initialisiere den Cache-Ordner beim Serverstart
initializeCache();

// CORS middleware
app.use('*', cors({
  origin: (origin) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return '*';
    
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
app.post('/check-cache', async (c) => {
  try {
    const body = await c.req.json<CheckCacheRequest>();
    
    if (!body.pgn) {
      return c.json({ inCache: false }, 400);
    }
    
    // Normalisiere das PGN
    const normalizedPgn = body.pgn.trim();
    
    // Prüfe, ob die Analyse bereits im Cache ist
    const cachedEntry = await loadFromCache(normalizedPgn);
    
    if (cachedEntry) {
      // Prüfe, ob der Cache-Eintrag noch gültig ist
      const now = Date.now();
      
      if (now - cachedEntry.timestamp < CACHE_EXPIRY) {
        console.log('Cache check: HIT');
        
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
app.post('/analyze', async (c) => {
  try {
    const body = await c.req.json<AnalyzeRequest>();
    
    if (!body.pgn) {
      return c.json({ ok: false, error: 'Missing PGN data' }, 400);
    }
    
    // Normalisiere das PGN (entferne Whitespace), um bessere Cache-Treffer zu erzielen
    const normalizedPgn = body.pgn.trim();
    
    // Erstelle einen Hash-Schlüssel für das PGN
    const cacheKey = normalizedPgn;
    
    // Prüfe, ob die Analyse bereits im Cache ist
    const cachedEntry = await loadFromCache(normalizedPgn);
    
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
      
      const prompt = `Du bist ein Schachexperte. Bitte analysiere die folgende Partie und gib die Antwort im **JSON-Format** zurück.
      Gib die Antwort ausschließlich als valide JSON-Struktur zurück. Keine Kommentare, keine Einleitung, keine Erklärungen außerhalb des JSON! 
      Benutze ausschließlich gültige JSON-Syntax, insbesondere keine abschließenden Klammern oder Kommata an falscher Stelle. 
      Benutze ausschließlich doppelte Anführungszeichen (") und keine typografischen Zeichen.
      
      Beispiel:
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
      

1. "summary": Eine Gesamteinschätzung , in der du erklärst:
   - Wer wann die Initiative hatte
   - Was strategisch interessant war
   - Wo der entscheidende Wendepunkt der Partie lag
   - Was der Spieler aus der Partie lernen kann
   	•	Verwende bildhafte und anschauliche Sprache, um die Dynamik und Dramatik der Partie einzufangen. Analysiere, warum bestimmte Züge die Initiative verschieben, und erläutere kurz die wichtigsten taktischen und strategischen Motive, die dabei eine Rolle spielen.
	•	Gib konkrete Beispiele für Varianten oder Motive, wenn sie für das Verständnis wesentlich sind.
	•	Stelle im Fazit klar heraus, welche konkreten Lektionen aus der Partie für ähnliche Situationen abgeleitet werden können. Formuliere einprägsam und greifbar.
	•	Wenn möglich, arbeite heraus, wie sich die psychologische Situation der Spieler während der Partie gewandelt haben könnte.

   Innerhalb der Summary sollst du Referenzen auf Züge immer eindeutig identifizieren in folgender Form, z.B. [14. Nf3], oder bei schwarz [14... Nf6]. 

2. "moments": Eine Liste der **5 bis 10 wichtigsten oder lehrreichsten Züge** (kritische Momente), jeweils mit:
   - \`ply\`: Halbzugnummer (z. B. 14 = 7... für Schwarz)
   - \`move\`: Der gespielte Zug in SAN-Notation (z. B. Nf3, Qxd5, O-O)
   - \`color\`: \`"white"\` oder \`"black"\`
   - \`comment\`: Eine gut verständliche Erklärung, warum der Zug problematisch oder besonders war
   - \`recommendation\`: Ein besserer Zugvorschlag (in SAN)
   - \`reasoning\`: Eine menschlich erklärende Begründung, warum der Alternativzug besser ist
   - (optional) \`eval\`: Bewertung vor und nach dem Zug (z. B. \`+0.3 → -1.2\`), falls bekannt

Bitte schreibe die Analyse so, dass sie für fortgeschrittene Anfänger bis unteres Klubniveau (ca. 1400) verständlich und nützlich ist. Gib **keinen Text außerhalb des JSON-Blocks** zurück.

Hier ist die Partie im PGN-Format:

${normalizedPgn}`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 10000,
        temperature: 0.5,
        system: `Du bist ein erfahrener Schachtrainer, der präzise, verständliche und anschauliche Analysen schreibt. 
        Deine Sprache ist klar und nachvollziehbar, nutzt gelegentlich bildhafte Vergleiche, bleibt dabei aber sachlich und vermeidet Übertreibungen. 
        Ziel ist es, Partieanalysen interessant und einprägsam zu machen, ohne ins Dramatische oder Pathetische abzurutschen.`,
        messages: [
          { role: "user", content: prompt }
        ]
      });

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
      
      // Speichere die Antwort im Filesystem-Cache
      await saveToCache(normalizedPgn, {
        timestamp: Date.now(),
        response: response
      });
      
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
