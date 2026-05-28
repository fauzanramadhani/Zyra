"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
const routes_1 = __importDefault(require("./routes"));
const websocket_service_1 = require("./services/websocket.service");
const import_worker_1 = require("./workers/import.worker");
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Security Headers with Helmet
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows assets like attachments to be loaded across origins
}));
// CORS configuration (allow requests from localhost/nginx reverse proxy)
app.use((0, cors_1.default)({
    origin: '*',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Static uploads serving
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
app.use('/uploads', express_1.default.static(uploadDir));
// API Routing Prefix
app.use('/api', routes_1.default);
// Health Check Endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date() });
});
// Centralized Error Handling
app.use(error_middleware_1.errorHandler);
// Setup WebSockets
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
(0, websocket_service_1.initSocketIO)(io);
// Start BullMQ Background Processing Workers
const importWorker = (0, import_worker_1.startImportWorker)();
console.log('BullMQ CSV Importer background worker initialized');
// Initialize issue ordering: assign sequential orders to existing issues that are unordered
async function initializeIssueOrdering() {
    try {
        const prisma = (await Promise.resolve().then(() => __importStar(require('./db')))).default;
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
            if (issues.length === 0)
                continue;
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
    }
    catch (err) {
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
