"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

interface PageErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface PageErrorBoundaryProps {
  children: React.ReactNode;
  pageName?: string;
}

class PageErrorBoundary extends React.Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  constructor(props: PageErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Page Error Boundary (${this.props.pageName || 'Unknown'}) caught error:`, error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-6">😔</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Page Error</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Something went wrong while loading this page. This might be a temporary issue.
            </p>
            <div className="space-y-3">
              <Button
                onClick={this.resetError}
                className="w-full bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white"
              >
                Try Again
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="w-full"
              >
                Go to Homepage
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="ghost"
                className="w-full text-sm"
              >
                Refresh Page
              </Button>
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

export default PageErrorBoundary;
