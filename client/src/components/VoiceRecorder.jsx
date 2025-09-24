import React, { useState, useRef, useEffect } from 'react';

const VoiceRecorder = ({ onTranscription, onError, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      // Initialize speech recognition
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      // Set up event handlers
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        console.log('Speech recognition started');
      };

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update the current transcript
        if (finalTranscript) {
          transcriptRef.current += finalTranscript;
          
          // Call the parent component with the transcription
          if (onTranscription) {
            onTranscription({
              text: transcriptRef.current.trim(),
              isFinal: true,
              confidence: event.results[event.results.length - 1][0].confidence || 0.9
            });
          }
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsRecording(false);
        
        if (onError) {
          onError(`Speech recognition error: ${event.error}`);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        console.log('Speech recognition ended');
      };
    } else {
      console.warn('Speech recognition not supported in this browser');
      setIsSupported(false);
    }

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscription, onError]);

  const startRecording = () => {
    if (!isSupported || disabled) return;
    
    try {
      transcriptRef.current = '';
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      if (onError) {
        onError('Failed to start recording');
      }
    }
  };

  const stopRecording = () => {
    if (!isSupported || !recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!isSupported) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="text-sm text-yellow-800">
          Speech recognition not supported in this browser. Please use Chrome or Edge.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <button
        onClick={toggleRecording}
        disabled={disabled}
        className={`
          relative inline-flex items-center justify-center w-12 h-12 rounded-full border-2 
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
          ${isRecording 
            ? 'bg-red-500 border-red-600 text-white focus:ring-red-500 hover:bg-red-600' 
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isRecording ? 'Stop recording' : 'Start voice recording'}
      >
        {isRecording ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
        
        {/* Recording indicator */}
        {isRecording && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full animate-pulse">
            <span className="sr-only">Recording</span>
          </span>
        )}
      </button>

      <div className="flex flex-col">
        <span className={`text-sm font-medium ${isRecording ? 'text-red-600' : 'text-gray-600'}`}>
          {isRecording ? 'Recording...' : 'Voice Input'}
        </span>
        {isListening && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Listening</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;