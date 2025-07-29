"use client";

import React from 'react';
import { logError } from '@/lib/server-utils';

interface ServerErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ServerErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ServerErrorBoundary extends React.Component<ServerErrorBoundaryProps, ServerErrorBoundaryState> {
  constructor(props: ServerErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ServerErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError('Server Error Boundary caught error:', { error, errorInfo });
    this.setState({ errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-6">🔧</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Temporarily Unavailable</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              We're experiencing some technical difficulties. Our team has been notified and is working to resolve this issue.
            </p>
            <div className="space-y-3">
              <button
                onClick={this.resetError}
                className="w-full bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Go to Homepage
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ServerErrorBoundary;
