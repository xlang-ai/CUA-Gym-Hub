
    import React from 'react';

    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
      }

      static getDerivedStateFromError(error) {
        return { hasError: true };
      }

      componentDidCatch(error, errorInfo) {
        this.setState({
          error: error,
          errorInfo: errorInfo
        });
        console.error("Uncaught error:", error, errorInfo);
      }

      render() {
        if (this.state.hasError) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-aws-disabled-bg p-4">
              <div className="bg-white p-8 rounded shadow-lg max-w-2xl w-full">
                <h1 className="text-2xl font-bold text-aws-error mb-4">Something went wrong</h1>
                <p className="text-aws-text-secondary mb-4">The application crashed. Here are the details:</p>
                <div className="bg-aws-disabled-bg p-4 rounded overflow-auto max-h-64 mb-4 border border-aws-border">
                  <pre className="text-sm text-aws-error whitespace-pre-wrap">
                    {this.state.error && this.state.error.toString()}
                  </pre>
                  <pre className="text-xs text-aws-text-secondary mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </div>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-aws-blue text-white rounded hover:bg-aws-blue-hover"
                >
                  Reload Page
                </button>
                <button 
                  onClick={() => {
                    localStorage.removeItem('aws_mock_state');
                    window.location.reload();
                  }} 
                  className="ml-4 px-4 py-2 bg-aws-disabled-bg text-aws-text rounded hover:bg-aws-border"
                >
                  Clear Data & Reload
                </button>
              </div>
            </div>
          );
        }

        return this.props.children;
      }
    }

    export default ErrorBoundary;
  