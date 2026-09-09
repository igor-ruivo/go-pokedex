const Placeholder = ({ title }: { title: string }) => (
	<div className='r-shell'>
		<div className='r-card' style={{ marginTop: 24, textAlign: 'center' }}>
			<h2 style={{ marginBottom: 8 }}>{title}</h2>
			<p className='r-muted'>Coming next in the revamp.</p>
		</div>
	</div>
);

export default Placeholder;
