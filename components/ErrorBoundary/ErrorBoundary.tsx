"use client";
import React from 'react';

type Props = { onError?: (err: any) => void; children: React.ReactNode };

export default class ErrorBoundary extends React.Component<Props, { hasError: boolean }> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error('[ErrorBoundary] caught error', error, info);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 12, border: '1px solid orange', borderRadius: 6, background: '#fff7e6' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Une erreur est survenue dans l'éditeur</div>
          <div style={{ marginBottom: 8, color: '#444' }}>Veuillez réessayer ou fermer la fenêtre.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { this.setState({ hasError: false }); }}>Réessayer</button>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
