import i18next from 'i18next';

const resources = {
  en: {
    translation: {
      'analysis.title': 'AI Analysis',
      'analysis.create': 'Create AI Analysis',
      'analysis.better': 'Better:',
      'status.analyzing': 'Analyzing game...',
      'status.checkingCache': 'Checking cache...',
      'status.searchingExisting': 'Looking for existing analysis for this game.',
      'status.creating': 'Creating new analysis...',
      'status.working': 'The AI is analyzing your game. This may take a moment.',
      'error.analysis': 'Analysis error:',
      'error.cacheCheck': 'Cache check error:',
      'error.serverUnreachable': 'Server not reachable. Please check your internet connection or try again later.',
      'error.pgnExtract': 'Could not extract PGN',
      'error.unexpected': 'Unexpected error during analysis',
      'error.noBackground': 'No response from background script',
      'error.noPGN': 'Could not find PGN',
    }
  },
  de: {
    translation: {
      'analysis.title': 'AI Analyse',
      'analysis.create': 'AI ANALYSE ERSTELLEN',
      'analysis.better': 'Besser:',
      'status.analyzing': 'Analysiere Partie...',
      'status.checkingCache': 'Prüfe Cache...',
      'status.searchingExisting': 'Suche nach bestehenden Analysen für diese Partie.',
      'status.creating': 'Erstelle neue Analyse...',
      'status.working': 'Die KI analysiert deine Partie. Dies kann einen Moment dauern.',
      'error.analysis': 'Fehler bei der Analyse:',
      'error.cacheCheck': 'Fehler bei der Cache-Prüfung:',
      'error.serverUnreachable': 'Server nicht erreichbar. Bitte prüfe deine Internetverbindung oder versuche es später erneut.',
      'error.pgnExtract': 'PGN konnte nicht extrahiert werden',
      'error.unexpected': 'Unerwarteter Fehler bei der Analyse',
      'error.noBackground': 'Keine Antwort vom Hintergrundskript erhalten',
      'error.noPGN': 'Konnte keine PGN finden',
    }
  },
  // Französisch
  fr: { 
    translation: {
      'analysis.title': 'Analyse IA',
      'analysis.create': 'Créer une analyse IA',
      'analysis.better': 'Meilleur:',
      'status.analyzing': 'Analyse de la partie...',
      'status.checkingCache': 'Vérification du cache...',
      'status.searchingExisting': 'Recherche d’analyses existantes pour cette partie.',
      'status.creating': 'Création d’une nouvelle analyse...',
      'status.working': 'L’IA analyse votre partie. Cela peut prendre un moment.',
      'error.analysis': 'Erreur d’analyse:',
      'error.cacheCheck': 'Erreur de vérification du cache:',
      'error.serverUnreachable': 'Serveur inaccessible. Veuillez vérifier votre connexion internet ou réessayer plus tard.',
      'error.pgnExtract': 'Impossible d’extraire le PGN',
      'error.unexpected': 'Erreur inattendue pendant l’analyse',
      'error.noBackground': 'Aucune réponse du script d’arrière-plan',
      'error.noPGN': 'Impossible de trouver le PGN',
    }
  },
  // Spanisch
  es: { 
    translation: {
      'analysis.title': 'Análisis IA',
      'analysis.create': 'Crear análisis IA',
      'analysis.better': 'Mejor:',
      'status.analyzing': 'Analizando partida...',
      'status.checkingCache': 'Comprobando caché...',
      'status.searchingExisting': 'Buscando análisis existentes para esta partida.',
      'status.creating': 'Creando nuevo análisis...',
      'status.working': 'La IA está analizando tu partida. Esto puede llevar un momento.',
      'error.analysis': 'Error de análisis:',
      'error.cacheCheck': 'Error al comprobar caché:',
      'error.serverUnreachable': 'Servidor no accesible. Por favor, comprueba tu conexión a internet o inténtalo más tarde.',
      'error.pgnExtract': 'No se pudo extraer el PGN',
      'error.unexpected': 'Error inesperado durante el análisis',
      'error.noBackground': 'Sin respuesta del script en segundo plano',
      'error.noPGN': 'No se pudo encontrar el PGN',
    }
  },
  // Italienisch
  it: { 
    translation: {
      'analysis.title': 'Analisi IA',
      'analysis.create': 'Crea analisi IA',
      'analysis.better': 'Migliore:',
      'status.analyzing': 'Analisi della partita in corso...',
      'status.checkingCache': 'Controllo della cache...',
      'status.searchingExisting': 'Ricerca di analisi esistenti per questa partita.',
      'status.creating': 'Creazione di una nuova analisi...',
      'status.working': 'L’IA sta analizzando la tua partita. Potrebbe richiedere un momento.',
      'error.analysis': 'Errore di analisi:',
      'error.cacheCheck': 'Errore nel controllo della cache:',
      'error.serverUnreachable': 'Server non raggiungibile. Controlla la tua connessione internet o riprova più tardi.',
      'error.pgnExtract': 'Impossibile estrarre il PGN',
      'error.unexpected': 'Errore imprevisto durante l’analisi',
      'error.noBackground': 'Nessuna risposta dallo script in background',
      'error.noPGN': 'Impossibile trovare il PGN',
    }
  },
  // Polnisch
  pl: { 
    translation: {
      'analysis.title': 'Analiza AI',
      'analysis.create': 'Utwórz analizę AI',
      'analysis.better': 'Lepiej:',
      'status.analyzing': 'Analizowanie gry...',
      'status.checkingCache': 'Sprawdzanie pamięci podręcznej...',
      'status.searchingExisting': 'Szukanie istniejących analiz dla tej gry.',
      'status.creating': 'Tworzenie nowej analizy...',
      'status.working': 'AI analizuje Twoją grę. Może to chwilę potrwać.',
      'error.analysis': 'Błąd analizy:',
      'error.cacheCheck': 'Błąd sprawdzania pamięci podręcznej:',
      'error.serverUnreachable': 'Serwer niedostępny. Sprawdź połączenie internetowe lub spróbuj ponownie później.',
      'error.pgnExtract': 'Nie można wyodrębnić PGN',
      'error.unexpected': 'Nieoczekiwany błąd podczas analizy',
      'error.noBackground': 'Brak odpowiedzi ze skryptu tła',
      'error.noPGN': 'Nie można znaleźć PGN',
    }
  },
  // Portugiesisch
  pt: { 
    translation: {
      'analysis.title': 'Análise IA',
      'analysis.create': 'Criar análise IA',
      'analysis.better': 'Melhor:',
      'status.analyzing': 'Analisando jogo...',
      'status.checkingCache': 'Verificando cache...',
      'status.searchingExisting': 'Procurando análises existentes para este jogo.',
      'status.creating': 'Criando nova análise...',
      'status.working': 'A IA está analisando seu jogo. Isso pode levar um momento.',
      'error.analysis': 'Erro de análise:',
      'error.cacheCheck': 'Erro na verificação do cache:',
      'error.serverUnreachable': 'Servidor não acessível. Verifique sua conexão com a internet ou tente novamente mais tarde.',
      'error.pgnExtract': 'Não foi possível extrair o PGN',
      'error.unexpected': 'Erro inesperado durante a análise',
      'error.noBackground': 'Sem resposta do script de fundo',
      'error.noPGN': 'Não foi possível encontrar o PGN',
    }
  },
  // Niederländisch
  nl: { 
    translation: {
      'analysis.title': 'AI Analyse',
      'analysis.create': 'AI analyse maken',
      'analysis.better': 'Beter:',
      'status.analyzing': 'Spel analyseren...',
      'status.checkingCache': 'Cache controleren...',
      'status.searchingExisting': 'Zoeken naar bestaande analyses voor dit spel.',
      'status.creating': 'Nieuwe analyse maken...',
      'status.working': 'De AI analyseert je spel. Dit kan even duren.',
      'error.analysis': 'Analysefout:',
      'error.cacheCheck': 'Fout bij cache controle:',
      'error.serverUnreachable': 'Server niet bereikbaar. Controleer je internetverbinding of probeer het later opnieuw.',
      'error.pgnExtract': 'Kon PGN niet extraheren',
      'error.unexpected': 'Onverwachte fout tijdens analyse',
      'error.noBackground': 'Geen reactie van achtergrondscript',
      'error.noPGN': 'Kon geen PGN vinden',
    }
  }
};

