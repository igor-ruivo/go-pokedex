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
    const [debouncingValue, setDebouncingValue] = useState(value);

    useEffect(() => {
        setDisplayValue(debouncingValue);
        const timeoutId = setTimeout(() => {
            setValue(debouncingValue);
        }, 200);
        return () => clearTimeout(timeoutId);
    }, [debouncingValue]);

    const levelToValue = (level: number) => {
        return (level - 0.5) * 2;
    }

    const valueToLevel = (value: number) => {
        return value / 2 + 0.5;
    }

    const [windowSize, setWindowSize] = useState(320);

    useLayoutEffect(() => {
        const updateSize = () => {
            setWindowSize(window.innerWidth);
        }
        window.addEventListener('resize', updateSize);
        updateSize();
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const computeCurrentSize = () => {
        // should follow the same formula as the corresponding image
        // calc(140px + 100 * calc(100vw - 500px) / (1920 - 500));
        //const calc = Math.min(80 + 140 + 100 * (windowSize - 500) / (1920 - 500), ((windowSize - 0) / 2));
        const calc = Math.min(275, (11 / 7) * Math.min(140 + 100 * (windowSize - 500) / (1920 - 500), (windowSize - 0) / 2 * 0.6));
        console.log(calc);
        return calc; //subtracting padding
    }

    return (
        <CircularSlider
            size={computeCurrentSize()}
            handle1={{
                value: levelToValue(displayValue),
                onChange: v => setDebouncingValue(valueToLevel(Math.round(v)))
            }}
            minValue={1}
            maxValue={101}
            arcColor={handleColor}
            startAngle={40}
            endAngle={320}
        />
  );
}

export default CircularSliderInput;