import App from './App.tsx';
import { DiscordProvider } from './internal/context/DiscordProvider.tsx';
import { ErrorBoundary } from "./internal/components/ErrorBoundary.tsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import './App.css';

const root = document.getElementById('root')!;

createRoot(root).render(
    <StrictMode>
        <ErrorBoundary>
            <DiscordProvider>
                <App />
            </DiscordProvider>
        </ErrorBoundary>
    </StrictMode>
);
