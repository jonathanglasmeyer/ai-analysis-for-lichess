/**
 * Configuration for the ChessGPT Chrome Extension
 */

// Definiert, ob die Extension im Produktionsmodus gebaut wird.
// Dieser Wert wird durch den Rollup-Build-Prozess (mittels @rollup/plugin-replace)
// basierend auf der NODE_ENV Umgebungsvariable gesetzt.
const IS_PRODUCTION_BUILD = process.env.NODE_ENV === 'production';

// Domain für den Produktionsserver
export const HETZNER_DOMAIN = 'chess-analysis-api.quietloop.dev';

// Server URL für API-Anfragen
export const SERVER_URL = IS_PRODUCTION_BUILD
  ? `https://${HETZNER_DOMAIN}`
  : 'http://localhost:3001';

// API-Key für die Authentifizierung (immer derselbe hartcodierte Wert)
export const CHESS_GPT_API_KEY = 'chess-gpt-extension-key-2022';

// Supabase Konfiguration
// Diese Werte werden durch den Rollup-Build-Prozess (mittels @rollup/plugin-replace)
// basierend auf den Umgebungsvariablen SUPABASE_URL und SUPABASE_ANON_KEY gesetzt.
export const SUPABASE_URL = "https://grorvvhwftzcwyhckfys.supabase.co";

export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb3J2dmh3ZnR6Y3d5aGNrZnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MzcwODEsImV4cCI6MjA2NTExMzA4MX0.RiwTIjGwLyN-LrcGuLkkomGgJSa1YNZhpju5TogGYr8";

// Maximale Anzahl anonymer Analysen (nur zur Anzeige, serverseitig erzwungen)
export const MAX_ANONYMOUS_ANALYSES = 5;

// Debug-Ausgabe für die Konfiguration (nur im Entwicklungsmodus)
if (!IS_PRODUCTION_BUILD) {
  console.log('[Config] Running in Development Mode');
  console.log('[Config] Server URL:', SERVER_URL);
  console.log('[Config] API Key:', CHESS_GPT_API_KEY ? `${CHESS_GPT_API_KEY.substring(0,3)}...` : 'NOT SET');
} else {
  console.log('[Config] Running in Production Mode');
  console.log('[Config] Server URL:', SERVER_URL);
  // API-Key ist immer derselbe, kann also auch im Produktionsmodus (gekürzt) geloggt werden, wenn gewünscht,
  // oder die Logik bleibt so, dass er nur im Dev-Modus geloggt wird.
  // Für Konsistenz mit vorheriger Logik, die den API-Key im Prod-Modus nicht loggt:
  // console.log('[Config] API Key:', CHESS_GPT_API_KEY ? `${CHESS_GPT_API_KEY.substring(0,3)}...` : 'NOT SET');
  // Wenn er im Prod-Modus NICHT geloggt werden soll, dann diese Zeile einfach leer lassen oder auskommentieren.
}
