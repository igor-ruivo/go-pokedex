import './LoadingRenderer.scss';

import { useLanguage } from '../contexts/language-context';
import translator, { TranslatorKeys } from '../utils/Translator';

interface ILoadingRendererProps {
	errors: string;
	completed: boolean;
	noOverFlow?: boolean;
	children: () => React.ReactNode;
}

const LoadingRenderer = (props: ILoadingRendererProps) => {
	const { currentLanguage } = useLanguage();

	return (
		<div className={`loading_renderer ${props.noOverFlow ? 'no-overflow' : ''}`}>
			{!props.completed ? (
				<div>{translator(TranslatorKeys.Loading, currentLanguage)}</div>
			) : props.errors ? (
				<div>{props.errors}</div>
			) : (
				props.children()
			)}
		</div>
	);
};

export default LoadingRenderer;
