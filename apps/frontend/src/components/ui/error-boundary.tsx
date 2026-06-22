import { AlertTriangle } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * App-wide error boundary. Catches any render-time crash in the component tree and
 * shows a recoverable fallback instead of a blank white screen — critical insurance
 * for a live demo. Reloading or "Try again" resets the boundary.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught render error:', error, info.componentStack)
  }

  handleReset = () => this.setState({ hasError: false, error: null })

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle size={28} />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            The interface hit an unexpected error. Your data is safe — try again, or reload the
            page.
          </p>
        </div>
        {this.state.error?.message && (
          <pre className="max-w-md overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 text-left text-[11px] text-muted-foreground">
            {this.state.error.message}
          </pre>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
