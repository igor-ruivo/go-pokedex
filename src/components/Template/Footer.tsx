import { useEffect, useState } from "react";
import "./Footer.scss";

const Footer = () => {
    const [scrollingDown, setScrollingDown] = useState(false);
    const [prevScrollY, setPrevScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
        
            if (currentScrollY > prevScrollY) {
                setScrollingDown(true);
            } else {
                setScrollingDown(false);
            }
        
            setPrevScrollY(currentScrollY);
        };
    
        window.addEventListener('scroll', handleScroll);
    
        return () => window.removeEventListener('scroll', handleScroll);
    }, [prevScrollY, setScrollingDown, setPrevScrollY]);

    return <footer className={`footer ${scrollingDown && prevScrollY > 110 ? 'footer-hidden' : 'footer-visible'}`}></footer>;
}

export default Footer;