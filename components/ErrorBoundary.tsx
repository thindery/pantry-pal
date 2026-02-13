import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <div className="text-4xl mb-4 text-center">🐛</div>
            <h1 className="text-xl font-bold text-slate-800 text-center mb-4">
              Something went wrong
            </h1>
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-4 overflow-auto">
              <p className="text-rose-700 font-mono text-sm break-words">
                {this.state.error?.name}: {this.state.error?.message}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-xs text-rose-600 mt-2 overflow-x-auto">
                  {this.state.errorInfo.componentStack.slice(0, 200)}...
                </pre>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
