/**
 * Analysis UI components and functions
 */

import { AnalysisMoment } from '../services/api';

interface NormalizedAnalysisData {
  summary: string;
  moments: AnalysisMoment[];
}

/**
 * Creates the analyze button
 */
export function createAnalyzeButton(): HTMLButtonElement {
  const analyzeButton = document.createElement('button');
  analyzeButton.className = 'button';
  analyzeButton.textContent = 'AI ANALYSE ERSTELLEN';
  analyzeButton.style.margin = '10px';
  analyzeButton.style.padding = '8px 12px';
  analyzeButton.style.backgroundColor = '#629924'; // Green like Lichess buttons
  analyzeButton.style.color = 'white';
  analyzeButton.style.border = 'none';
  analyzeButton.style.borderRadius = '3px';
  analyzeButton.style.cursor = 'pointer';
  
  return analyzeButton;
}

/**
 * Normalizes analysis data from different sources
 */
export function normalizeAnalysisData(response: any): NormalizedAnalysisData {
  // Unified data structure for analyses
  const normalized: NormalizedAnalysisData = {
    summary: '',
    moments: []
  };
  
  // Log the response structure for analysis
  console.log('Response to normalize:', response);
  
  // Case 1: Cache hit with originalResponse
  if (response?.originalResponse?.analysis) {
    normalized.summary = response.originalResponse.analysis.summary || '';
    normalized.moments = response.originalResponse.analysis.moments || [];
    console.log('Normalized from originalResponse.analysis');
  }
  // Case 2: Cache hit with direct structure
  else if (response?.summary) {
    normalized.summary = response.summary || '';
    normalized.moments = response.moments || [];
    console.log('Normalized from direct response');
  }
  // Case 3: Fresh analysis with data structure
  else if (response?.data) {
    normalized.summary = response.data.summary || '';
    normalized.moments = response.data.moments || [];
    console.log('Normalized from response.data');
  }
  // Case 4: Direct analysis object
  else if (response?.analysis) {
    normalized.summary = response.analysis.summary || '';
    normalized.moments = response.analysis.moments || [];
    console.log('Normalized from response.analysis');
  }
  
  // If the summary contains markdown code blocks, parse them
  if (normalized.summary && normalized.summary.includes('```')) {
    try {
      // Remove code block markers (```json and ```)
      const cleanedText = normalized.summary.replace(/```json\n|```/g, '');
      const jsonObject = JSON.parse(cleanedText.trim());
      
      // If the JSON object has a summary, use it
      if (jsonObject.summary) {
        normalized.summary = jsonObject.summary;
        console.log('Parsed summary from JSON code block');
        
        // Also take moments if available
        if (jsonObject.moments && Array.isArray(jsonObject.moments)) {
          normalized.moments = jsonObject.moments;
          console.log('Parsed moments from JSON code block');
        }
      }
    } catch (e) {
      console.log('Failed to parse JSON from code block, using raw summary:', e);
      // Apply simple markdown formatting
      normalized.summary = normalized.summary
        .replace(/```json\n|```/g, '')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n- /g, '<br>• ');
    }
  }
  
  console.log('Normalized data:', {
    summary: normalized.summary.substring(0, 50) + '...',
    moments: normalized.moments.length
  });
  
  return normalized;
}

/**
 * Displays the analysis result in the content panel
 */
export function displayAnalysisResult(result: any, container: HTMLElement): void {
  // Normalize data from different formats
  const normalizedData = normalizeAnalysisData(result);
  
  // Display analysis summary
  container.innerHTML = `
    <div>
      
      <p style="white-space: pre-line;">${normalizedData.summary || 'Keine Zusammenfassung verfügbar'}</p>
      
      <div class="ai-moments-info" style="margin-top: 15px; font-size: 0.9em; color: #666;">
        <p>Wichtige Momente werden in der Zugliste hervorgehoben.</p>
      </div>
    </div>
  `;
  
  // Implement highlights in the move list if moments are available
  if (normalizedData.moments && normalizedData.moments.length > 0) {
    console.log(`Highlighting ${normalizedData.moments.length} moments in move list`);
    highlightMovesInMoveList(normalizedData.moments);
  } else {
    console.log('No moments to highlight');
  }
}

