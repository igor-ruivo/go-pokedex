import { useState, useEffect } from 'react';

// TypeScript interface for the countdown hook return value
interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// Custom hook for countdown
const useCountdown = (targetDate: number): CountdownTime => {
  const countDownDate = new Date(targetDate).getTime();

  // Initialize state with remaining time
  const [timeLeft, setTimeLeft] = useState<number>(countDownDate - new Date().valueOf());

  useEffect(() => {
    // Update the countdown every second
    const interval = setInterval(() => {
      const now = new Date().valueOf();
      const distance = countDownDate - now;

      setTimeLeft(distance);

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft(0);
      }
    }, 1000);

    // Cleanup the interval on component unmount
    return () => clearInterval(interval);
  }, [countDownDate, setTimeLeft]);

  // Calculate days, hours, minutes and seconds
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
};

export default useCountdown;