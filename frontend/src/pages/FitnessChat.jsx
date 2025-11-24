import { useState, useEffect, useRef } from 'react';

// API Configuration - Loaded from environment variables
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const API_ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-3-5-haiku-20241022"; // Fastest and cheapest Claude model
const MAX_TOKENS = 150; // Reduced for faster responses

/**
 * FitnessChat Component
 * A simple fitness chatbot that calls the Anthropic API directly from the browser
 */
function FitnessChat() {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([]); // Array of {role: 'user'|'assistant', content: string}
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const MAX_MESSAGES = 10; // Keep last 10 messages (5 exchanges)
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    // Validation
    if (!userInput.trim()) {
      setError('Please enter a message');
      return;
    }

    const currentInput = userInput;
    
    // Add user message to conversation
    const newUserMessage = { role: 'user', content: currentInput };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    
    // Clear input and error
    setUserInput('');
    setError('');
    setIsLoading(true);

    try {
      // Keep only last MAX_MESSAGES for API call to manage token usage
      const messagesToSend = updatedMessages.slice(-MAX_MESSAGES);
      
      // Make API call to Anthropic with conversation history
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: "You are a fitness assistant for AI Powered Coach. Keep responses very brief and actionable (2-3 sentences max). Only discuss fitness, nutrition, weight loss, and exercise. If asked about other topics, politely redirect. Always recommend consulting healthcare professionals for medical advice.",
          messages: messagesToSend
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || 
          `API Error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      
      // Parse response structure
      if (data.content && data.content[0] && data.content[0].text) {
        const botMessage = { role: 'assistant', content: data.content[0].text };
        setMessages(prev => [...prev, botMessage].slice(-MAX_MESSAGES));
      } else {
        throw new Error('Invalid response format from API');
      }

    } catch (err) {
      console.error('Chat error:', err);
      setError(
        err.message || 
        'Failed to get response. Please check your connection and try again.'
      );
      // Remove the user message if there was an error
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setUserInput('');
    setMessages([]);
    setError('');
  };

  // Check if API key is configured
  if (!API_KEY) {
    return (
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        <div style={{
          backgroundColor: '#fee',
          color: '#c33',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #fcc',
          textAlign: 'center'
        }}>
          <h2 style={{ marginBottom: '15px' }}>⚠️ API Key Not Configured</h2>
          <p style={{ marginBottom: '10px' }}>
            The Anthropic API key is missing. Please follow these steps:
          </p>
          <ol style={{ textAlign: 'left', display: 'inline-block', marginTop: '15px' }}>
            <li>Copy <code>.env.example</code> to <code>.env</code> in the frontend folder</li>
            <li>Add your Anthropic API key to the <code>.env</code> file</li>
            <li>Restart the development server</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '10px',
          color: '#2A7337'
        }}>
          Fitness Chat
        </h1>
        <p style={{
          color: '#666',
          fontSize: '0.95rem'
        }}>
          Ask me anything about fitness, nutrition, and weight loss!
        </p>
      </div>

      {/* Chat Display Area */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: '12px',
        padding: '20px',
        minHeight: '300px',
        maxHeight: '500px',
        overflowY: 'auto',
        marginBottom: '20px',
        border: '1px solid rgba(42, 115, 55, 0.2)'
      }}>
        {messages.length === 0 && !isLoading && (
          <div style={{
            textAlign: 'center',
            color: '#999',
            padding: '40px 20px',
            fontSize: '0.95rem'
          }}>
            <p style={{ marginBottom: '15px' }}>Start a conversation by typing your fitness question below.</p>
            <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
              Example: "What's a good workout routine for beginners?"
            </p>
          </div>
        )}

        {/* Display all messages in conversation */}
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              marginBottom: '15px',
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              backgroundColor: message.role === 'user' ? '#2A7337' : 'white',
              color: message.role === 'user' ? 'white' : '#1a1a1a',
              padding: '12px 16px',
              borderRadius: '18px',
              maxWidth: '70%',
              wordWrap: 'break-word',
              border: message.role === 'user' ? 'none' : '1px solid rgba(42, 115, 55, 0.3)',
              lineHeight: '1.5'
            }}>
              {message.content}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#666'
          }}>
            <div style={{
              display: 'inline-block',
              width: '20px',
              height: '20px',
              border: '3px solid #E7F9D0',
              borderTop: '3px solid #2A7337',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span>Getting response...</span>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={chatEndRef} />

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '12px 16px',
            borderRadius: '8px',
            marginTop: '10px',
            border: '1px solid #fcc'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '15px'
      }}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your fitness question..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '1rem',
            borderRadius: '8px',
            border: '1px solid #ccc',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#2A7337'}
          onBlur={(e) => e.target.style.borderColor = '#ccc'}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !userInput.trim()}
          style={{
            padding: '12px 24px',
            fontSize: '1rem',
            fontWeight: '600',
            backgroundColor: isLoading || !userInput.trim() ? '#ccc' : '#2A7337',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isLoading || !userInput.trim() ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!isLoading && userInput.trim()) {
              e.target.style.opacity = '0.9';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading && userInput.trim()) {
              e.target.style.opacity = '1';
            }
          }}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* New Chat Button */}
      {messages.length > 0 && !isLoading && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleNewChat}
            style={{
              padding: '10px 20px',
              fontSize: '0.9rem',
              backgroundColor: '#2A7337',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            New Chat
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#E7F9D0',
        border: '1px solid rgba(42, 115, 55, 0.3)',
        borderRadius: '8px',
        fontSize: '0.85rem',
        color: '#2A7337'
      }}>
        <strong>⚠️ Disclaimer:</strong> This AI assistant provides general fitness information only. 
        Always consult with healthcare professionals before starting any new exercise or nutrition program.
      </div>
    </div>
  );
}

export default FitnessChat;

