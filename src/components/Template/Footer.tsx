import { useEffect, useState } from "react";
import "./Footer.scss";
import { hideNavbar } from "./Navbar";
import { Link } from "react-router-dom";

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

    return <footer className={`footer ${hideNavbar(scrollingDown, accumulatedScrollDownDelta, false) ? 'footer-hidden' : 'footer-visible'}`}>
        <section className="footer-section">
            <Link to="/trash-pokemon" className={`navbar-filter button no-padding`}>
                <img className={"navbar-menu-img invert-dark-mode"} alt="Filter" loading="lazy" width="24" height="24" decoding="async" src={`${process.env.PUBLIC_URL}/images/search.png`}/>
            </Link>
            <Link to="/calendar" className={`navbar-filter button no-padding`}>
                <img className={"navbar-menu-img invert-dark-mode"} alt="Filter" loading="lazy" width="24" height="24" decoding="async" src={`${process.env.PUBLIC_URL}/images/calendar.png`}/>
            </Link>
            </section>
    </footer>;
}

export default Footer;