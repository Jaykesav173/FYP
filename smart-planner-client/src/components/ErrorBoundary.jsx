import { Component } from 'react';
import { BrainCircuit } from 'lucide-react';

/**
 * Error Boundary — catches render errors in child components
 * and shows a recovery UI instead of a white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg, #F5EDE3)',
          padding: 20,
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: 420,
            background: 'var(--card, #FFFDF9)',
            border: '1px solid var(--border, #D4B896)',
            borderRadius: 18,
            padding: '48px 36px',
            boxShadow: '0 8px 32px rgba(107,58,31,0.1)',
          }}>
            {/* Icon */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: '#FEE2E2', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <BrainCircuit size={32} color="#C0483E" strokeWidth={1.8} />
            </div>

            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22, color: 'var(--text, #2C1A0E)',
              marginBottom: 8,
            }}>
              Something went wrong
            </h2>

            <p style={{
              fontSize: 13, color: 'var(--muted, #8B6F55)',
              lineHeight: 1.7, marginBottom: 24,
            }}>
              An unexpected error occurred. Don't worry — your data is safe.
              Try refreshing the page or going back to the dashboard.
            </p>

            {/* Error details (collapsible in dev) */}
            {this.state.error && (
              <details style={{
                textAlign: 'left', marginBottom: 24,
                background: '#FEF3C7', border: '1px solid #FDE68A',
                borderRadius: 8, padding: '10px 14px',
                fontSize: 11, color: '#92400E',
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 6 }}>
                  Error Details
                </summary>
                <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {this.state.error.toString()}
                </code>
              </details>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 22px', borderRadius: 8,
                  background: 'var(--primary, #6B3A1F)', color: 'white',
                  border: 'none', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ↻ Refresh Page
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '10px 22px', borderRadius: 8,
                  background: 'transparent', color: 'var(--text, #2C1A0E)',
                  border: '1px solid var(--border, #D4B896)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                ← Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
