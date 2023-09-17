import { useState } from "react";

interface IUseSwipeProps {
    swipeLeftCallback: () => void;
    swipeRightCallback: () => void;
    minSwipeDistance: number;
}

const useSwipe = ({swipeLeftCallback, swipeRightCallback, minSwipeDistance}: IUseSwipeProps) => {
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(0);
        setTouchStart(e.targetTouches[0].clientX);
    }

    const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) {
            return;
        }

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            swipeLeftCallback();
        }
        if (isRightSwipe) {
            swipeRightCallback();
        }
    }

    return [onTouchStart, onTouchMove, onTouchEnd];
}

export default useSwipe;