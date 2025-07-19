import { useLayoutEffect, useState } from 'react';

type Dimensions = {
	x: number;
	y: number;
	orientation: string;
};

const useResize = () => {
	const [dimensions, setDimensions] = useState<Dimensions>({
		x: 0,
		y: 0,
		orientation: '',
	});

	useLayoutEffect(() => {
		const updateDimensions = () =>
			setDimensions({
				x: window.innerWidth,
				y: window.innerHeight,
				orientation: window.screen.orientation.type.toString(),
			});

		window.addEventListener('orientationchange', updateDimensions);
		window.addEventListener('resize', updateDimensions);

		updateDimensions();

		return () => {
			window.removeEventListener('orientationchange', updateDimensions);
			window.removeEventListener('resize', updateDimensions);
		};
	}, []);

	return dimensions;
};

export default useResize;
