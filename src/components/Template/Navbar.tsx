import { useLocation, useNavigate } from "react-router-dom";
import { usePokemon } from "../../contexts/pokemon-context";
import { Theme, useTheme } from "../../contexts/theme-context";
import SearchableDropdown from "../SearchableDropdown";
import "./Navbar.scss";

const Navbar = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {theme} = useTheme();
    const navigate = useNavigate();
    const location = useLocation()

    type EntryType = {
        value: string,
        label: string
    }

    return <nav className="navbar">
        <section className="navbar-section">
            <a className="navbar-logo" href="/">
                <img className="navbar-logo-image" alt="GO-Pokedéx logo" loading="lazy" decoding="async" data-nimg="fill" src={theme === Theme.Light ? "https://i.imgur.com/4ULFMLR.png" : "https://i.imgur.com/1PR6U3Q.png"}/>  
            </a>
            <button className="navbar-menu">
                <img className="navbar-menu-img" data-invertondarkmode="true" alt="Menu toggle" loading="lazy" width="24" height="20" decoding="async" data-nimg="1" src={theme === Theme.Light ? "https://i.imgur.com/QeLejTs.png" : "https://i.imgur.com/NEVZ0qK.png"}/>
                <span>Menu</span>
            </button>
            <div className="search-wrapper">
                <SearchableDropdown
                    options={gamemasterPokemon?.filter(p => !p.isShadow).map(p => ({value: p.speciesId, label: p.speciesName} as EntryType)) ?? []}
                    isLoading={!fetchCompleted}
                    onSelection={(selectedEntry: EntryType) => navigate(`/pokemon/${selectedEntry.value.replace("_shadow", "")}`)}
                />
            </div>
        </section>
    </nav>
}

export default Navbar;