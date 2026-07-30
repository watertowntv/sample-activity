import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSocketServer } from './internal/core/socketManager.js';
import { flushAllConfigs } from './internal/core/config.js';
import helmet from "helmet";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const httpServer = createServer(app);

app.set('trust proxy', 1);

app.use(express.json());
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "frame-ancestors": ["'self'", "https://discord.com", "https://*.discord.com", "https://*.discordsays.com"],
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

import { APP_CONSTANTS } from '@activity/shared';

const wss = initSocketServer(httpServer);

const PORT = process.env.PORT ? Number(process.env.PORT) : APP_CONSTANTS.SERVER_PORT;
httpServer.listen(PORT, () => {
    console.log(`[Pure WS] Server running on http://localhost:${PORT}`);
});

['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, async () => {
        console.log(`Server shutting down (${signal})...`);
        wss.close();
        await flushAllConfigs();
        process.exit(0);
    });
});
