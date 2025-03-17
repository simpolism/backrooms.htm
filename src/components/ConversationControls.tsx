import React, { useRef } from 'react';
import { ConversationControlsProps } from '../types';

const ConversationControls: React.FC<ConversationControlsProps> = ({
  isConversationRunning,
  isPaused,
  showExportButton,
  startConversation,
  stopConversation,
  pauseConversation,
  resumeConversation,
  exportConversation,
  loadConversation
}) => {
  // Create a hidden file input for loading conversations
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartStopClick = () => {
    if (isConversationRunning) {
      stopConversation();
    } else {
      startConversation();
    }
  };

  const handlePauseClick = () => {
    pauseConversation();
  };

  const handleResumeClick = () => {
    resumeConversation();
  };

  const handleExportClick = () => {
    exportConversation();
  };

  const handleLoadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    loadConversation(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="button-container">
      <button 
        id="start-conversation" 
        className={`primary-button ${isConversationRunning ? 'stop' : ''}`}
        onClick={handleStartStopClick}
      >
        {isConversationRunning ? 'Stop Conversation' : 'Start Conversation'}
      </button>
      
      {isConversationRunning && !isPaused && (
        <button 
          id="pause-conversation" 
          className="control-button pause"
          onClick={handlePauseClick}
        >
          Pause
        </button>
      )}
      
      {isConversationRunning && isPaused && (
        <button 
          id="resume-conversation" 
          className="control-button resume"
          onClick={handleResumeClick}
        >
          Resume
        </button>
      )}
      
      {showExportButton && (
        <button 
          id="export-conversation" 
          className="secondary-button"
          onClick={handleExportClick}
        >
          Export Conversation
        </button>
      )}
      
      <button 
        id="load-conversation" 
        className="control-button"
        onClick={handleLoadClick}
        disabled={isConversationRunning}
      >
        Select Conversation File
      </button>
      
      <input 
        ref={fileInputRef}
        type="file" 
        id="load-conversation-file" 
        accept=".txt"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ConversationControls;