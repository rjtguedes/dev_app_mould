import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ [ErrorBoundary] Erro capturado:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 m-2">
          <h3 className="text-red-400 font-semibold mb-2">Erro no Componente</h3>
          <p className="text-red-300 text-sm mb-2">
            {this.state.error?.message || 'Ocorreu um erro inesperado'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
