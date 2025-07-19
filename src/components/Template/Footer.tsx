import { useEffect, useState } from "react";
import "./Footer.scss";
import { hideNavbar } from "./Navbar";
import { Link } from "react-router-dom";
import { useNotifications } from "../../contexts/notifications-context";

const Footer = () => {
    const [scrollingDown, setScrollingDown] = useState(false);
    const {unseenEvents} = useNotifications();
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
            <div className="relative-holder">
                <Link to="/trash-pokemon" className={`navbar-filter button no-padding`}>
                    <img className={"navbar-menu-img invert-dark-mode"} alt="Filter" loading="lazy" width="16.6" height="16.6" decoding="async" src={`/images/bin.png`}/>
                </Link>
            </div>
            <div className="relative-holder">
                {unseenEvents > 0 && <span className="notifications-counter">{unseenEvents}</span>}
                <Link to="/calendar/events" className={`navbar-filter button no-padding`}>
                    <img className={"navbar-menu-img invert-dark-mode"} alt="Filter" loading="lazy" width="16.6" height="16.6" decoding="async" src={`/images/calendar.png`}/>
                </Link>
            </div>
        </section>
    </footer>;
}

export default Footer;