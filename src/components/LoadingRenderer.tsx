import "./LoadingRenderer.scss";

interface ILoadingRendererProps {
    errors: string,
    completed: boolean
}

const LoadingRenderer = (props: React.PropsWithChildren<ILoadingRendererProps>) => {
    return (
        <div className="loading_renderer">
            {!props.completed ?
                <div>Loading...</div> :
                props.errors ?
                    <div>{props.errors}</div> :
                    props.children
            }
        </div>
    );
}

export default LoadingRenderer;