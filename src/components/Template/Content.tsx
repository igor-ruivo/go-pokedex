import './Content.scss';

const Content = (props: React.PropsWithChildren) => {
	return <div className='main-content'>{props.children}</div>;
};

export default Content;
