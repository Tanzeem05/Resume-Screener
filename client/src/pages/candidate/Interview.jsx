import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../utils/helpers';
import api from '../../utils/api';

const CandidateInterview = () => {
  const { roomCode } = useParams();
  const { token } = useAuth();
  const [interview, setInterview] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  
  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchInterview();
  }, [roomCode]);

  useEffect(() => {
    if (interview && interview.is_active) {
      connectWebSocket();
    }
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [interview, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchInterview = async () => {
    try {
      const response = await api.get(`/interviews/${roomCode}`);
      setInterview(response.data.interview);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load interview');
      console.error('Error fetching interview:', err);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      // Authenticate with the server
      ws.current.send(JSON.stringify({
        type: 'auth',
        token,
        roomCode
      }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'auth_success':
          setConnected(true);
          break;
          
        case 'message_history':
          setMessages(data.messages);
          break;
          
        case 'message':
          setMessages(prev => [...prev, data.message]);
          break;
          
        case 'error':
          setError(data.message);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error occurred');
    };
  };

  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !connected || sending) {
      return;
    }

    setSending(true);
    
    ws.current.send(JSON.stringify({
      type: 'message',
      content: newMessage.trim()
    }));

    setNewMessage('');
    setSending(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Interview Access Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!interview.is_active) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Interview Not Active</h1>
          <p className="text-gray-600 mb-4">
            This interview is not currently active. Please check the scheduled time.
          </p>
          <div className="text-sm text-gray-500">
            <p>Scheduled: {formatDateTime(interview.start_at)} - {formatDateTime(interview.end_at)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Interview Header */}
      <div className="card p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{interview.job.title}</h1>
            <p className="text-gray-600">Interview with {interview.job.hr.name}</p>
            <p className="text-sm text-gray-500">
              {formatDateTime(interview.start_at)} - {formatDateTime(interview.end_at)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">Room Code</p>
            <p className="text-lg font-mono text-primary-600">{interview.room_code}</p>
            <div className="flex items-center space-x-2 mt-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="card">
        {/* Messages Area */}
        <div className="h-96 overflow-y-auto p-6 border-b border-gray-200">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <p>Welcome to your interview!</p>
              <p className="text-sm">Send a message to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.sender === 'candidate' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === 'candidate'
                        ? 'bg-primary-600 text-white'
                        : message.sender === 'agent'
                        ? 'bg-gray-200 text-gray-900'
                        : 'bg-yellow-100 text-yellow-900'
                    }`}
                  >
                    <div className="text-xs opacity-75 mb-1">
                      {message.sender === 'candidate' ? 'You' : 
                       message.sender === 'agent' ? 'AI Interviewer' : 'System'}
                    </div>
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-6">
          <form onSubmit={sendMessage} className="flex space-x-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={connected ? "Type your message..." : "Connecting..."}
              disabled={!connected || sending}
              className="flex-1 input-field"
            />
            <button
              type="submit"
              disabled={!connected || !newMessage.trim() || sending}
              className="btn-primary"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            Your responses are being recorded and will be reviewed by the hiring team.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CandidateInterview;