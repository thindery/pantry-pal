import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
    
    // Bind methods
    this.formatErrorForBot = this.formatErrorForBot.bind(this);
    this.handleCopy = this.handleCopy.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Send error to backend for logging
    this.reportError(error, errorInfo);
  }
  
  // Report error to backend for admin dashboard
  private reportError(error: Error, errorInfo: React.ErrorInfo) {
    try {
      const errorData = {
        type: error.name,
        message: error.message,
        stack: error.stack,
        component: errorInfo.componentStack?.split('\n')[1]?.trim(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };
      
      fetch('/api/client-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      }).catch(console.error); // Silent fail - don't crash error reporting
    } catch (err) {
      console.error('Failed to log error to backend:', err);
    }
  }

  // Format error for bot debugging
  private formatErrorForBot(): string {
    const { error, errorInfo } = this.state;
    const errorData = {
      type: error?.name,
      message: error?.message,
      component: errorInfo?.componentStack?.split('\n')[1]?.trim(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    return `
🐛 **Error Report**

**Type:** ${errorData.type}
**Message:** ${errorData.message}
**Component:** ${errorData.component}
**URL:** ${errorData.url}
**Time:** ${errorData.timestamp}
**User Agent:** ${errorData.userAgent}

**Stack Trace:**
\`\`\`
${errorInfo?.componentStack?.slice(0, 500)}
\`\`\`
    `.trim();
  }

  // Copy to clipboard
  private async handleCopy(): Promise<void> {
    const text = this.formatErrorForBot();
    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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
            
            {/* Button row with Copy and Reload */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={this.handleCopy}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                {this.state.copied ? '✅ Copied!' : '📋 Copy Error'}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
