import { useState, useEffect, useRef } from 'react';
import chatGreeting from '../assets/chat-greeting.png';
import chatIcon from '../assets/chat-icon.png';
import chatError from '../assets/chat-error.png';

// API Configuration - Loaded from environment variables
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const API_ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-3-5-haiku-20241022"; // Fastest and cheapest Claude model
const MAX_TOKENS = 130; // Optimized for brief but complete responses


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
          system: "You are a helpful fitness advisor. The user has access to these exercises: Squat, Bicep Curl, Front Kick, Overhead Press, and Lateral Raise, available at beginner (15min), intermediate (30min), or advanced (45min) levels. They can also track weight and set goals. When giving advice, mention these exercises naturally if they fit the user's needs, and feel free to suggest other exercises too if the necassry exercises aren't in the app. Ask clarifying questions when helpful (like fitness level). Provide calorie targets when relevant. End responses with a friendly follow-up question like 'Need anything else?' or 'Want more details on any of these?'. Use a warm, conversational tone with suggestions rather than commands. Base advice on fitness science. Keep responses brief (2-5 sentences). Stay focused on fitness, nutrition, and wellness.",
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
      padding: '0px 20px 20px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '15px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          margin: '0 0 5px 0',
          color: '#2A7337'
        }}>
          Fitness Chat
        </h1>
        <p style={{
          color: '#666',
          fontSize: '0.95rem',
          margin: '0'
        }}>
          Ask me anything about fitness, nutrition, and weight loss!
        </p>
      </div>

      {/* Chat Display Area */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: '12px',
        padding: '15px',
        minHeight: '300px',
        maxHeight: '500px',
        overflowY: 'auto',
        marginBottom: '15px',
        border: '1px solid rgba(42, 115, 55, 0.2)'
      }}>
        {messages.length === 0 && !isLoading && (
          <div style={{
            textAlign: 'center',
            padding: '30px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px'
          }}>
            <img 
              src={chatGreeting} 
              alt="Chat Bot Greeting" 
              style={{
                maxWidth: '200px',
                width: '100%',
                height: 'auto'
              }}
            />
            <p style={{ 
              color: '#666',
              fontSize: '0.95rem',
              margin: 0
            }}>
              Hi! I'm your fitness assistant. Ask me anything about fitness, nutrition, and exercise!
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
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            {message.role === 'assistant' && (
              <img 
                src={chatIcon} 
                alt="Chat Bot" 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  flexShrink: 0
                }}
              />
            )}
            <div style={{
              backgroundColor: message.role === 'user' ? '#2A7337' : 'white',
              color: message.role === 'user' ? 'white' : '#1a1a1a',
              padding: '12px 16px',
              borderRadius: '18px',
              maxWidth: '70%',
              wordWrap: 'break-word',
              border: message.role === 'user' ? 'none' : '1px solid rgba(42, 115, 55, 0.3)',
              lineHeight: '1.5',
              textAlign: 'left'
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
            textAlign: 'center',
            padding: '20px',
            marginTop: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <img 
              src={chatError} 
              alt="Error" 
              style={{
                maxWidth: '150px',
                width: '100%',
                height: 'auto'
              }}
            />
            <div style={{
              color: '#c33',
              fontSize: '0.9rem',
              backgroundColor: '#fee',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '10px'
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
        marginTop: '15px',
        padding: '12px',
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

