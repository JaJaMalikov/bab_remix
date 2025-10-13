import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Contenu personnalisé à afficher lorsqu'une erreur est interceptée.
   * Par défaut, un message générique est rendu.
   */
  fallback?: ReactNode;
  /**
   * Message descriptif présenté dans le panneau d'erreur afin d'aider
   * l'utilisateur à comprendre ce qu'il s'est passé.
   */
  message?: string;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

/**
 * Limite d'erreur générique utilisée pour encapsuler les modules critiques de l'application.
 * Elle intercepte les exceptions d'exécution et fournit un retour utilisateur convivial
 * plutôt que de casser toute l'interface.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("Error boundary intercepted exception", error, info);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    const { hasError } = this.state;
    const { fallback, message, children } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      return fallback;
    }

    return (
      <div role="alert" className="error-boundary">
        <h2>Une erreur est survenue</h2>
        {message ? <p>{message}</p> : <p>Merci de recharger le module ou de réessayer.</p>}
        <button type="button" onClick={this.handleRetry}>
          Réessayer
        </button>
      </div>
    );
  }
}
