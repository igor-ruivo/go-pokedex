import './CircularSliderInput.scss';
import CircularSlider from 'react-circular-slider-svg';
import { useLayoutEffect, useState } from 'react';

interface ICircularSliderInput {
    handleColor: string;
    value: number;
    setValue: React.Dispatch<React.SetStateAction<number>>;
}

const CircularSliderInput = ({handleColor, value, setValue}: ICircularSliderInput) => {
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
        const calc = (11 / 7) * Math.min(140 + 100 * (windowSize - 500) / (1920 - 500), (windowSize - 0) / 2 * 0.6);
        console.log(calc);
        return calc; //subtracting padding
    }

    return (
        <CircularSlider
            size={computeCurrentSize()}
            handle1={{
                value: levelToValue(value),
                onChange: v => setValue(valueToLevel(Math.round(v)))
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