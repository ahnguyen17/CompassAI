import React, { useState } from 'react';

interface CopyButtonProps {
  textToCopy: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      // Reset the "Copied!" state after a short delay
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Optionally show an error message to the user
    }
  };

  // Simple clipboard icon (using text/emoji for simplicity)
  // Replace with an SVG or icon library if preferred
  const icon = '📋';
  const checkIcon = '✅';

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard" // Keep title for visual users
      aria-label="Copy to clipboard" // Add ARIA label for screen readers
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 5px',
        marginLeft: '8px', // Space it from the message bubble
        fontSize: '0.9em',
        color: copied ? 'green' : '#6c757d', // Change color on copy
        opacity: 0.7, // Make it subtle
        transition: 'opacity 0.2s ease-in-out, color 0.2s ease-in-out',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
    >
      {copied ? checkIcon : icon}
    </button>
  );
};

export default CopyButton;
