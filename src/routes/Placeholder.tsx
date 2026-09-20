import { useTranslation } from 'react-i18next';

const Placeholder = ({ title }: { title: string }) => {
	const { t } = useTranslation(['common']);
	return (
		<div className='r-shell'>
			<div className='r-card' style={{ marginTop: 24, textAlign: 'center' }}>
				<h2 style={{ marginBottom: 8 }}>{title}</h2>
				<p className='r-muted'>{t('common:placeholder.comingSoon')}</p>
			</div>
		</div>
	);
};

export default Placeholder;
