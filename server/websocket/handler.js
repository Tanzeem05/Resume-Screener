const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Store connected clients by room
const rooms = new Map();

const handleWebSocketConnection = (ws, req) => {
  let user = null;
  let roomCode = null;
  let interview = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'auth':
          try {
            // Verify JWT token
            const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
            user = decoded;

            // Verify interview access
            const { data: interviewData, error } = await supabase
              .from('interviews')
              .select(`
                id,
                candidate_id,
                status,
                job:jobs(hr_id)
              `)
              .eq('room_code', data.roomCode)
              .single();

            if (error || !interviewData) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Interview not found'
              }));
              return;
            }

            // Check authorization
            const isCandidate = user.id === interviewData.candidate_id;
            const isHR = user.id === interviewData.job.hr_id;

            if (!isCandidate && !isHR) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Not authorized to access this interview'
              }));
              return;
            }

            roomCode = data.roomCode;
            interview = interviewData;

            // Add client to room
            if (!rooms.has(roomCode)) {
              rooms.set(roomCode, new Set());
            }
            rooms.get(roomCode).add(ws);

            ws.send(JSON.stringify({
              type: 'auth_success',
              user_role: isCandidate ? 'candidate' : 'hr'
            }));

            // Send message history
            const { data: messages } = await supabase
              .from('interview_messages')
              .select('id, sender, content, created_at')
              .eq('interview_id', interview.id)
              .order('created_at', { ascending: true })
              .limit(50);

            ws.send(JSON.stringify({
              type: 'message_history',
              messages: messages || []
            }));

          } catch (authError) {
            console.error('Auth error:', authError);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Authentication failed'
            }));
          }
          break;

        case 'message':
          if (!user || !roomCode || !interview) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Not authenticated'
            }));
            return;
          }

          // Store message in database
          const { error: insertError } = await supabase
            .from('interview_messages')
            .insert({
              interview_id: interview.id,
              sender: user.role,
              content: data.content
            });

          if (insertError) {
            console.error('Insert message error:', insertError);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to send message'
            }));
            return;
          }

          // Broadcast message to all clients in the room
          const messageData = {
            type: 'message',
            message: {
              sender: user.role,
              content: data.content,
              created_at: new Date().toISOString()
            }
          };

          broadcastToRoom(roomCode, messageData);
          break;

        case 'interview_question':
          // Handle AI interviewer questions
          if (data.question) {
            const questionData = {
              type: 'message',
              message: {
                sender: 'agent',
                content: data.question,
                created_at: new Date().toISOString()
              }
            };
            broadcastToRoom(roomCode, questionData);
          }
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    // Remove client from room
    if (roomCode && rooms.has(roomCode)) {
      rooms.get(roomCode).delete(ws);
      if (rooms.get(roomCode).size === 0) {
        rooms.delete(roomCode);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
};

const broadcastToRoom = (roomCode, data) => {
  if (rooms.has(roomCode)) {
    const clients = rooms.get(roomCode);
    const message = JSON.stringify(data);
    
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
};

const setupWebSocket = (wss) => {
  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established');
    handleWebSocketConnection(ws, req);
  });

  console.log('WebSocket server setup completed');
};

module.exports = { 
  handleWebSocketConnection, 
  setupWebSocket,
  broadcastToRoom 
};