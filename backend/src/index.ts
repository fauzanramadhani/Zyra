import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import router from './routes';
import { initSocketIO } from './services/websocket.service';
import { startImportWorker } from './workers/import.worker';
import { errorHandler } from './middleware/error.middleware';

const app = express();
const httpServer = createServer(app);

// Security Headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows assets like attachments to be loaded across origins
  })
);

// CORS configuration (allow requests from localhost/nginx reverse proxy)
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

// API Routing Prefix
app.use('/api', router);

// Health Check Endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Centralized Error Handling
app.use(errorHandler);

// Setup WebSockets
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
initSocketIO(io);

// Start BullMQ Background Processing Workers
const importWorker = startImportWorker();
console.log('BullMQ CSV Importer background worker initialized');

// Initialize issue ordering: assign sequential orders to existing issues that are unordered
async function initializeIssueOrdering() {
  try {
    const prisma = (await import('./db')).default;
    // Find all columns that have issues
    const columns = await prisma.boardColumn.findMany({
      select: { id: true },
    });

    for (const col of columns) {
      // Get issues in this column that all share the same default order (never reordered)
      const issues = await prisma.issue.findMany({
        where: { statusId: col.id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true, order: true },
      });

      if (issues.length === 0) continue;

      // Check if all issues have same order (need rebalancing) or already have unique orders
      const orders = issues.map((i) => i.order);
      const uniqueOrders = new Set(orders);
      const needsInit = uniqueOrders.size < issues.length;

      if (needsInit) {
        // Assign sequential spacing values 1000, 2000, 3000...
        for (let i = 0; i < issues.length; i++) {
          await prisma.issue.update({
            where: { id: issues[i].id },
            data: { order: (i + 1) * 1000.0 },
          });
        }
        console.log(`Initialized ordering for ${issues.length} issues in column ${col.id}`);
      }
    }
    console.log('Issue ordering initialization complete');
  } catch (err) {
    console.error('Failed to initialize issue ordering:', err);
  }
}

// Server startup
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, async () => {
  console.log(`Backend server successfully running on port ${PORT}`);
  await initializeIssueOrdering();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Shutting down gracefully...');
  await importWorker.close();
  httpServer.close(() => {
    console.log('HTTP Server closed.');
    process.exit(0);
  });
});
