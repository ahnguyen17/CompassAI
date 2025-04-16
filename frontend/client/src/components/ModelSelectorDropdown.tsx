import React, { useState, useEffect, useRef, Fragment } from 'react'; // Added Fragment
import styles from './ModelSelectorDropdown.module.css';
import useAuthStore from '../store/authStore';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface AvailableModels {
  [provider: string]: string[];
}

interface ModelSelectorDropdownProps {
  availableModels: AvailableModels;
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

const ModelSelectorDropdown: React.FC<ModelSelectorDropdownProps> = ({
  availableModels,
  selectedModel,
  onModelChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isDarkMode } = useAuthStore(); // Keep for potential future dark mode specific logic if needed
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation(); // Initialize translation hook

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    // Cleanup listener on unmount or when dropdown closes
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]); // Re-run effect when isOpen changes

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (model: string) => {
    onModelChange(model);
    setIsOpen(false);
  };

  // Placeholder for rendering logic
  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={styles.dropdownButton}
        title={t('chat_model_select_label')} // Use translation key
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        🤖
      </button>
      {/* Render dropdown panel */}
      {isOpen && (
        <div className={styles.dropdownPanel} role="listbox">
          {/* Add default option */}
          <div
            key="default-model"
            className={`${styles.modelItem} ${selectedModel === '' ? styles.modelItemSelected : ''}`}
            onClick={() => handleSelect('')}
            role="option"
            aria-selected={selectedModel === ''}
          >
            {t('chat_model_default')}
          </div>
          {/* Iterate through available models, sorting providers alphabetically */}
          {Object.keys(availableModels) // Get provider names
            .sort() // Sort provider names alphabetically
            .map(provider => { // Iterate through sorted provider names
              const models = availableModels[provider]; // Get models for the current provider
              return (
                <Fragment key={provider}>
                  <div className={styles.providerGroup}>{provider}</div>
                  {models.map(modelName => {
                // Determine display text (same logic as before)
                const displayText = provider.toLowerCase() === 'perplexity'
                    ? modelName.replace(/^perplexity\//, '')
                    : modelName;
                return (
                  <div
                    key={modelName}
                    className={`${styles.modelItem} ${selectedModel === modelName ? styles.modelItemSelected : ''}`}
                    onClick={() => handleSelect(modelName)}
                    role="option"
                    aria-selected={selectedModel === modelName}
                  >
                    {displayText}
                  </div>
                );
              })}
            </Fragment>
              );
          })}
        </div>
      )}
    </div>
  );
};

export default ModelSelectorDropdown;