/**
 * Highlights moves in the Lichess move list
 */
export function highlightMovesInMoveList(moments: AnalysisMoment[]): void {
  console.log('Highlighting moves:', moments);
  
  // Find the move list
  const moveListContainer = document.querySelector('.tview2');
  if (!moveListContainer) {
    console.error('Move list container not found');
    return;
  }
  
  // Inject CSS for AI comments
  injectAICommentStyles();
  
  // Collect all moves in a ply-based mapping
  const momentsByPly: Record<number, AnalysisMoment> = {};
  moments.forEach(moment => {
    momentsByPly[moment.ply] = moment;
  });
  
  // Find all move entries in the move list
  setTimeout(() => {
    // Wait briefly as Lichess might update the move list dynamically
    const moveElements = moveListContainer.querySelectorAll('move');
    console.log('Found move elements:', moveElements.length);
    
    // Try to determine the half-move numbers (ply) for each move
    let currentPly = 0;
    moveElements.forEach(moveEl => {
      currentPly++;
      
      // Check if this move is an important moment
      if (momentsByPly[currentPly]) {
        // Only add the comment, no visual highlighting of the move
        const moment = momentsByPly[currentPly];
        
        // Check if a comment already exists after this move
        let commentElement = moveEl.nextElementSibling;
        let commentAlreadyExists = false;
        
        if (commentElement && commentElement.tagName.toLowerCase() === 'interrupt') {
          // Check if an AI comment already exists
          const existingAIComment = commentElement.querySelector('.ai-comment');
          if (existingAIComment) {
            commentAlreadyExists = true;
          } else {
            // Add to existing comments
            const commentContainer = commentElement.querySelector('comment') || 
                                     commentElement.querySelector('.comment');
            if (commentContainer) {
              insertAIComment(commentContainer as HTMLElement, moment);
              commentAlreadyExists = true;
            }
          }
        }
        
        // If no comment exists, add a new one
        if (!commentAlreadyExists) {
          // Create a new comment in Lichess style
          const interrupt = document.createElement('interrupt');
          const comment = document.createElement('comment');
          comment.className = 'ai-comment';
          
          insertAIComment(comment, moment);
          
          interrupt.appendChild(comment);
          
          // Insert the comment after the move
          if (moveEl.nextSibling) {
            moveEl.parentNode?.insertBefore(interrupt, moveEl.nextSibling);
          } else {
            moveEl.parentNode?.appendChild(interrupt);
          }
        }
        
        console.log('Highlighted move:', moveEl.textContent, 'ply:', currentPly);
      }
    });
  }, 500);
}

/**
 * Injects CSS styles for AI comments
 */
export function injectAICommentStyles(): void {
  if (document.getElementById('ai-comment-styles')) return;
  
  const styleSheet = document.createElement('style');
  styleSheet.id = 'ai-comment-styles';
  styleSheet.innerHTML = `
    .ai-comment {
      color: #805AD5 !important; /* Purple color for all AI comments */
      padding: 5px 0;
    }
    
    .ai-highlighted-move {
      background-color: rgba(128, 90, 213, 0.2) !important;
      border-radius: 3px;
    }
    
    .ai-recommendation {
      color: #805AD5; /* Keep purple color */
      margin-top: 3px;
    }
    
    .ai-recommendation-move {
      font-weight: bold; /* Only the move suggestion itself is bold */
    }
    
    .ai-reasoning {
      color: #805AD5; /* Also reasoning in purple */
      margin-top: 2px;
    }
    
    .ai-magic-icon {
      display: inline-block;
      margin-right: 4px;
      font-size: 14px;
    }
  `;
  
  document.head.appendChild(styleSheet);
}

/**
 * Inserts an AI comment into an element
 */
export function insertAIComment(element: HTMLElement, moment: AnalysisMoment): void {
  // Emoji for magic: ✨ (Sparkles)
  element.innerHTML = `
    <span class="ai-magic-icon">✨</span>
    ${moment.comment || ''}
    ${moment.recommendation ? `
      <div class="ai-recommendation">
        <span class="ai-recommendation-move">Besser: ${moment.recommendation}</span>
        <div class="ai-reasoning">${moment.reasoning || ''}</div>
      </div>
    ` : ''}
  `;
}
