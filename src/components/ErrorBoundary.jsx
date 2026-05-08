import { Component } from 'react';
import { reportError } from '../lib/logger';

/**
 * Catches render errors anywhere below it so one broken component shows a
 * recoverable message instead of blanking the whole app.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportError(error, { componentStack: info?.componentStack });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page-content" role="alert">
        <div className="page-inner">
          <div className="empty-state">
            Something went wrong while showing this page.{' '}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
