# AI Interview System Documentation

## Overview

The AI Interview System allows candidates to participate in automated text-based interviews where an AI agent asks questions and evaluates responses in real-time. This system integrates seamlessly with the existing job application workflow.

## Features

### For Candidates
- **Interactive Chat Interface**: Clean, modern chat interface with message bubbles
- **Real-time AI Responses**: AI agent responds contextually to candidate answers
- **Typing Indicators**: Visual feedback when AI is generating responses
- **Interview Progress**: Clear indication of interview status and progress
- **Message History**: All conversation history is preserved and displayed

### For HR Teams
- **Interview Monitoring**: HR can observe interviews in real-time (if enabled)
- **Response Recording**: All candidate responses are automatically saved
- **Interview Analytics**: Detailed logs and conversation history for review
- **Flexible Scheduling**: Interviews can be scheduled and managed through existing workflow

## Technical Architecture

### Frontend Components

#### Main Interview Component (`/client/src/pages/candidate/Interview.jsx`)
- Real-time WebSocket connection for instant messaging
- State management for interview progression
- Message handling and display
- AI typing indicators
- Interview start/stop controls

#### Demo Component (`/client/src/components/AIInterviewDemo.jsx`)
- Standalone demo for testing AI interview functionality
- Mock question progression
- Simulated AI responses
- No authentication required

### Backend Implementation

#### API Routes (`/server/routes/interviews.js`)
- `POST /:roomCode/start` - Initialize interview session
- `POST /:roomCode/ai-response` - Generate AI responses (fallback)
- `GET /:roomCode/messages` - Retrieve conversation history

#### WebSocket Handler (`/server/websocket/handler.js`)
- Real-time message broadcasting
- AI response generation
- Typing indicators
- Connection management
- Authentication and authorization

#### Database Schema
```sql
-- Interview messages table
CREATE TABLE interview_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    sender message_sender NOT NULL, -- 'candidate', 'agent', 'system'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## AI Response Generation

### Mock AI System
The system includes a sophisticated mock AI that generates contextual responses:

1. **Question Progression**: Questions advance based on conversation length
2. **Contextual Responses**: AI adapts based on candidate message content
3. **Interview Stages**:
   - Opening questions (introduction, background)
   - Experience-focused questions
   - Behavioral questions
   - Career and company questions
   - Closing questions

### Response Categories
- **Experience**: Technical skills, work history, projects
- **Behavioral**: Problem-solving, teamwork, leadership
- **Cultural Fit**: Values, motivation, career goals
- **Technical**: Role-specific technical questions

## Usage Instructions

### For Candidates

1. **Access Interview**
   - Navigate to scheduled interview from Interviews page
   - Click "Join Interview Now" when interview is active
   - Or click "Preview Interview Room" for upcoming interviews

2. **Start Interview**
   - Click "Start Interview" button when ready
   - AI will send welcome message and first question
   - Type responses in the message input field

3. **During Interview**
   - Read AI questions carefully
   - Provide thoughtful, detailed responses
   - Wait for AI typing indicator before expecting responses
   - Ask clarifying questions when needed

4. **Interview Completion**
   - AI will indicate when interview is complete
   - All responses are automatically saved
   - HR team will review responses and follow up

### For HR Teams

1. **Schedule Interviews**
   - Use existing interview scheduling system
   - Set appropriate time slots for AI interviews
   - Include any special instructions in invitation message

2. **Monitor Progress**
   - Access interview rooms to observe in real-time (optional)
   - Review completed interview transcripts
   - Evaluate candidate responses for next steps

## Configuration

### Environment Variables
```env
# WebSocket URL for real-time communication
VITE_WS_URL=ws://localhost:3001

# JWT secret for authentication
JWT_SECRET=your_jwt_secret_here

# Database connection
DATABASE_URL=your_supabase_url
```

### WebSocket Configuration
- Port: 3001 (configurable)
- Protocol: WebSocket (ws://)
- Authentication: JWT token-based
- Room-based messaging

## API Documentation

### Start Interview
```http
POST /interviews/:roomCode/start
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "message": "Interview started successfully",
  "welcomeMessage": {
    "id": "uuid",
    "sender": "agent",
    "content": "Welcome message text",
    "created_at": "timestamp"
  }
}
```

### WebSocket Messages

#### Authentication
```json
{
  "type": "auth",
  "token": "jwt_token",
  "roomCode": "room_code"
}
```

#### Send Message
```json
{
  "type": "message",
  "content": "candidate response"
}
```

#### Start Interview
```json
{
  "type": "start_interview"
}
```

## Demo Access

Visit `/demo/ai-interview` to try the AI interview system without authentication:
- Experience the full interview flow
- Test AI question generation
- See real-time typing indicators
- No data is saved in demo mode

## Security Considerations

1. **Authentication**: All interview access requires valid JWT tokens
2. **Authorization**: Only authorized candidates can access their interviews
3. **Data Privacy**: All interview data is encrypted and stored securely
4. **Room Access Control**: Room codes prevent unauthorized access
5. **Message Validation**: All messages are validated before processing

## Future Enhancements

1. **Advanced AI Integration**: Connect to GPT-4 or other advanced language models
2. **Voice Recognition**: Add speech-to-text for voice responses
3. **Video Interviews**: Combine with video calling capabilities
4. **AI Scoring**: Automatic evaluation and scoring of responses
5. **Multi-language Support**: Support interviews in multiple languages
6. **Custom Question Sets**: HR-configurable question templates
7. **Interview Analytics**: Advanced analytics and insights dashboard

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check VITE_WS_URL environment variable
   - Ensure WebSocket server is running on correct port
   - Verify firewall/proxy settings

2. **Messages Not Appearing**
   - Check browser console for errors
   - Verify JWT token is valid
   - Ensure room code is correct

3. **AI Not Responding**
   - Check server logs for errors
   - Verify Smythos service connection (if using external AI)
   - Fall back to mock AI responses

4. **Interview Won't Start**
   - Verify interview is within scheduled time
   - Check candidate authorization
   - Ensure interview status is correct

### Debugging

Enable detailed logging by setting:
```env
NODE_ENV=development
DEBUG=true
```

Check browser console and server logs for detailed error information.