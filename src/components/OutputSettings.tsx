import React from 'react';
import { OutputSettingsProps } from '../types';
import CollapsibleSection from './CollapsibleSection';

const OutputSettings: React.FC<OutputSettingsProps> = ({
  fontSize,
  setFontSize,
  wordWrap,
  setWordWrap,
  maxTurns,
  setMaxTurns,
  maxOutputLength,
  setMaxOutputLength,
  isConversationRunning
}) => {
  const decreaseFontSize = () => {
    if (fontSize > 8) {
      setFontSize(fontSize - 2);
    }
  };

  const increaseFontSize = () => {
    if (fontSize < 32) {
      setFontSize(fontSize + 2);
    }
  };

  const toggleWordWrap = () => {
    setWordWrap(!wordWrap);
  };

  const handleMaxTurnsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxTurns(e.target.value);
  };

  const handleMaxOutputLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(e.target.value);
    // Ensure the value is within the valid range
    value = Math.max(1, Math.min(value, 1024));
    setMaxOutputLength(value.toString());
  };

  return (
    <CollapsibleSection id="output-settings" title="Output Settings">
      <div className="output-setting-group">
        <label htmlFor="font-size">Font Size:</label>
        <div className="font-size-controls">
          <button 
            id="decrease-font-size" 
            className="font-size-btn"
            onClick={decreaseFontSize}
          >
            -
          </button>
          <span id="current-font-size">{fontSize}px</span>
          <button 
            id="increase-font-size" 
            className="font-size-btn"
            onClick={increaseFontSize}
          >
            +
          </button>
        </div>
      </div>
      
      <div className="output-setting-group">
        <label htmlFor="word-wrap-toggle">Word Wrap:</label>
        <div 
          className="toggle-switch"
          onClick={(e) => {
            // Prevent double triggering when clicking directly on the checkbox
            if (e.target !== document.getElementById('word-wrap-toggle')) {
              toggleWordWrap();
            }
          }}
        >
          <input 
            type="checkbox" 
            id="word-wrap-toggle" 
            checked={wordWrap}
            onChange={toggleWordWrap}
          />
          <span className="toggle-slider"></span>
        </div>
      </div>
      
      <div className="output-setting-group">
        <label htmlFor="max-turns">Max Turns:</label>
        <input 
          type="number" 
          id="max-turns" 
          placeholder="Default: infinity" 
          min="1" 
          className="output-setting-input"
          value={maxTurns}
          onChange={handleMaxTurnsChange}
          disabled={isConversationRunning}
        />
      </div>
      
      <div className="output-setting-group">
        <label htmlFor="max-output-length">Max Output Length:</label>
        <input 
          type="number" 
          id="max-output-length" 
          placeholder="Default: 512" 
          min="1" 
          max="1024" 
          step="128" 
          className="output-setting-input"
          value={maxOutputLength}
          onChange={handleMaxOutputLengthChange}
          disabled={isConversationRunning}
        />
      </div>
    </CollapsibleSection>
  );
};

export default OutputSettings;