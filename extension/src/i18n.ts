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
      'popup.title': 'AI Analysis for Lichess',
      'popup.description': 'This extension integrates AI-powered chess analysis directly into Lichess.',
      'popup.usageLoading': 'Loading usage...',
      'popup.usageDisplay': 'Analyses: {{current}} of {{limit}}',
      'popup.devModeMessage': 'Usage tracking is disabled in development mode.',
      'popup.errorNetwork': 'Network error. Could not connect to server.',
      'popup.errorServer': 'Server error (Status: {{status}}). Please try again later.',
      'popup.loginPrompt': 'Please log in to continue using the analysis features.',
      'popup.continueWithGoogle': 'Continue with Google',
      'popup.error.googleAuth': 'Google authentication failed. Please try again.',
      'popup.error.userCancelled': 'Authentication cancelled by user.',
      'popup.error.supabaseLogin': 'Supabase login failed. Please try again.',
      'error.serverConnection': 'Could not connect to the server. Please check your connection.',
      'error.unknownAnalysisError': 'An unknown error occurred during the analysis.'
    }
  },
  de: {
    translation: {
      'analysis.title': 'KI Analyse',
      'analysis.create': 'KI ANALYSE ERSTELLEN',
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
      'popup.title': 'KI Analyse für Lichess',
      'popup.description': 'Diese Extension integriert KI-gestützte Schachanalysen direkt in Lichess.',
      'popup.usageLoading': 'Nutzung wird geladen...',
      'popup.usageDisplay': 'Analysen: {{current}} von {{limit}}',
      'popup.devModeMessage': 'Nutzungs-Tracking im Entwicklungsmodus deaktiviert.',
      'popup.errorNetwork': 'Netzwerkfehler. Konnte keine Verbindung zum Server herstellen.',
      'popup.errorServer': 'Serverfehler (Status: {{status}}). Bitte später erneut versuchen.',
      'popup.loginPrompt': 'Bitte melde dich an, um die Analysefunktionen weiterhin zu nutzen.',
      'popup.continueWithGoogle': 'Weiter mit Google',
      'popup.error.googleAuth': 'Google-Authentifizierung fehlgeschlagen. Bitte erneut versuchen.',
      'popup.error.userCancelled': 'Authentifizierung vom Benutzer abgebrochen.',
      'popup.error.supabaseLogin': 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.',
      'error.serverConnection': 'Verbindung zum Server fehlgeschlagen. Bitte prüfe deine Verbindung.',
      'error.unknownAnalysisError': 'Ein unbekannter Fehler ist während der Analyse aufgetreten.'
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
      'popup.title': 'Analyse IA pour Lichess',
      'popup.description': 'Cette extension intègre une analyse d\'échecs alimentée par l\'IA directement dans Lichess.',
      'popup.usageLoading': 'Chargement de l\'utilisation...',
      'popup.usageDisplay': 'Analyses : {{current}} sur {{limit}}',
      'popup.devModeMessage': 'Le suivi de l\'utilisation est désactivé en mode développement.',
      'popup.errorNetwork': 'Erreur réseau. Impossible de se connecter au serveur.',
      'popup.errorServer': 'Erreur du serveur (Statut : {{status}}). Veuillez réessayer plus tard.',
      'popup.loginPrompt': 'Veuillez vous connecter pour continuer à utiliser les fonctionnalités d\'analyse.',
      'popup.continueWithGoogle': 'Continuer avec Google',
      'popup.error.googleAuth': 'L\'authentification Google a échoué. Veuillez réessayer.',
      'popup.error.userCancelled': 'Authentification annulée par l\'utilisateur.',
      'popup.error.supabaseLogin': 'La connexion à Supabase a échoué. Veuillez réessayer.',
      'error.serverConnection': 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion.',
      'error.unknownAnalysisError': 'Une erreur inconnue est survenue lors de l\'analyse.'
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
      'popup.title': 'Análisis de IA para Lichess',
      'popup.description': 'Esta extensión integra análisis de ajedrez con IA directamente en Lichess.',
      'popup.usageLoading': 'Cargando uso...',
      'popup.usageDisplay': 'Análisis: {{current}} de {{limit}}',
      'popup.devModeMessage': 'El seguimiento de uso está deshabilitado en modo de desarrollo.',
      'popup.errorNetwork': 'Error de red. No se pudo conectar al servidor.',
      'popup.errorServer': 'Error del servidor (Estado: {{status}}). Por favor, inténtelo de nuevo más tarde.',
      'popup.loginPrompt': 'Por favor, inicia sesión para seguir utilizando las funciones de análisis.',
      'popup.continueWithGoogle': 'Continuar con Google',
      'popup.error.googleAuth': 'La autenticación de Google falló. Por favor, inténtelo de nuevo.',
      'popup.error.userCancelled': 'Autenticación cancelada por el usuario.',
      'popup.error.supabaseLogin': 'El inicio de sesión en Supabase falló. Por favor, inténtelo de nuevo.',
      'error.serverConnection': 'No se pudo conectar al servidor. Por favor, compruebe su conexión.',
      'error.unknownAnalysisError': 'Ocurrió un error desconocido durante el análisis.'
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
      'popup.title': 'Analisi AI per Lichess',
      'popup.description': 'Questa estensione integra l\'analisi scacchistica basata sull\'IA direttamente in Lichess.',
      'popup.usageLoading': 'Caricamento utilizzo...',
      'popup.usageDisplay': 'Analisi: {{current}} di {{limit}}',
      'popup.devModeMessage': 'Il tracciamento dell\'utilizzo è disabilitato in modalità sviluppo.',
      'popup.errorNetwork': 'Errore di rete. Impossibile connettersi al server.',
      'popup.errorServer': 'Errore del server (Stato: {{status}}). Riprova più tardi.',
      'popup.loginPrompt': 'Effettua il login per continuare a utilizzare le funzioni di analisi.',
      'popup.continueWithGoogle': 'Continua con Google',
      'popup.error.googleAuth': 'Autenticazione Google non riuscita. Riprova.',
      'popup.error.userCancelled': 'Autenticazione annullata dall\'utente.',
      'popup.error.supabaseLogin': 'Accesso a Supabase non riuscito. Riprova.',
      'error.serverConnection': 'Impossibile connettersi al server. Controlla la tua connessione.',
      'error.unknownAnalysisError': 'Si è verificato un errore sconosciuto durante l\'analisi.'
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
      'popup.title': 'Analiza AI dla Lichess',
      'popup.description': 'To rozszerzenie integruje analizę szachową opartą na AI bezpośrednio w Lichess.',
      'popup.usageLoading': 'Ładowanie użycia...',
      'popup.usageDisplay': 'Analizy: {{current}} z {{limit}}',
      'popup.devModeMessage': 'Śledzenie użycia jest wyłączone w trybie deweloperskim.',
      'popup.errorNetwork': 'Błąd sieci. Nie można połączyć się z serwerem.',
      'popup.errorServer': 'Błąd serwera (Status: {{status}}). Spróbuj ponownie później.',
      'popup.loginPrompt': 'Zaloguj się, aby kontynuować korzystanie z funkcji analizy.',
      'popup.continueWithGoogle': 'Kontynuuj z Google',
      'popup.error.googleAuth': 'Uwierzytelnianie Google nie powiodło się. Spróbuj ponownie.',
      'popup.error.userCancelled': 'Uwierzytelnianie anulowane przez użytkownika.',
      'popup.error.supabaseLogin': 'Logowanie do Supabase nie powiodło się. Spróbuj ponownie.',
      'error.serverConnection': 'Nie można połączyć się z serwerem. Sprawdź swoje połączenie.',
      'error.unknownAnalysisError': 'Wystąpił nieznany błąd podczas analizy.'
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
      'popup.title': 'Análise de IA para Lichess',
      'popup.description': 'Esta extensão integra a análise de xadrez com IA diretamente no Lichess.',
      'popup.usageLoading': 'Carregando uso...',
      'popup.usageDisplay': 'Análises: {{current}} de {{limit}}',
      'popup.devModeMessage': 'O rastreamento de uso está desativado no modo de desenvolvimento.',
      'popup.errorNetwork': 'Erro de rede. Não foi possível conectar ao servidor.',
      'popup.errorServer': 'Erro do servidor (Status: {{status}}). Por favor, tente novamente mais tarde.',
      'popup.loginPrompt': 'Faça login para continuar usando os recursos de análise.',
      'popup.continueWithGoogle': 'Continuar com o Google',
      'popup.error.googleAuth': 'A autenticação do Google falhou. Por favor, tente novamente.',
      'popup.error.userCancelled': 'Autenticação cancelada pelo usuário.',
      'popup.error.supabaseLogin': 'O login no Supabase falhou. Por favor, tente novamente.',
      'error.serverConnection': 'Não foi possível conectar ao servidor. Por favor, verifique sua conexão.',
      'error.unknownAnalysisError': 'Ocorreu um erro desconhecido durante a análise.'
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
      'popup.title': 'AI Analyse voor Lichess',
      'popup.description': 'Deze extensie voegt AI-schaakanalyse direct toe aan Lichess.',
      'popup.usageLoading': 'Gebruik wordt geladen...',
      'popup.usageDisplay': 'Analyses: {{current}} van {{limit}}',
      'popup.devModeMessage': 'Gebruikers-tracking is uitgeschakeld in de ontwikkelaarsmodus.',
      'popup.errorNetwork': 'Netwerkfout. Kon geen verbinding maken met de server.',
      'popup.errorServer': 'Serverfout (Status: {{status}}). Probeer het later opnieuw.',
      'popup.loginPrompt': 'Log in om de analysefuncties te blijven gebruiken.',
      'popup.continueWithGoogle': 'Doorgaan met Google',
      'popup.error.googleAuth': 'Google-authenticatie mislukt. Probeer het opnieuw.',
      'popup.error.userCancelled': 'Authenticatie geannuleerd door gebruiker.',
      'popup.error.supabaseLogin': 'Supabase-login mislukt. Probeer het opnieuw.',
      'error.serverConnection': 'Kon geen verbinding maken met de server. Controleer je verbinding.',
      'error.unknownAnalysisError': 'Er is een onbekende fout opgetreden tijdens de analyse.'
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

export function setupI18n(language: string) {
  // Setup i18next with detected language
  i18next.init({
    lng: language,
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
