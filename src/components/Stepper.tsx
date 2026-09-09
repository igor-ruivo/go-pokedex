import { useEffect, useRef } from 'react';

interface StepperProps {
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (v: number) => void;
	format?: (v: number) => string;
}

/**
 * −/+ stepper with press-and-hold auto-repeat that accelerates after ~0.6s,
 * like a native numeric stepper. Supports fractional steps.
 */
export const Stepper = ({ value, min, max, step, onChange, format = String }: StepperProps) => {
	const vRef = useRef(value);
	vRef.current = value;
	const timers = useRef<Array<number>>([]);

	const clearTimers = () => {
		timers.current.forEach((id) => window.clearTimeout(id));
		timers.current = [];
	};
	useEffect(() => clearTimers, []);

	const snap = (v: number) => {
		const s = Math.round(v / step) * step;
		return Math.min(max, Math.max(min, Number(s.toFixed(2))));
	};
	const bump = (dir: 1 | -1) => onChange(snap(vRef.current + dir * step));

	const press = (dir: 1 | -1) => {
		clearTimers();
		bump(dir);
		let interval = 220;
		const tick = () => {
			if ((dir < 0 && vRef.current <= min) || (dir > 0 && vRef.current >= max)) return;
			bump(dir);
			interval = Math.max(40, interval * 0.8);
			timers.current.push(window.setTimeout(tick, interval));
		};
		timers.current.push(window.setTimeout(tick, 600));
	};

	const holdProps = (dir: 1 | -1) => ({
		onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
			e.preventDefault();
			e.currentTarget.setPointerCapture?.(e.pointerId);
			press(dir);
		},
		onPointerUp: clearTimers,
		onPointerCancel: clearTimers,
		onLostPointerCapture: clearTimers,
	});

	return (
		<div className='r-toggle r-stepper'>
			<button type='button' aria-label='Decrease' disabled={value <= min} {...holdProps(-1)}>
				−
			</button>
			<span>{format(value)}</span>
			<button type='button' aria-label='Increase' disabled={value >= max} {...holdProps(1)}>
				+
			</button>
		</div>
	);
};
