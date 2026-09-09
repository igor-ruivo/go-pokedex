import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
	children: ReactNode;
}

interface ErrorBoundaryState {
	error: Error | undefined;
}

/**
 * Catches render-time crashes in the routed views so a single broken screen
 * doesn't blank the whole app. Class component because only class components
 * can be error boundaries.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	override state: ErrorBoundaryState = { error: undefined };

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error };
	}

	override componentDidCatch(error: Error, info: ErrorInfo): void {
		console.error('Unhandled error in a view:', error, info.componentStack);
	}

	private readonly handleReload = (): void => {
		window.location.reload();
	};

	override render(): ReactNode {
		if (!this.state.error) {
			return this.props.children;
		}

		return (
			<div className='item default-padding centered' role='alert'>
				<p>Something went wrong on this page.</p>
				<button type='button' className='contrast-border default-side-padding selectable' onClick={this.handleReload}>
					Reload
				</button>
			</div>
		);
	}
}

export default ErrorBoundary;
