import { useState } from 'react';

interface CopyPgnButtonProps {
  exportPgn: () => string;
}

export function CopyPgnButton({ exportPgn }: CopyPgnButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const pgn = exportPgn();
      await navigator.clipboard.writeText(pgn);
      setCopied(true);
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy PGN:', error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors relative"
      title="Copy PGN to clipboard"
    >
      {/* Copy Icon */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {copied ? (
          // Checkmark icon when copied
          <path d="M20 6L9 17l-5-5" />
        ) : (
          // Copy icon when not copied
          <>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </>
        )}
      </svg>
      
      {/* Success indicator - subtle animation */}
      {copied && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      )}
    </button>
  );
}
