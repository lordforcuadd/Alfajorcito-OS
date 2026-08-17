import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-lg mx-auto my-12 animate-fade-in">
          <Card variant="elevated" className="text-center space-y-4 p-6 border-rose-200 bg-white">
            <div className="w-12 h-12 rounded-2xl bg-[#FDF2F0] text-[#D98880] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#2B2D42]">
                {this.props.fallbackTitle || 'Hubo un detalle al cargar esta sección'}
              </h3>
              <p className="text-xs text-[#5A6275] mt-1 leading-relaxed">
                {this.state.error?.message || 'Ocurrió un error inesperado al renderizar.'}
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleReset}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Reintentar
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
