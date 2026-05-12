import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    try {
      Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    } catch {
      // Sentry not initialized — ignore
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-pearl p-6" dir="rtl">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-soft">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-rose-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="mb-2 font-display text-xl font-extrabold text-slate-800">
              حصل خطأ غير متوقع
            </h2>
            <p className="mb-6 text-sm text-slate-500">
              عذرًا، حصلت مشكلة أثناء تحميل الصفحة. جرّب تاني.
            </p>
            <button
              onClick={this.handleRetry}
              className="w-full rounded-2xl bg-azraq-700 px-6 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-azraq-800"
            >
              حاول تاني
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
