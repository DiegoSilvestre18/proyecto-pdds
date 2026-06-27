import React from 'react';

/**
 * Límite de error reutilizable.
 *
 * Captura cualquier error de renderizado en su árbol de hijos y muestra una
 * UI de respaldo en lugar de tumbar toda la aplicación. Se usa tanto a nivel
 * global (envolviendo <App/>) como por panel (dentro de DraggableWindow), de
 * modo que un panel que crashea no afecta al resto de la interfaz.
 *
 * @param {React.ReactNode} children - árbol protegido
 * @param {string} [label]           - nombre del área para el mensaje de respaldo
 * @param {React.ReactNode} [fallback] - UI de respaldo personalizada (opcional)
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Registro para diagnóstico. No se propaga al usuario.
    console.error(`[ErrorBoundary${this.props.label ? ` · ${this.props.label}` : ''}]`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div
        role="alert"
        style={{
          padding: '20px',
          margin: '8px',
          borderRadius: '8px',
          background: 'rgba(127, 29, 29, 0.25)',
          border: '1px solid rgba(248, 113, 113, 0.4)',
          color: '#fecaca',
          textAlign: 'center',
          fontSize: '13px',
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
        <div style={{ fontWeight: 700, marginBottom: '4px' }}>
          {this.props.label ? `Error en ${this.props.label}` : 'Algo salió mal'}
        </div>
        <div style={{ color: '#fca5a5', fontSize: '11px', marginBottom: '12px' }}>
          Este componente falló pero el resto de la aplicación sigue activo.
        </div>
        <button
          type="button"
          onClick={this.handleRetry}
          style={{
            background: 'rgba(239, 68, 68, 0.3)',
            border: '1px solid rgba(248, 113, 113, 0.5)',
            color: '#fee2e2',
            borderRadius: '6px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
