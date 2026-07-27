import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        {
            name: 'discord-guard',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    const ua = req.headers['user-agent'] || '';
                    const isProxy = req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'];

                    if (isProxy && !ua.includes('Discord')) {
                        res.statusCode = 403;

                        return res.end('Forbidden');
                    }

                    next();
                });
            }
        }
    ],
    server: {
        hmr: false,
        watch: {
            ignored: ['**/*']
        },
        allowedHosts: true,
        proxy: {
            '/api': {
                target: process.env.VITE_API_URL || 'http://localhost:3030',
                ws: true,
                changeOrigin: true
            }
        }
    },
    envDir: '../'
})
