import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("FarmGuard App Error Catch:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0a0a0a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'sans-serif'
        }}>
          <div style={{
            backgroundColor: '#121212',
            border: '1px solid #ef4444',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '480px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(239, 68, 68, 0.2)'
          }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#ef4444', marginBottom: '12px' }}>
              System Exception Encountered
            </h1>
            <p style={{ color: '#8b949e', fontSize: '14px', marginBottom: '20px' }}>
              {this.state.error?.message || 'An unexpected runtime error occurred.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Reload Dashboard
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                style={{
                  backgroundColor: '#242424',
                  color: '#ffffff',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

