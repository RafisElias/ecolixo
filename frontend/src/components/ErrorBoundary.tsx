import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Algo deu errado</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>
              {this.state.error?.message || "Erro inesperado"}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/map";
              }}
            >
              Voltar ao mapa
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
