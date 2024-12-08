import React, { useState } from 'react';
import { Send, Lock, User } from 'lucide-react';

const A2MAC1Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginStep, setLoginStep] = useState('username'); // 'username' or 'password'
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [verificationToken, setVerificationToken] = useState('');

  useEffect(() => {
    const getInitialPage = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/Identity/Account/Login', {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml',
          },
          credentials: 'include'
        });

        if (response.ok) {
          const html = await response.text();
          // Extract the verification token from the HTML
          const tokenMatch = html.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/);
          if (tokenMatch) {
            setVerificationToken(tokenMatch[1]);
          }
        }
      } catch (error) {
        console.error('Failed to get initial page:', error);
      }
    };

    getInitialPage();
  }, []);

  const getVerificationToken = async (url) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml',
        },
        credentials: 'include'
      });

      if (response.ok) {
        const html = await response.text();
        const tokenMatch = html.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/);
        return tokenMatch ? tokenMatch[1] : null;
      }
    } catch (error) {
      console.error('Failed to get verification token:', error);
    }
    return null;
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/Identity/Account/Login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml',
        },
        credentials: 'include',
        body: new URLSearchParams({
          'Input.Username': credentials.username,
          'Input.RememberLogin': 'true',
          '__RequestVerificationToken': verificationToken
        }).toString()
      });

      if (response.ok) {
        const html = await response.text();
        const promptMatch = html.match(/Prompt=([^&"]+)/);
        
        if (promptMatch) {
          const promptId = promptMatch[1];
          
          // Get new verification token for password page
          const passwordPageUrl = `http://localhost:3001/api/Identity/Account/LoginWithPassword?Prompt=${promptId}&ReturnUrl=/`;
          const newToken = await getVerificationToken(passwordPageUrl);
          
          setLoginStep('password');
          setSessionData({ promptId, verificationToken: newToken });
        } else {
          throw new Error('Failed to get login prompt');
        }
      } else {
        throw new Error('Username not recognized. Please try again.');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:3001/api/Identity/Account/LoginWithPassword?Prompt=${sessionData.promptId}&ReturnUrl=/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml',
        },
        credentials: 'include',
        body: new URLSearchParams({
          'Input.Password': credentials.password,
          '__RequestVerificationToken': sessionData.verificationToken
        }).toString()
      });

      if (response.ok) {
        setIsLoggedIn(true);
        setMessages(prev => [...prev, {
          text: 'Successfully logged in to A2MAC1!',
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString(),
        }]);
      } else {
        throw new Error('Invalid password. Please try again.');
      }
    } catch (error) {
      setError(error.message);
      setLoginStep('username');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginStep('username');
    setCredentials({
      username: '',
      password: ''
    });
    setSessionData(null);
    setMessages([]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !isLoggedIn) return;

    const newMessage = {
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, newMessage]);

    setLoading(true);
    try {
      // Make authenticated request to A2MAC1 API
      const response = await fetch('http://localhost:3001/api/data', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionData?.token}`,
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
      
      const data = await response.json();
      
      const botResponse = {
        text: data.message || 'Here is the data from A2MAC1...',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
        data: data
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      const errorMessage = {
        text: 'Failed to fetch data. Please try logging in again.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    
    setLoading(false);
    setInputMessage('');
  };

  // Username Form Component
  const UsernameForm = () => (
    <form onSubmit={handleUsernameSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Username</label>
        <input
          type="text"
          value={credentials.username}
          onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
          required
          className="mt-1 block w-full p-2 border rounded"
          placeholder="Enter your A2MAC1 username"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? 'Verifying...' : 'Continue'} <User className="w-4 h-4" />
      </button>
    </form>
  );

  // Password Form Component
  const PasswordForm = () => (
    <form onSubmit={handlePasswordSubmit} className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <span className="text-sm text-gray-500">{credentials.username}</span>
        </div>
        <input
          type="password"
          value={credentials.password}
          onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
          required
          className="mt-1 block w-full p-2 border rounded"
          placeholder="Enter your password"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setLoginStep('username')}
          className="flex-1 p-2 border rounded hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? 'Logging in...' : 'Login'} <Lock className="w-4 h-4" />
        </button>
      </div>
    </form>
  );

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow p-4">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {!isLoggedIn ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center mb-4">Login to A2MAC1</h2>
          {loginStep === 'username' ? <UsernameForm /> : <PasswordForm />}
        </div>
      ) : (
        <>
          {/* Chat messages */}
          <div className="h-96 overflow-y-auto mb-4 p-4 bg-gray-50 rounded">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  message.sender === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  } ${message.isError ? 'bg-red-100 text-red-500' : ''}`}
                >
                  <p>{message.text}</p>
                  {message.data && (
                    <pre className="mt-2 text-sm bg-gray-800 text-white p-2 rounded overflow-x-auto">
                      {JSON.stringify(message.data, null, 2)}
                    </pre>
                  )}
                  <span className="text-xs opacity-75 block mt-1">
                    {message.timestamp}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-center text-gray-500">
                <p>Loading...</p>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your request..."
              className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading}
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="mt-4 p-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2"
          >
            <Lock className="w-4 h-4" /> Logout
          </button>
        </>
      )}
    </div>
  );
};

export default A2MAC1Chat;