import { Component, type ReactNode } from 'react';

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode; scope?: string }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('[ui-error]', this.props.scope ?? 'app', error.message);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="m-8 rounded-xl border border-rose-800 bg-rose-950/40 p-6 text-center">
        <h2 className="mb-2 text-lg font-bold text-rose-200">حدث خطأ غير متوقع في هذه الصفحة</h2>
        <p className="mb-4 text-sm text-rose-300/80">بياناتك في أمان. يمكنك إعادة المحاولة.</p>
        <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>إعادة المحاولة</button>
      </div>
    );
  }
}
