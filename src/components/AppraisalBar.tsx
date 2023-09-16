import { useState } from "react";
import "./AppraisalBar.css";

enum Stat {
    Attack,
    Defense,
    HP
}

const AppraisalBar = () => {
    const [attack, setAttack] = useState(0);
    const [defense, setDefense] = useState(0);
    const [hp, setHP] = useState(0);

    const handleCellClick = (stat: Stat, cellIndex: number) => {
        switch (stat) {
            case Stat.Attack:
                setAttack(cellIndex + 1);
                break;
            case Stat.Defense:
                setDefense(cellIndex + 1);
                break;
            case Stat.HP:
                setHP(cellIndex + 1);
                break;
        }
    };

    const renderStatBar = (stat: Stat, value: number) => {
        const cells = [];
        for (let i = 0; i < 16; i++) {
            const isActive = i < value;
            const isEnd = i === 15;
        
            const barClasses = ['bar', isActive && 'active', isEnd && 'end'].filter(Boolean).join(' ');
        
            cells.push(
                <div
                    key={i}
                    className={barClasses}
                    onClick={() => handleCellClick(stat, i)}
                    onMouseEnter={() => handleCellClick(stat, i)}
                ></div>
            );
        }

        return (
            <div className="stat">
                <h4>{stat}
                    <span>{value}</span>
                </h4>
                <div className="stat-bar max">{cells}</div>
            </div>
        );
    }

    return (
        <div className="appraisal">
            {renderStatBar(Stat.Attack, attack)}
            {renderStatBar(Stat.Defense, defense)}
            {renderStatBar(Stat.HP, hp)}
        </div>
    );
/*
    return (
        <div className="appraisal">
            <div className="stat">
                <h4>Attack
                    <span>13</span>
                </h4>
                <div className="stat-bar">
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover end"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                </div>
            </div>
            <div className="stat">
                <h4>Defense
                    <span>7</span>
                </h4>
                <div className="stat-bar">
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover end"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                </div>
            </div>
            <div className="stat">
                <h4>HP
                    <span>15</span>
                </h4>
                <div className="stat-bar max">
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover"></div>
                    <div className="bar active hover end"></div>
                </div>
            </div>
        </div>
    );*/
}