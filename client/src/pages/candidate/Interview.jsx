import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../utils/helpers';
import api from '../../utils/api';

const CandidateInterview = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [interview, setInterview] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Interview-specific state
  const [interviewInitialized, setInterviewInitialized] = useState(false);
  const [interviewStatus, setInterviewStatus] = useState('not_started');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [preventLeave, setPreventLeave] = useState(false);
  
  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  // Prevent page leave during active interview
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (preventLeave && !interviewCompleted) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your interview progress will be lost.';
        return e.returnValue;
      }
    };

    const handlePopState = (e) => {
      if (preventLeave && !interviewCompleted) {
        const confirmed = window.confirm('Are you sure you want to leave the interview? Your progress will be lost.');
        if (!confirmed) {
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    if (preventLeave) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      window.history.pushState(null, '', window.location.href);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [preventLeave, interviewCompleted]);

  useEffect(() => {
    fetchInterview();
  }, [roomCode]);

  useEffect(() => {
    if (interview && interview.is_active) {
      // Try to connect WebSocket but don't block on it
      connectWebSocket();
      checkInterviewStatus();
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

  const checkInterviewStatus = async () => {
    try {
      const response = await api.get(`/interviews/${roomCode}/status`);
      const { initialized, status, current_question, current_question_number } = response.data;
      
      if (initialized) {
        setInterviewInitialized(true);
        setInterviewStatus(status);
        setCurrentQuestion(current_question);
        setCurrentQuestionNumber(current_question_number);
        setPreventLeave(status !== 'interview_complete');
        
        if (status === 'interview_complete') {
          setInterviewCompleted(true);
        }
        
        // Add current question to messages
        if (current_question) {
          addMessage('agent', current_question);
        }
      }
    } catch (error) {
      console.error('Error checking interview status:', error);
    }
  };

  const initializeInterview = async () => {
    try {
      setIsWaitingForResponse(true);
      setError(null); // Clear any previous errors
      
      const response = await api.post(`/interviews/${roomCode}/initialize`);
      const { first_question, interview_status, current_question_number } = response.data;
      
      setInterviewInitialized(true);
      setInterviewStatus(interview_status);
      setCurrentQuestion(first_question);
      setCurrentQuestionNumber(current_question_number);
      setPreventLeave(true);
      
      // Add first question to messages
      addMessage('agent', first_question);
      
    } catch (error) {
      console.error('Error initializing interview:', error);
      const errorMessage = error.response?.data?.error || 'Failed to initialize interview. Please try again.';
      setError(errorMessage);
    } finally {
      setIsWaitingForResponse(false);
    }
  };

  const connectWebSocket = () => {
    // Only try WebSocket if environment variable is set
    const wsUrl = import.meta.env.VITE_WS_URL;
    if (!wsUrl) {
      console.log('WebSocket URL not configured, continuing without real-time features');
      return;
    }
    
    console.log('Attempting WebSocket connection to:', wsUrl);
    
    // Close existing connection if any
    if (ws.current) {
      ws.current.close();
    }

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setConnected(true);
        ws.current.send(JSON.stringify({
          type: 'auth',
          token,
          roomCode
        }));
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'auth_success':
              console.log('WebSocket authenticated successfully');
              break;
              
            case 'message_history':
              console.log('Received message history');
              break;
              
            case 'message':
              console.log('Received message:', data);
              break;
              
            case 'error':
              console.error('WebSocket error message:', data.message);
              break;
              
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (parseError) {
          console.error('Error parsing WebSocket message:', parseError);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnected(false);
      };

      ws.current.onerror = (error) => {
        console.warn('WebSocket connection failed - continuing without real-time features');
        setConnected(false);
        // Don't set error state, just log it
      };
    } catch (error) {
      console.warn('Failed to create WebSocket connection - continuing without real-time features');
      setConnected(false);
    }
  };

  const addMessage = (sender, content) => {
    const message = {
      sender,
      content,
      created_at: new Date().toISOString(),
      id: Date.now() + Math.random() // Ensure unique IDs
    };
    setMessages(prev => [...prev, message]);
  };

  const submitAnswer = async (e) => {
    e.preventDefault();
    
    if (!currentAnswer.trim() || sending || isWaitingForResponse) {
      return;
    }

    setSending(true);
    setIsWaitingForResponse(true);
    setError(null); // Clear any previous errors
    
    // Add candidate's answer to messages
    addMessage('candidate', currentAnswer.trim());
    const answerToSubmit = currentAnswer.trim();
    setCurrentAnswer('');

    try {
      const response = await api.post(`/interviews/${roomCode}/answer`, {
        answer: answerToSubmit
      });

      const { 
        next_question, 
        interview_status, 
        completed, 
        current_question_number,
        total_questions 
      } = response.data;

      setInterviewStatus(interview_status);

      if (completed || interview_status === 'interview_complete') {
        // Interview completed
        setInterviewCompleted(true);
        setPreventLeave(false);
        
        addMessage('agent', `Thank you for completing the interview! You answered ${total_questions || currentQuestionNumber} questions. You will be redirected to your dashboard shortly.`);
        
        // Redirect to dashboard after 5 seconds
        setTimeout(() => {
          navigate('/candidate');
        }, 5000);
        
      } else if (next_question) {
        // Continue with next question
        setCurrentQuestion(next_question);
        setCurrentQuestionNumber(current_question_number);
        addMessage('agent', next_question);
      }

    } catch (error) {
      console.error('Error submitting answer:', error);
      const errorMessage = error.response?.data?.error || 'Failed to submit answer. Please try again.';
      setError(errorMessage);
      // Re-add the answer to input if it failed
      setCurrentAnswer(answerToSubmit);
    } finally {
      setSending(false);
      setIsWaitingForResponse(false);
    }
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

  if (error && !interviewInitialized) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Interview Access Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchInterview();
            }}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!interview?.is_active) {
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
            <p>Scheduled: {formatDateTime(interview?.start_at)} - {formatDateTime(interview?.end_at)}</p>
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
            <h1 className="text-2xl font-bold text-gray-900">{interview.job?.title}</h1>
            <p className="text-gray-600">Interview with {interview.job?.hr?.name}</p>
            <p className="text-sm text-gray-500">
              {formatDateTime(interview.start_at)} - {formatDateTime(interview.end_at)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">Room Code</p>
            <p className="text-lg font-mono text-primary-600">{interview.room_code}</p>
            
            {interviewInitialized && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  Question {currentQuestionNumber} of {interview.number_of_questions}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(currentQuestionNumber / interview.number_of_questions) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2 mt-2">
              <div className={`w-3 h-3 rounded-full ${
                interviewCompleted ? 'bg-green-500' : 
                interviewInitialized ? 'bg-blue-500' : 
                'bg-yellow-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                {interviewCompleted ? 'Completed' : 
                 interviewInitialized ? 'In Progress' : 
                 'Ready to Start'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-4 mb-6 bg-red-50 border border-red-200">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Interview Interface */}
      <div className="card">
        {!interviewInitialized ? (
          /* Start Interview Screen */
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start Your Interview</h2>
            <p className="text-gray-600 mb-6">
              This interview will consist of {interview.number_of_questions} questions. 
              Once started, you cannot leave until completion.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-left">
                  <h4 className="font-medium text-yellow-800">Important Notes:</h4>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                    <li>• You cannot leave the page during the interview</li>
                    <li>• Answer each question thoughtfully and completely</li>
                    <li>• Your responses are being evaluated in real-time</li>
                    <li>• The interview will end automatically after all questions</li>
                  </ul>
                </div>
              </div>
            </div>
            <button
              onClick={initializeInterview}
              disabled={isWaitingForResponse}
              className="btn-primary text-lg px-8 py-3"
            >
              {isWaitingForResponse ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting Interview...
                </>
              ) : (
                'Start Interview'
              )}
            </button>
          </div>
        ) : (
          /* Interview Chat Interface */
          <>
            {/* Messages Area */}
            <div className="h-96 overflow-y-auto p-6 border-b border-gray-200">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-20">
                  <div className="animate-pulse">
                    <p>Loading your interview...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'candidate' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                          message.sender === 'candidate'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="text-xs opacity-75 mb-1 font-medium">
                          {message.sender === 'candidate' ? 'You' : 'AI Interviewer'}
                        </div>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Answer Input */}
            <div className="p-6">
              {!interviewCompleted ? (
                <form onSubmit={submitAnswer} className="space-y-4">
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder={isWaitingForResponse ? "Processing your previous answer..." : "Type your answer here..."}
                    disabled={sending || isWaitingForResponse}
                    rows={4}
                    className="w-full input-field resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        submitAnswer(e);
                      }
                    }}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      Press Ctrl+Enter to submit or use the button below
                    </p>
                    <button
                      type="submit"
                      disabled={!currentAnswer.trim() || sending || isWaitingForResponse}
                      className="btn-primary"
                    >
                      {sending ? 'Submitting...' : 
                       isWaitingForResponse ? 'Processing...' : 
                       'Submit Answer'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Interview Completed!</h3>
                  <p className="text-gray-600">You will be redirected to your dashboard shortly.</p>
                </div>
              )}
              
              {!interviewCompleted && (
                <p className="text-xs text-gray-500 mt-2">
                  ⚠️ Your interview responses are being recorded and evaluated.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CandidateInterview;