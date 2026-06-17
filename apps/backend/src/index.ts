import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer } from 'ws';
import healthRoutes from './routes/health';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('New client connected');
  ws.on('message', (message) => {
    console.log(`Received: ${message}`);
  });
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`);
});
