import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePokemon } from "../../contexts/pokemon-context";
import SearchableDropdown from "../SearchableDropdown";
import "./Navbar.scss";
import { ConfigKeys, readSessionValue } from "../../utils/persistent-configs-handler";
import { ListType } from "../../views/pokedex";

const Navbar = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const navigate = useNavigate();
    const {pathname} = useLocation()

    type EntryType = {
        value: string,
        label: string
    }

    const getDestination = () => {
        let destinationPath = "";
        const previousRankType = readSessionValue(ConfigKeys.LastListType);
        if (previousRankType === null || pathname.includes("great") || pathname.includes("ultra") || pathname.includes("master")) {
            return "/";
        }

        switch (+previousRankType as ListType) {
            case ListType.GREAT_LEAGUE:
                destinationPath = "great";
                break;
            case ListType.ULTRA_LEAGUE:
                destinationPath = "ultra";
                break;
            case ListType.MASTER_LEAGUE:
                destinationPath = "master";
                break;
        }
        return `/${destinationPath}`;
    }

    return <nav className="navbar">
        <section className="navbar-section">
            <Link to={getDestination()} className="navbar-logo">
                <img className="navbar-logo-image" alt="GO-Pokedéx logo" loading="lazy" decoding="async" src="https://i.imgur.com/eBscnsv.png"/>  
            </Link>
            <button className="navbar-menu">
                <img className="navbar-menu-img" alt="Menu toggle" loading="lazy" width="24" height="20" decoding="async" src={"https://i.imgur.com/NEVZ0qK.png"}/>
                <span>Menu</span>
            </button>
            <div className="search-wrapper">
                <SearchableDropdown
                    options={!fetchCompleted ? [] : Object.values(gamemasterPokemon).filter(p => {
                        if (pathname.startsWith("/great") || pathname.startsWith("/ultra") || pathname.startsWith("/master") || pathname.startsWith("/pokemon")) {
                            return true;
                        }
                        return !p.isShadow;
                    }).map(p => ({value: p.speciesId, label: p.speciesName} as EntryType))}
                    isLoading={!fetchCompleted}
                    onSelection={(selectedEntry: EntryType) => pathname.startsWith("/pokemon") && navigate(`/pokemon/${selectedEntry.value}${pathname.substring(pathname.lastIndexOf("/"))}`)}
                />
            </div>
        </section>
    </nav>
}

export default Navbar;