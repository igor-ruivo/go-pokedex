import { useEffect, useState } from "react";
import "./AppraisalBar.scss";

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
    const handleCellClick = (stat: Stat, cellIndex: number) => {
        switch (stat) {
            case Stat.Attack:
                setAttack(previousIndex => previousIndex === cellIndex + 1 ? 0 : cellIndex + 1);
                break;
            case Stat.Defense:
                setDefense(previousIndex => previousIndex === cellIndex + 1 ? 0 : cellIndex + 1);
                break;
            case Stat.HP:
                setHP(previousIndex => previousIndex === cellIndex + 1 ? 0 : cellIndex + 1);
                break;
        }
    };

    const handleMouseEnter = (stat: Stat, cellIndex: number) => {
        const statBarElement = document.getElementsByClassName("stat-bar")[stat];
        const cells = Array.from(statBarElement.children);

        if (cellIndex === 14) {
            cells[cellIndex].classList.add("end");
            if (!cells[cellIndex].classList.contains("active")) {
                statBarElement.classList.add("max-hover");
            }
        }

        if (cellIndex < 14) {
            statBarElement.classList.remove("max");
        }

        cells.forEach((cell, index) => {
            if (index === cellIndex) {
                cell.classList.add("end");
            }
            if (index <= cellIndex) {
                if (index < cellIndex) {
                    cell.classList.remove("end");
                }
                cell.classList.add("hover");
            } else {
                if (!cell.classList.contains("active")) {
                    cell.classList.remove("hover");
                    if (index !== 14) {
                        cell.classList.remove("end");
                    }
                } else {
                    if (cellIndex === 14) {
                        cell.classList.add("max-hover");
                    }
                }
                cell.classList.remove("active");
            }
        });
    }
    
    const handleMouseLeave = (stat: Stat) => {
        const statBarElement = document.getElementsByClassName("stat-bar")[stat];
        const cells = Array.from(statBarElement.children);

        let statValue = 0;
        switch (stat) {
            case Stat.Attack:
                statValue = attack;
                break;
            case Stat.Defense:
                statValue = defense;
                break;
            case Stat.HP:
                statValue = hp;
                break;
        }

        statBarElement.classList.remove("max-hover");

        if (statValue === 15) {
            statBarElement.classList.add("max");
        }

        cells.forEach((cell, index) => {
            cell.classList.remove("max-hover");

            const isActive = index < statValue;
            const isEnd = index === statValue - 1 || index === 14;

            cell.classList.toggle("active", isActive);
            cell.classList.toggle("hover", isActive);
            cell.classList.toggle("end", isEnd);
        });
    }

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
                    onMouseEnter={() => handleMouseEnter(stat, i)}
                    onMouseLeave={() => handleMouseLeave(stat)}
                ></div>
            );
        }

        const statBarClass = value === 15 ? 'stat-bar max' : 'stat-bar';

        return (
            <div className="stat">
                <h4>{Stat[stat]}
                    <span>{value}</span>
                </h4>
                <div className={statBarClass}>{cells}</div>
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
};

export default AppraisalBar;