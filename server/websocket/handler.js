const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { interviewAgentReply } = require('../services/smythos');

// Store active connections
const connections = new Map();

function setupWebSocket(wss) {
  wss.on('connection', async (ws, req) => {
    console.log('New WebSocket connection');

    // Handle authentication
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        // Handle authentication message
        if (data.type === 'auth') {
          const { token, roomCode } = data;

          if (!token || !roomCode) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Token and room code required'
            }));
            return;
          }

          try {
            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user data
            const { data: user, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', decoded.userId)
              .single();

            if (userError || !user) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid token'
              }));
              return;
            }

            // Verify access to interview room
            const { data: interview, error: interviewError } = await supabase
              .from('interviews')
              .select(`
                id,
                candidate_id,
                start_at,
                end_at,
                status,
                job:jobs(hr_id)
              `)
              .eq('room_code', roomCode)
              .single();

            if (interviewError || !interview) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Interview not found'
              }));
              return;
            }

            // Check authorization
            const isCandidate = user.id === interview.candidate_id;
            const isHR = user.id === interview.job.hr_id;

            if (!isCandidate && !isHR) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Not authorized'
              }));
              return;
            }

            // Check if interview is active
            const now = new Date();
            const startTime = new Date(interview.start_at);
            const endTime = new Date(interview.end_at);
            
            if (now < startTime || now > endTime) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Interview is not currently active'
              }));
              return;
            }

            // Store connection
            ws.user = user;
            ws.interviewId = interview.id;
            ws.roomCode = roomCode;
            ws.userRole = isCandidate ? 'candidate' : 'hr';

            const connectionKey = `${roomCode}_${user.id}`;
            connections.set(connectionKey, ws);

            // Send success response
            ws.send(JSON.stringify({
              type: 'auth_success',
              user: {
                id: user.id,
                name: user.name,
                role: ws.userRole
              }
            }));

            // Send recent messages
            const { data: messages } = await supabase
              .from('interview_messages')
              .select('sender, content, created_at')
              .eq('interview_id', interview.id)
              .order('created_at', { ascending: true })
              .limit(50);

            if (messages && messages.length > 0) {
              ws.send(JSON.stringify({
                type: 'message_history',
                messages
              }));
            }

            console.log(`User ${user.name} joined interview room ${roomCode}`);
          } catch (authError) {
            console.error('WebSocket auth error:', authError);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Authentication failed'
            }));
          }
        }

        // Handle chat messages
        else if (data.type === 'message' && ws.user) {
          const { content } = data;

          if (!content || content.trim().length === 0) {
            return;
          }

          // Only candidates can send messages (HR observes)
          if (ws.userRole !== 'candidate') {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Only candidates can send messages'
            }));
            return;
          }

          // Store message in database
          const { data: message, error } = await supabase
            .from('interview_messages')
            .insert([{
              interview_id: ws.interviewId,
              sender: 'candidate',
              content: content.trim()
            }])
            .select('*')
            .single();

          if (error) {
            console.error('Failed to store message:', error);
            return;
          }

          // Broadcast candidate message to all users in room
          broadcastToRoom(ws.roomCode, {
            type: 'message',
            message: {
              id: message.id,
              sender: 'candidate',
              content: message.content,
              created_at: message.created_at
            }
          });

          // Get AI agent reply
          try {
            const agentReply = await interviewAgentReply({
              roomCode: ws.roomCode,
              history: [], // Could be enhanced to include recent message history
              message: content
            });

            // Store agent reply
            const { data: agentMessage, error: agentError } = await supabase
              .from('interview_messages')
              .insert([{
                interview_id: ws.interviewId,
                sender: 'agent',
                content: agentReply
              }])
              .select('*')
              .single();

            if (!agentError) {
              // Broadcast agent reply
              setTimeout(() => {
                broadcastToRoom(ws.roomCode, {
                  type: 'message',
                  message: {
                    id: agentMessage.id,
                    sender: 'agent',
                    content: agentMessage.content,
                    created_at: agentMessage.created_at
                  }
                });
              }, 1000); // Small delay to simulate typing
            }
          } catch (agentError) {
            console.error('Agent reply error:', agentError);
          }
        }

      } catch (parseError) {
        console.error('WebSocket message parse error:', parseError);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle connection close
    ws.on('close', () => {
      if (ws.user && ws.roomCode) {
        const connectionKey = `${ws.roomCode}_${ws.user.id}`;
        connections.delete(connectionKey);
        console.log(`User ${ws.user.name} left interview room ${ws.roomCode}`);
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
}

// Broadcast message to all users in a room
function broadcastToRoom(roomCode, message) {
  connections.forEach((ws, connectionKey) => {
    if (connectionKey.startsWith(roomCode) && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

module.exports = {
  setupWebSocket
};