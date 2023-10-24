import { useLanguage } from "../contexts/language-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import "./LoadingRenderer.scss";

interface ILoadingRendererProps {
    errors: string,
    completed: boolean
}

const LoadingRenderer = (props: React.PropsWithChildren<ILoadingRendererProps>) => {
    const {currentLanguage} = useLanguage();
    
    return (
        <div className="loading_renderer">
            {!props.completed ?
                <div>{translator(TranslatorKeys.Loading, currentLanguage)}</div> :
                props.errors ?
                    <div>{props.errors}</div> :
                    props.children
            }
        </div>
    );
}

export default LoadingRenderer;