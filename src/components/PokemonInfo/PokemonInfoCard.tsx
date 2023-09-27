import { Link } from "react-router-dom";
import { IGamemasterPokemon } from "../../DTOs/IGamemasterPokemon";
import "./PokemonInfoCard.scss"
import PokemonImage from "../PokemonImage";
import PokemonTypes from "../PokemonType/PokemonTypes";
import PokemonInfoImage from "./PokemonInfoImage";

interface IIvPercents {
  greatLeagueRank: number,
  greatLeagueLvl: number,
  greatLeagueCP: number,
  ultraLeagueRank: number,
  ultraLeagueLvl: number,
  ultraLeagueCP: number,
  masterLeagueRank: number,
  masterLeagueLvl: number,
  masterLeagueCP: number
}

interface IPokemonCardProps {
  pokemon: IGamemasterPokemon,
  ivPercents: IIvPercents
}

const PokemonInfoCard = ({pokemon, ivPercents}: IPokemonCardProps) => {
    return (
        <div className="pokemon_card">
          <div className="table-image">
            <PokemonInfoImage pokemon={pokemon} />
          </div>
          <b>{pokemon.speciesName}</b>
          <div className="header_footer">
            {ivPercents && <div className='rankings'>
              <center>
                <table className="ivs-table">
                  <tbody>
                    <tr>
                        <th></th>
                        <th>Rank</th>
                        <th>#</th>
                        <th>Lvl</th>
                        <th>CP</th>
                    </tr>
                    <tr>
                        <td><img height="16" width="16" src="https://www.stadiumgaming.gg/frontend/assets/img/great.png"/></td>
                        <td>{Math.round(((1 - (ivPercents.greatLeagueRank / 4095)) * 100 + Number.EPSILON) * 100) / 100}%</td>
                        <td>#{ivPercents.greatLeagueRank + 1}</td>
                        <td>{ivPercents.greatLeagueLvl}</td>
                        <td>{ivPercents.greatLeagueCP}</td>
                    </tr>
                    <tr>
                        <td><img height="16" width="16" src="https://www.stadiumgaming.gg/frontend/assets/img/ultra.png"/></td>
                        <td>{Math.round(((1 - (ivPercents.ultraLeagueRank / 4095)) * 100 + Number.EPSILON) * 100) / 100}%</td>
                        <td>#{ivPercents.ultraLeagueRank + 1}</td>
                        <td>{ivPercents.ultraLeagueLvl}</td>
                        <td>{ivPercents.ultraLeagueCP}</td>
                    </tr>
                    <tr>
                        <td><img height="16" width="16" src="https://www.stadiumgaming.gg/frontend/assets/img/master.png"/></td>
                        <td>{Math.round(((1 - (ivPercents.masterLeagueRank / 4095)) * 100 + Number.EPSILON) * 100) / 100}%</td>
                        <td>#{ivPercents.masterLeagueRank + 1}</td>
                        <td>{ivPercents.masterLeagueLvl}</td>
                        <td>{ivPercents.masterLeagueCP}</td>
                    </tr>
                  </tbody>
                </table>
              </center>
            </div>}
          </div>
        </div>
    );
}

export default PokemonInfoCard;