// Liste der unterstützten Sprachen für die Analyse
export const supportedLanguages = ['en', 'de', 'fr', 'es', 'it', 'pl', 'pt', 'nl'];

// Funktion zur Auflösung der Sprache für den Prompt
export function resolveLanguageForPrompt(userLang: string): string {
  if (supportedLanguages.includes(userLang)) return userLang;
  return 'en'; // Fallback
}

export function detectLichessLanguage(): string {
  // First, try <html lang>
  const htmlLang = document.documentElement.getAttribute('lang');
  if (htmlLang) {
    // Prüfe auf alle unterstützten Sprachen
    for (const lang of supportedLanguages) {
      if (htmlLang.startsWith(lang)) return lang;
    }
  }
  // Default fallback
  return 'en';
}

export function setupI18n() {
  // Setup i18next with detected language
  const lng = detectLichessLanguage();
  i18next.init({
    lng,
    fallbackLng: 'en',
    fallbackNS: 'translation',
    debug: false,
    resources
  });
}

// Watches for changes to <html lang> and updates i18next language accordingly
export function observeLanguageChange() {
  const html = document.documentElement;
  let currentLang = html.getAttribute('lang');

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'lang'
      ) {
        const newLang = html.getAttribute('lang');
        if (newLang && newLang !== currentLang) {
          currentLang = newLang;
          if (newLang.startsWith('de')) i18next.changeLanguage('de');
          else if (newLang.startsWith('en')) i18next.changeLanguage('en');
          else i18next.changeLanguage('en');
        }
      }
    });
  });

  observer.observe(html, { attributes: true, attributeFilter: ['lang'] });
}

export default i18next;
