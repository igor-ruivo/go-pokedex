import { useEffect, useState } from "react";
import "./AppraisalBar.scss";
import { Slider } from "@mui/material";
import translator, { TranslatorKeys } from "../utils/Translator";
import { useLanguage } from "../contexts/language-context";

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
    const {currentLanguage} = useLanguage();

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setAttack(Math.ceil(debouncingAttack));
        }, 200);
        return () => clearTimeout(timeoutId);
    }, [debouncingAttack, setAttack]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDefense(Math.ceil(debouncingDefense));
        }, 200);
        return () => clearTimeout(timeoutId);
    }, [debouncingDefense, setDefense]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setHP(Math.ceil(debouncingHP));
        }, 200);
        return () => clearTimeout(timeoutId);
    }, [debouncingHP, setHP]);

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

        const statToLang = (stat: Stat) => {
            switch(stat) {
                case Stat.Attack:
                    return translator(TranslatorKeys.Attack, currentLanguage);
                case Stat.Defense:
                    return translator(TranslatorKeys.Defense, currentLanguage);
                case Stat.HP:
                    return translator(TranslatorKeys.HP, currentLanguage);
            }
        }

        return (
            <div className="stat">
                <h4>
                    <div className="stat-current-value">
                        {statToLang(stat)}
                    </div>
                    <span>
                        {
                            value
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
        <div className="appraisal item">
            {renderStatBar(Stat.Attack, Math.ceil(debouncingAttack))}
            {renderStatBar(Stat.Defense, Math.ceil(debouncingDefense))}
            {renderStatBar(Stat.HP, Math.ceil(debouncingHP))}
        </div>
    );
};

export default AppraisalBar;