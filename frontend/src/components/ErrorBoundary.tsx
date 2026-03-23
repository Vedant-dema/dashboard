import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null; info: ErrorInfo | null };

/**
 * Catches render errors so the tab is not a blank page — shows the real error (check DevTools Console too).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DEMA UI error:", error, info.componentStack);
    this.setState({ info });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-800">
          <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-6 shadow-lg">
            <h1 className="text-lg font-bold text-red-700">Anwendungsfehler</h1>
            <p className="mt-2 text-sm text-slate-600">
              React ist abgestürzt. Häufige Ursachen: fehlende Konstante/Import, oder Daten in{" "}
              <code className="rounded bg-slate-100 px-1">localStorage</code>. Öffnen Sie die
              Browser-Konsole (F12) für Details.
            </p>
            <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-red-200">
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </pre>
            {import.meta.env.DEV && this.state.info?.componentStack ? (
              <pre className="mt-2 max-h-32 overflow-auto text-[10px] text-slate-500">
                {this.state.info.componentStack}
              </pre>
            ) : null}
            <button
              type="button"
              className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              onClick={() => window.location.reload()}
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
