import React, { useState, useEffect } from 'react';
import Header from './Header';
import SettingsPanel from './SettingsPanel';
import ConversationContainer from './ConversationContainer';
import { ApiKeys, Message, ConversationOutputItem } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

const App: React.FC = () => {
  // State for API keys
  const [apiKeys, setApiKeys] = useLocalStorage<ApiKeys>('apiKeys', {
    hyperbolicApiKey: '',
    openrouterApiKey: ''
  });

  // State for conversation output
  const [conversationOutput, setConversationOutput] = useState<ConversationOutputItem[]>([]);

  // State for conversation running status
  const [isConversationRunning, setIsConversationRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // State for showing export button
  const [showExportButton, setShowExportButton] = useState(false);

  // State for font size and word wrap
  const [fontSize, setFontSize] = useLocalStorage<number>('outputFontSize', 14);
  const [wordWrap, setWordWrap] = useLocalStorage<boolean>('outputWordWrap', true);

  // State for max turns and max output length
  const [maxTurns, setMaxTurns] = useLocalStorage<string>('maxTurns', '');
  const [maxOutputLength, setMaxOutputLength] = useLocalStorage<string>('maxOutputLength', '512');

  // State for template and models
  const [selectedTemplate, setSelectedTemplate] = useLocalStorage<string>('templateSelection', '');
  const [selectedModels, setSelectedModels] = useLocalStorage<string[]>('modelSelections', []);

  return (
    <div className="container">
      <Header />
      
      <SettingsPanel
        apiKeys={apiKeys}
        setApiKeys={setApiKeys}
        fontSize={fontSize}
        setFontSize={setFontSize}
        wordWrap={wordWrap}
        setWordWrap={setWordWrap}
        maxTurns={maxTurns}
        setMaxTurns={setMaxTurns}
        maxOutputLength={maxOutputLength}
        setMaxOutputLength={setMaxOutputLength}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        selectedModels={selectedModels}
        setSelectedModels={setSelectedModels}
        isConversationRunning={isConversationRunning}
        setIsConversationRunning={setIsConversationRunning}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        showExportButton={showExportButton}
        setShowExportButton={setShowExportButton}
        conversationOutput={conversationOutput}
        setConversationOutput={setConversationOutput}
      />
      
      {/* Debug: Add a comment to verify this component is being included */}
      {/* ConversationContainer should render below */}
      <ConversationContainer
        conversationOutput={conversationOutput}
        fontSize={fontSize}
        wordWrap={wordWrap}
      />
      
      {/* Debug: Add a div to verify rendering is working */}
      <div style={{border: '1px solid red', padding: '10px', margin: '10px 0'}}>
        Debug: Conversation Output Count: {conversationOutput.length}
        {conversationOutput.length > 0 && (
          <div>Last message from: {conversationOutput[conversationOutput.length-1].actor}</div>
        )}
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#666666' }}>
        <hr />
        Last updated: March 2025 | <a href="https://github.com/simpolism/backrooms.directory" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
    </div>
  );
};

export default App;