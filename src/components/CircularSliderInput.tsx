import './CircularSliderInput.scss';
import CircularSlider from 'react-circular-slider-svg';
import { useEffect, useLayoutEffect, useState } from 'react';

interface ICircularSliderInput {
    handleColor: string;
    displayValue: number;
    setDisplayValue: React.Dispatch<React.SetStateAction<number>>;
    value: number;
    setValue: React.Dispatch<React.SetStateAction<number>>;
}

const CircularSliderInput = ({handleColor, displayValue, setDisplayValue, value, setValue}: ICircularSliderInput) => {
    const levelToValue = (level: number) => {
        return (level - 0.5) * 2;
    }

    const [debouncingValue, setDebouncingValue] = useState(value);

    useEffect(() => {
        setDisplayValue(debouncingValue);
        const timeoutId = setTimeout(() => {
            setValue(debouncingValue);
        }, 200);
        return () => clearTimeout(timeoutId);
    }, [debouncingValue]);

    useEffect(() => {
        if (displayValue > 40 && lap !== 1) {
            setLap(1);
        }
        if (displayValue <= 40 && lap !== 0) {
            setLap(0);
        }
    }, [displayValue]);

    const valueToLevel = (value: number) => {
        return value / 2 + 0.5;
    }

    const [windowSize, setWindowSize] = useState(320);
    const [lap, setLap] = useState(displayValue > 40 ? 1 : 0);

    useLayoutEffect(() => {
        const updateSize = () => {
            setWindowSize(window.innerWidth);
        }
        window.addEventListener('resize', updateSize);
        updateSize();
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const computeCurrentSize = () => {
        let calc = 0;
        if (windowSize < 1300) {
            calc = (11 / 7) * Math.min(140 + 100 * (windowSize - 500) / (1920 - 500), (windowSize - 0) / 2 * 0.6);
        } else {
            calc = (9 / 7) * Math.min(140 + 100 * (windowSize - 500) / (1920 - 500), (windowSize - 0) / 2 * 0.6);
        }
        return calc;
    }

    return (
        <CircularSlider
            size={computeCurrentSize()}
            handle1={{
                value: levelToValue(displayValue),
                onChange: v => {
                    const newValue = valueToLevel(v);
                    if (newValue <= 10 && displayValue >= 30 && lap === 0) {
                        setDisplayValue(40.5);
                        setDebouncingValue(40.5);
                        setLap(1);
                        return;
                    }
                    if (newValue >= 48 && displayValue <= 43 && lap === 1) {
                        setDisplayValue(40);
                        setDebouncingValue(40);
                        setLap(0);
                        return;
                    }
                    if (lap === 0) {
                        if (displayValue <= 10 && newValue >= 30) {
                            setDisplayValue(1);
                            setDebouncingValue(1);
                            return;
                        }
                        if (Math.abs(displayValue - newValue) <= 10) {
                            setDebouncingValue(newValue);
                            setDisplayValue(newValue);
                        }
                    } else {
                        if (displayValue >= 48 && newValue <= 43) {
                            setDisplayValue(51);
                            setDebouncingValue(51);
                            return;
                        }
                        if (Math.abs(displayValue - newValue) <= 3) {
                            setDebouncingValue(newValue);
                            setDisplayValue(newValue);
                        }
                    }
                }
            }}
            coerceToInt={true}
            minValue={displayValue <= 40 ? 1 : 80}
            maxValue={displayValue <= 40 ? 79 : 101}
            arcColor={handleColor}
            arcBackgroundColor='#eeeeee'
        />
  );
}

export default CircularSliderInput;