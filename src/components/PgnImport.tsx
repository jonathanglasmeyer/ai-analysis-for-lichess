import { useState } from 'react';

interface PgnImportProps {
  onImport: (pgn: string) => boolean;
}

/**
 * PgnImport component provides a UI for importing PGN game notation
 * Allows pasting PGN text into a textarea and importing it
 */
export function PgnImport({ onImport }: PgnImportProps) {
  const [pgnText, setPgnText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  const handleImport = () => {
    setError('');
    if (!pgnText.trim()) {
      setError('Please enter PGN text');
      return;
    }

    const success = onImport(pgnText);
    if (success) {
      setPgnText('');
      setIsOpen(false);
    } else {
      setError('Invalid PGN format. Please check your input and try again.');
    }
  };

  if (!isOpen) {
    return (
      <button 
        className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => setIsOpen(true)}
      >
        Import PGN
      </button>
    );
  }

  return (
    <div className="border rounded p-3 bg-white">
      <div className="font-bold mb-2">Import PGN</div>
      <textarea
        className="w-full border rounded p-2 h-32 font-mono text-sm"
        value={pgnText}
        onChange={(e) => setPgnText(e.target.value)}
        placeholder="Paste PGN text here..."
      />
      {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
      <div className="mt-2 flex justify-end gap-2">
        <button 
          className="text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => {
            setPgnText('');
            setIsOpen(false);
            setError('');
          }}
        >
          Cancel
        </button>
        <button 
          className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleImport}
        >
          Import
        </button>
      </div>
    </div>
  );
}
