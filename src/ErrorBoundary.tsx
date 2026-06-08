import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = '予期しないエラーが発生しました。';
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.operationType && parsed.authInfo) {
            errorMessage = `Firestore ${parsed.operationType} エラー: ${parsed.error}`;
            isFirestoreError = true;
          }
        }
      } catch (e) {
        // Not a JSON error message, use default
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-bg-tech flex items-center justify-center p-6 font-mono">
          <div className="max-w-md w-full border-2 border-ink p-8 bg-white shadow-[12px_12px_0px_rgba(20,20,20,0.1)] space-y-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h2 className="font-bold uppercase tracking-tighter text-xl">システムエラー</h2>
            </div>
            
            <div className="space-y-2">
              <div className="text-[10px] opacity-40 uppercase tracking-widest">エラーログ</div>
              <p className="text-xs leading-relaxed text-ink bg-gray-50 p-4 border border-line break-words">
                {errorMessage}
              </p>
            </div>

            {isFirestoreError && (
              <p className="text-[10px] italic opacity-60">
                [ヒント] インターネット接続を確認するか、適切な権限でログインしているか確認してください。
              </p>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-ink text-bg-tech font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              アプリを再起動する
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
