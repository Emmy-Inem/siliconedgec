import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorPage } from "./ErrorPage";
import { captureException } from "@/lib/sentry";

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);

    captureException(error, { componentStack: errorInfo.componentStack });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({
          error: this.state.error ?? new Error("Unknown error"),
          resetErrorBoundary: this.handleReset,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorPage
          error={this.state.error}
          resetErrorBoundary={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
