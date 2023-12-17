import "./RaidCard.scss"

interface IRaidCardProps {
    type: string;
    rank: number;
}

const RaidCard = ({
    type,
    rank
}: IRaidCardProps) => {
    const raidUrl = `${process.env.PUBLIC_URL}/images/raid.webp`;
    const url = `${process.env.PUBLIC_URL}/images/types/${type}.png`;
    return <div className="raid-wrapper" style={{background: type ? `var(--type-${type})` : ``}}>
        {type && <img className="raid-img" src={url} width={48} height={48} alt={type} />}
        {!type && <img className="raid-img-with-contrast" src={raidUrl} alt={type} />}
        {rank !== 0 && <section>
            <div className="flex pvp-entry smooth with-shadow">
                <strong className="flex">
                    Ranked&nbsp;
                </strong>
                <strong className="cp-container with-brightness">
                    {rank}
                </strong>
            </div>
            <small className="card-footer">
                ... in {type} types
            </small>
        </section>}
    </div>;
}

export default RaidCard;