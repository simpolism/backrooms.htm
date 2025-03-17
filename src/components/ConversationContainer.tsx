import React, { useEffect } from 'react';
import { ConversationContainerProps } from '../types';

const ConversationContainer: React.FC<ConversationContainerProps> = ({
  conversationOutput,
  fontSize,
  wordWrap
}) => {
  return (
    <div className="conversation-container">
      <div
        className="conversation-output"
        style={{
          fontSize: `${fontSize}px`,
          whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
          border: '1px solid #ccc', // Add border to make it visible
          minHeight: '100px', // Ensure it has height even when empty
          padding: '10px'
        }}
      >
        {conversationOutput.length === 0 ? (
          <div style={{color: '#888'}}>No conversation messages yet</div>
        ) : (
          conversationOutput.map((message) => (
            <div key={message.id} className="actor-response">
              <div
                className="actor-header"
                style={{ color: message.actor === 'System' ? 'inherit' : undefined }}
              >
                ### {message.actor} [{message.timestamp}] ###
              </div>
              <div className="response-content">
                {message.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationContainer;