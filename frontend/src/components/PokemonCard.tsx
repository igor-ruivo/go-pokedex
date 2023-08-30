interface IPokemonCardProps {
  name: string,
  number: number,
  height: number,
  imgData: string[]
}

const PokemonCard = ({name, number, height, imgData} : IPokemonCardProps) => {
    return (
        <div className="pokemon-card">
          <img className="pokemon-image" src={`data:image/jpeg;base64,${imgData}`} alt={name}/>
          <h2 className="pokemon-name">{name}</h2>
          <p className="pokemon-number">#{number}</p>
          <p className="pokemon-height">Height: {height}</p>
        </div>
      );
}

export default PokemonCard;