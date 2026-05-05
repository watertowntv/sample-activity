import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
    plugins: [
        react(),
        tailwindcss()
    ],
    server: {
        hmr: false,
        watch: {
            ignored: ['**/*']
        },
        allowedHosts: [
            'app.sansppap.org'
        ],
        proxy: {
            '/api': {
                target: 'http://localhost:3030',
                ws: true,
                changeOrigin: true
            }
        },
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
    },
    envDir: '../'
})
