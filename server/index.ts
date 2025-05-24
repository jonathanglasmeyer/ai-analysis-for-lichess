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
  return path.join(CACHE_DIR, `${hash}.json`);
}

// Lade einen Cache-Eintrag
async function loadFromCache(pgn: string): Promise<CacheEntry | null> {
  const cacheFile = getCacheFilename(pgn);
  
  try {
    const data = await fs.readFile(cacheFile, 'utf-8');
    return JSON.parse(data) as CacheEntry;
  } catch (error) {
    // Datei existiert nicht oder kann nicht gelesen werden
    return null;
  }
}

// Speichere einen Eintrag im Cache
async function saveToCache(pgn: string, entry: CacheEntry): Promise<void> {
  const cacheFile = getCacheFilename(pgn);
  
  try {
    await fs.writeFile(cacheFile, JSON.stringify(entry, null, 2), 'utf-8');
    console.log(`Saved analysis to cache: ${cacheFile}`);
  } catch (error) {
    console.error('Failed to save to cache:', error);
  }
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
      
      const prompt = `Du bist ein Schachexperte. Bitte analysiere die folgende Partie und gib die Antwort im **JSON-Format** zurück – mit zwei Abschnitten:

1. "summary": Eine kurze Gesamteinschätzung (2–4 Absätze), in der du erklärst:
   - Wer wann die Initiative hatte
   - Was strategisch interessant war
   - Wo der entscheidende Wendepunkt der Partie lag
   - Was der Spieler aus der Partie lernen kann

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
        system: "Du bist ein erfahrener Schachexperte und Trainer, der klare, präzise Analysen schreibt.",
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
