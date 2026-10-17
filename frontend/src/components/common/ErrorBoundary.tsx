import React, { Component, ErrorInfo, ReactNode } from 'react';
import { queueStore } from '../../services/store';
import { Icon } from './Icon';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export interface ErrorBoundary {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState;
  setState(updater: Partial<ErrorBoundaryState> | ((prevState: ErrorBoundaryState) => Partial<ErrorBoundaryState>)): void;
}

export class ErrorBoundary extends (React.Component as any) {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ALIGN ErrorBoundary] Caught render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleResetToDiscovery = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    queueStore.setScreen('SCREEN_02_DISCOVERY');
  };

  handleReload = (): void => {
    window.location.reload();
  };

  toggleDetails = (): void => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#f7f7f4]">
          <Card className="max-w-md w-full p-6 md:p-8 text-center shadow-lg">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-md flex items-center justify-center mx-auto mb-4 border border-red-200">
              <Icon icon="lucide:alert-circle" className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-normal font-display text-[#26251e] mb-2 tracking-tight">
              Something went wrong
            </h2>
            <p className="text-xs text-[#73726c] leading-relaxed mb-6">
              {this.props.fallbackMessage || 
                'An unexpected error occurred while rendering this view. You can return to location discovery or refresh the application.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Button
                onClick={this.handleResetToDiscovery}
                variant="default"
                size="sm"
                className="flex items-center justify-center gap-2"
              >
                <Icon icon="lucide:home" className="w-4 h-4" />
                <span>Return to Discovery</span>
              </Button>
              <Button
                onClick={this.handleReload}
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-2"
              >
                <Icon icon="lucide:rotate-ccw" className="w-4 h-4" />
                <span>Reload Application</span>
              </Button>
            </div>

            {/* Expandable Debug Details */}
            {this.state.error && (
              <div className="border-t border-[#e6e5e0] pt-4 text-left">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center justify-between w-full text-[11px] font-mono text-[#8c8b85] hover:text-[#26251e] transition-colors cursor-pointer"
                >
                  <span>Technical details</span>
                  <Icon 
                    icon={this.state.showDetails ? "lucide:chevron-up" : "lucide:chevron-down"} 
                    className="w-3.5 h-3.5" 
                  />
                </button>
                {this.state.showDetails && (
                  <pre className="mt-2 p-3 bg-[#fafaf7] rounded-md border border-[#e6e5e0] text-[10px] font-mono text-red-600 overflow-x-auto whitespace-pre-wrap max-h-40">
                    {this.state.error.name}: {this.state.error.message}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                )}
              </div>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
