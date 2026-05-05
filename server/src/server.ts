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

app.use((req, res, next) => {
    const ua = req.headers['user-agent'] || '';
    const isProxy = req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'];
    if (isProxy && !ua.includes('Discord')) return res.status(403).send('Forbidden');
    next();
});

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

initSocketServer(httpServer);

const PORT = APP_CONSTANTS.SERVER_PORT;
httpServer.listen(PORT, () => {
    console.log(`[Pure WS] Server running on http://localhost:${PORT}`);
});

['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, async () => {
        console.log(`Server shutting down (${signal})...`);
        await flushAllConfigs();
        process.exit(0);
    });
});
