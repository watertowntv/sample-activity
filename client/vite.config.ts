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
