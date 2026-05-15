import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { App } from './App';
import { AppTheme } from './components/Brand';
import { ChatWidget } from './components/ChatWidget';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InternalMessaging } from './components/InternalMessaging';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { queryClient } from './lib/queryClient';
import { initSentry } from './lib/sentry';
import './styles.css';

initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <AppTheme />
              <App />
              <ChatWidget />
              <InternalMessaging />
              <Toaster position="top-center" toastOptions={{ duration: 3500, style: { direction: 'rtl', fontFamily: 'Cairo, sans-serif' } }} />
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('SERVICE_WORKER_REGISTER_ERROR', error);
    });
  });
}
