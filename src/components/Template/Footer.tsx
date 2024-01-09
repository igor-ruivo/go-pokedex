import { useEffect, useState } from "react";
import "./Footer.scss";
import { hideNavbar } from "./Navbar";

const Footer = () => {
    const [scrollingDown, setScrollingDown] = useState(false);
    //to detect direction change
    const [prevScrollY, setPrevScrollY] = useState(0);
    const [accumulatedScrollDownDelta, setAccumulatedScrollDownDelta] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
        
            if (currentScrollY > prevScrollY) {
                if (!scrollingDown) {
                    setAccumulatedScrollDownDelta(0);
                }
                setScrollingDown(true);
            } else {
                if (currentScrollY < prevScrollY) {
                    if (scrollingDown) {
                        setAccumulatedScrollDownDelta(0);
                    }
                    setScrollingDown(false);
                }
            }
        
            setAccumulatedScrollDownDelta(p => p + Math.abs(currentScrollY - prevScrollY));
            setPrevScrollY(currentScrollY);
        };
    
        window.addEventListener('scroll', handleScroll);
    
        return () => window.removeEventListener('scroll', handleScroll);
    }, [prevScrollY, scrollingDown, setAccumulatedScrollDownDelta, setScrollingDown, setPrevScrollY]);

    return <footer className={`footer ${hideNavbar(scrollingDown, accumulatedScrollDownDelta) ? 'footer-hidden' : 'footer-visible'}`}></footer>;
}

export default Footer;