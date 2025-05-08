import React, { useState, useEffect, useRef, Fragment } from 'react'; // Added Fragment
import styles from './ModelSelectorDropdown.module.css';
import useAuthStore from '../store/authStore';
import { useTranslation } from 'react-i18next';

// Interface for a single Custom Model (matching backend structure)
interface CustomModelData {
    _id: string;
    name: string;
    providerName: string;
    baseModelIdentifier: string;
    baseModelSupportsVision: boolean; // New flag
}

// Interface for a single Base Model object (new structure)
interface BaseModelData {
    name: string;
    supportsVision: boolean;
}

// Interface for the combined data structure from the backend
interface CombinedAvailableModels {
  baseModels: { [provider: string]: BaseModelData[] }; // Updated: Array of objects
  customModels: CustomModelData[];
}

interface ModelSelectorDropdownProps {
  availableModels: CombinedAvailableModels; // Updated prop type
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
  const { t } = useTranslation();

  // Group custom models by their provider name
  const groupedCustomModels: { [providerName: string]: CustomModelData[] } = availableModels.customModels.reduce((acc, model) => {
      const provider = model.providerName || 'Custom'; // Group under 'Custom' if provider name missing
      if (!acc[provider]) {
          acc[provider] = [];
      }
      acc[provider].push(model);
      return acc;
  }, {} as { [providerName: string]: CustomModelData[] });

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

          {/* --- Render Custom Models First --- */}
          {Object.keys(groupedCustomModels)
            .sort() // Sort custom provider names
            .map(customProviderName => (
              <Fragment key={`custom-${customProviderName}`}>
                <div className={styles.providerGroup}>{customProviderName}</div> {/* Removed (Custom) */}
                {groupedCustomModels[customProviderName]
                  .sort((a, b) => a.name.localeCompare(b.name)) // Sort models within provider
                  .map(customModel => (
                    <div
                      key={customModel._id} // Use custom model ID as key
                      className={`${styles.modelItem} ${selectedModel === customModel._id ? styles.modelItemSelected : ''}`}
                      onClick={() => handleSelect(customModel._id)} // Pass custom model ID on select
                      role="option"
                      aria-selected={selectedModel === customModel._id}
                      // title attribute removed
                    >
                      {customModel.name} {/* Display custom model name */}
                      {/* Conditionally render vision icon for custom models */}
                      {customModel.baseModelSupportsVision && <span className={styles.visionIcon} title="Base model supports image input">👁️</span>}
                    </div>
                  ))}
              </Fragment>
            ))}

          {/* Divider if both custom and base models exist */}
          {availableModels.customModels.length > 0 && Object.keys(availableModels.baseModels).length > 0 && (
              <hr className={styles.divider} />
          )}

          {/* --- Render Base Models --- */}
          {Object.keys(availableModels.baseModels) // Get base provider names
            .sort() // Sort base provider names alphabetically
            .map(baseProvider => { // Iterate through sorted base provider names
              const baseModelsList = availableModels.baseModels[baseProvider]; // Get models for the current base provider
              return (
                <Fragment key={`base-${baseProvider}`}>
                  <div className={styles.providerGroup}>{baseProvider}</div>
                  {baseModelsList
                    .sort((a, b) => a.name.localeCompare(b.name)) // Sort models by name within provider
                    .map(baseModel => { // Iterate through model objects
                      // Determine display text
                      const displayText = baseProvider.toLowerCase() === 'perplexity'
                          ? baseModel.name.replace(/^perplexity\//, '')
                          : baseModel.name;
                      return (
                        <div
                          key={baseModel.name} // Use base model name as key
                          className={`${styles.modelItem} ${selectedModel === baseModel.name ? styles.modelItemSelected : ''}`}
                          onClick={() => handleSelect(baseModel.name)} // Pass base model name on select
                          role="option"
                          aria-selected={selectedModel === baseModel.name}
                        >
                          {displayText}
                          {/* Conditionally render vision icon */}
                          {baseModel.supportsVision && <span className={styles.visionIcon} title="Supports image input">👁️</span>}
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
