import React, { useState, useRef } from 'react';
import { ApiKeySectionProps } from '../types';
import CollapsibleSection from './CollapsibleSection';
import { initiateOAuthFlow, handleOAuthCallback, getAuthorizationCode } from '../oauth';

const ApiKeysSection: React.FC<ApiKeySectionProps> = ({ apiKeys, setApiKeys }) => {
  const [authMessage, setAuthMessage] = useState<{ message: string; isError: boolean } | null>(null);
  const authMessageTimeoutRef = useRef<number | null>(null);

  // Handle OpenRouter OAuth button click
  const handleOpenRouterOAuth = async () => {
    try {
      // Show loading message
      showAuthMessage('Initiating authentication with OpenRouter...', false);
      
      // Start the OAuth flow
      await initiateOAuthFlow();
      // The page will be redirected to OpenRouter, so no need to do anything else here
    } catch (error) {
      console.error('Error initiating OAuth flow:', error);
      showAuthMessage(`Error initiating OAuth flow: ${error instanceof Error ? error.message : String(error)}`, true);
    }
  };

  // Function to show temporary auth messages
  const showAuthMessage = (message: string, isError: boolean = false, duration: number = 5000) => {
    // Set message and styling
    setAuthMessage({ message, isError });
    
    // Clear any existing timeout
    if (authMessageTimeoutRef.current) {
      window.clearTimeout(authMessageTimeoutRef.current);
    }
    
    // Set timeout to hide the message
    authMessageTimeoutRef.current = window.setTimeout(() => {
      setAuthMessage(null);
    }, duration);
  };

  // Handle API key changes
  const handleApiKeyChange = (key: keyof typeof apiKeys, value: string) => {
    setApiKeys({ ...apiKeys, [key]: value });
  };

  // Check for OAuth callback on component mount
  React.useEffect(() => {
    // Check if this is a callback from OpenRouter OAuth
    if (window.location.search.includes('code=') || window.location.search.includes('error=')) {
      // Show initial processing message
      showAuthMessage('Processing authentication response...', false, 60000);
      
      // Check for error parameter in URL
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      if (errorParam) {
        // Handle explicit error from OAuth provider
        console.error('OAuth error:', errorParam, errorDescription);
        showAuthMessage(
          `Authentication denied: ${errorDescription || errorParam}`,
          true,
          10000
        );
        
        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      else if (getAuthorizationCode()) {
        // Handle the OAuth callback for successful code
        handleOAuthCallback(
          // Success callback
          (apiKey) => {
            // Save the API key
            handleApiKeyChange('openrouterApiKey', apiKey);
            
            // Show success message
            showAuthMessage('Successfully authenticated with OpenRouter!', false, 8000);
            
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
          },
          // Error callback
          (error) => {
            console.error('Error handling OAuth callback:', error);
            showAuthMessage(`Error authenticating with OpenRouter: ${error.message}`, true, 10000);
            
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        );
      }
    }
  }, []);

  return (
    <CollapsibleSection id="api-keys" title="API Keys" defaultCollapsed={true}>
      <p className="api-key-disclaimer">
        All API keys are stored locally in your browser, never shared with an external server.
      </p>
      
      <div className="input-group">
        <label htmlFor="openrouter-key">OpenRouter API Key:</label>
        <div className="oauth-button-container">
          <button 
            id="openrouter-oauth-button" 
            className="oauth-button"
            onClick={handleOpenRouterOAuth}
          >
            Login with OpenRouter
          </button>
        </div>
        <input 
          type="password" 
          id="openrouter-key" 
          placeholder="Enter OpenRouter API Key"
          value={apiKeys.openrouterApiKey}
          onChange={(e) => handleApiKeyChange('openrouterApiKey', e.target.value)}
        />
        <a 
          href="https://openrouter.ai/keys" 
          target="_blank" 
          rel="noopener noreferrer"
          className="api-key-link"
        >
          Get OpenRouter API Key
        </a>
      </div>
      
      <div className="input-group">
        <label htmlFor="hyperbolic-key">Hyperbolic API Key:</label>
        <input 
          type="password" 
          id="hyperbolic-key" 
          placeholder="Enter Hyperbolic API Key"
          value={apiKeys.hyperbolicApiKey}
          onChange={(e) => handleApiKeyChange('hyperbolicApiKey', e.target.value)}
        />
        <a 
          href="https://app.hyperbolic.xyz/settings" 
          target="_blank" 
          rel="noopener noreferrer"
          className="api-key-link"
        >
          Get Hyperbolic API Key
        </a>
      </div>
      
      {authMessage && (
        <div 
          className="auth-message-container"
          style={{
            display: 'block',
            marginTop: '15px',
            marginBottom: '10px',
            padding: '8px 10px',
            border: '1px solid #000000',
            fontSize: '14px',
            fontFamily: 'Times New Roman, serif',
            textAlign: 'center',
            backgroundColor: '#EEEEEE',
            color: authMessage.isError ? '#FF0000' : '#000000',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {authMessage.message}
        </div>
      )}
    </CollapsibleSection>
  );
};

export default ApiKeysSection;