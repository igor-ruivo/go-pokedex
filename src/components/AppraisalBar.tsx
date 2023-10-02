import { useEffect, useState } from "react";
import "./AppraisalBar.scss";
import { Slider } from "@mui/material";

enum Stat {
    Attack,
    Defense,
    HP
}

interface IAppraisalBarProps {
    attack: number,
    setAttack: (_: React.SetStateAction<number>) => void,
    defense: number,
    setDefense: (_: React.SetStateAction<number>) => void,
    hp: number,
    setHP: (_: React.SetStateAction<number>) => void,
}

const AppraisalBar = ({attack, setAttack, defense, setDefense, hp, setHP}: IAppraisalBarProps) => {
    const [debouncingAttack, setDebouncingAttack] = useState(attack);
    const [debouncingDefense, setDebouncingDefense] = useState(defense);
    const [debouncingHP, setDebouncingHP] = useState(hp);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setAttack(Math.ceil(debouncingAttack));
        }, 200);
        return () => clearTimeout(timeoutId);
    }, [debouncingAttack]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDefense(Math.ceil(debouncingDefense));
        }, 200);
        return () => clearTimeout(timeoutId);
    }, [debouncingDefense]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setHP(Math.ceil(debouncingHP));
        }, 200);
        return () => clearTimeout(timeoutId);
    }, [debouncingHP]);

    const handleCellClick = (stat: Stat, cellIndex: number) => {
        switch (stat) {
            case Stat.Attack:
                setDebouncingAttack(cellIndex);
                break;
            case Stat.Defense:
                setDebouncingDefense(cellIndex);
                break;
            case Stat.HP:
                setDebouncingHP(cellIndex);
                break;
        }
    };
    const renderStatBar = (stat: Stat, value: number) => {
        const cells = [];
        for (let i = 0; i < 15; i++) {
            const isActive = i < value;
            const isEnd = i === value - 1 || i === 14;
        
            const cellClass = ['bar', isActive && 'active hover', isEnd && 'end'].filter(Boolean).join(' ');
        
            cells.push(
                <div
                    key={i}
                    className={cellClass}
                    onClick={() => handleCellClick(stat, i)}
                ></div>
            );
        }

        const statBarClass = value === 15 ? 'stat-bar max' : 'stat-bar';

        const setGenericStatValue = (stat: Stat, value: number) => {
            switch (stat) {
                case Stat.Attack:
                    setDebouncingAttack(value);
                    break;
                case Stat.Defense:
                    setDebouncingDefense(value);
                    break;
                case Stat.HP:
                    setDebouncingHP(value);
                    break;
            }
        }

        return (
            <div className="stat">
                <h4>{Stat[stat]}
                    <span>
                        {
                            <select value={value} onChange={e => setGenericStatValue(stat, +e.target.value)} className="select-level">
                                {Array.from({length: 16}, (_x, i) => i)
                                .map(e => (<option key={e} value={e}>{e}</option>))}
                            </select>
                        }
                    </span>
                </h4>
                <div className="appraisal-container">
                    <div className="appraisal-slider">
                        <Slider
                            size="small"
                            aria-label={Stat[stat] + "-slider"}
                            onChange={(_event, newValue) => handleCellClick(stat, newValue as number)}
                            min={0}
                            max={15}
                            step={0.01}
                            value={value}
                        />
                    </div>
                    <div className="appraisal-component">
                        <div className={statBarClass}>{cells}</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="appraisal">
            {renderStatBar(Stat.Attack, Math.ceil(debouncingAttack))}
            {renderStatBar(Stat.Defense, Math.ceil(debouncingDefense))}
            {renderStatBar(Stat.HP, Math.ceil(debouncingHP))}
        </div>
    );
};

export default AppraisalBar;