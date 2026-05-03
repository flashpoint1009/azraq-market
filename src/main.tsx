import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { initSentry, SentryErrorBoundary } from './lib/sentry';
import './styles.css';

initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SentryErrorBoundary fallback={<div className="grid min-h-screen place-items-center bg-[#F4FAFF] p-6 text-center font-sans"><div><h1 className="text-2xl font-extrabold">حدث خطأ</h1><button onClick={() => window.location.reload()} className="mt-4 rounded-2xl bg-[#2b5b74] px-5 py-3 text-sm font-bold text-white">إعادة المحاولة</button></div></div>}>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <App />
            <Toaster position="top-center" toastOptions={{ duration: 3500, style: { direction: 'rtl', fontFamily: 'Cairo, sans-serif' } }} />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </SentryErrorBoundary>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('SERVICE_WORKER_REGISTER_ERROR', error);
    });
  });
}
