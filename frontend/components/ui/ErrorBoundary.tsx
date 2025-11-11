'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorDisplay 
          error={this.state.error} 
          onRetry={this.handleRetry} 
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorDisplayProps {
  error?: Error;
  onRetry?: () => void;
  title?: string;
  message?: string;
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  title = "Something went wrong",
  message 
}: ErrorDisplayProps) {
  const displayMessage = message || error?.message || "An unexpected error occurred. Please try again.";

  return (
    <div className="card-premium p-8 text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-12 h-12 bg-error-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-error-600" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold text-lg text-neutral-900">{title}</h3>
        <p className="text-sm text-neutral-600 max-w-md mx-auto">
          {displayMessage}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}

      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-xs text-neutral-500 mb-2">
            Error Details (Dev Mode)
          </summary>
          <pre className="text-xs bg-neutral-100 p-3 rounded overflow-x-auto">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}

export function InlineError({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry?: () => void; 
}) {
  return (
    <div className="flex items-center gap-2 p-3 bg-error-50 border border-error-200 rounded-lg text-error-700">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm flex-1">{error}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-error-600 hover:text-error-700 p-1"
          aria-label="Retry"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}