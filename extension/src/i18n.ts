import i18next from 'i18next';

const resources = {
  en: {
    translation: {
      'analysis.title': 'AI Analysis',
      'analysis.create': 'Create AI Analysis',
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
  }
};

export function detectLichessLanguage(): 'en' | 'de' {
  // First, try <html lang>
  const htmlLang = document.documentElement.getAttribute('lang');
  if (htmlLang) {
    if (htmlLang.startsWith('de')) return 'de';
    if (htmlLang.startsWith('en')) return 'en';
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
