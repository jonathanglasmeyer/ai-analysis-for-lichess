/**
 * PGN extraction utilities
 */

/**
 * Extracts PGN from the Lichess DOM using various methods
 */
export function extractPgn(): string | null {
  console.log('Attempting to extract PGN...');
  
  // Method 1: Directly from the .pgn element
  const pgnElement = document.querySelector('.pgn');
  if (pgnElement && pgnElement.textContent) {
    console.log('Found PGN via .pgn element');
    return pgnElement.textContent;
  }
  
  // Method 2: From the URL of the download link
  const downloadLinks = document.querySelectorAll('a[href*="/game/export/"]');
  if (downloadLinks.length > 0) {
    console.log('Found export links, fetching PGN...');
    // Extract the game ID from the URL
    const href = downloadLinks[0].getAttribute('href');
    if (!href) return null;
    
    const gameId = href.match(/\/game\/export\/([^?]+)/);
    
    if (gameId && gameId[1]) {
      console.log('Game ID found:', gameId[1]);
      // This method would require a fetch request, which we'll implement later
      return `Game ID: ${gameId[1]} (PGN wird vom Server geholt)`;
    }
  }
  
  // Method 3: From the current URL
  const currentUrl = window.location.href;
  const urlMatch = currentUrl.match(/lichess\.org\/([^/?#]+)/);
  if (urlMatch && urlMatch[1]) {
    console.log('Extracted game ID from URL:', urlMatch[1]);
    return `Game ID: ${urlMatch[1]} (PGN wird vom Server geholt)`;
  }
  
  console.error('Could not extract PGN');
  return null;
}
