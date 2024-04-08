import React, { useState } from "react";
import { ReactNode } from "react"

interface IListEntryProps {
    mainIcon: EntryImage;
    extraIcons?: EntryImage[];
    backgroundColorClassName: string;
    secondaryContent: ReactNode[];
    toggledContent?: ReactNode[];
    onClick?: (event: any) => void;
    details?: EntryDetails[];
    slim?: boolean;
    soft?: boolean;
    slimmer?: boolean;
    specificBackgroundStyle?: string;
    defaultBackgroundStyle?: string;
}

interface EntryImage {
    imageDescription: string;
    image: ReactNode;
    imageSideText?: string;
    withBackground: boolean;
}

interface EntryDetails {
    detailId: string;
    onClick: (event: any) => void;
    summary: ReactNode;
    content: ReactNode;
}

const ListEntry = ({
    mainIcon,
    extraIcons,
    backgroundColorClassName,
    secondaryContent,
    toggledContent,
    onClick,
    details,
    slim,
    slimmer,
    soft,
    specificBackgroundStyle,
    defaultBackgroundStyle
}: IListEntryProps) => {
    const [toggled, setToggled] = useState(false);
    const secondaryContentToBeRendered = toggled ? toggledContent : secondaryContent;

    return(
        <li>
            <div className="with-border">
                <div style={specificBackgroundStyle ? {background: specificBackgroundStyle} : undefined} className={`move-card ${!specificBackgroundStyle ? backgroundColorClassName : ""} ${onClick ? "selectable" : ""}`} onClick={onClick}>
                    <div className={`move-card-content ${slim ? "slim-content" : "sparse-content"}`}>
                        <div className="move-main-info">
                            <strong className={`move-detail ${mainIcon.withBackground ? "with-shadow": ""} ${soft && !extraIcons && backgroundColorClassName === defaultBackgroundStyle ? "soft" : ""} ${slim ? "slim-padding" : ""}`}>
                                {mainIcon.image}
                                {!!mainIcon.imageSideText && mainIcon.imageSideText}
                            </strong>
                            {extraIcons?.map(i => <strong key={i.imageDescription} className={`move-detail ${i.withBackground ? "with-shadow": ""} ${soft && backgroundColorClassName === defaultBackgroundStyle ? "soft" : ""} ${slim ? "slim-padding" : ""}`}>
                                {i.image}
                                {!!i.imageSideText && i.imageSideText}
                            </strong>
                            )}
                        </div>
                        <strong onClick={toggledContent ? () => {setToggled(prev => !prev)} : undefined} className={`move-detail with-shadow ${slimmer ? "move-stats-slimmer" : slim ? "move-stats-slim" : "move-stats"} ${soft && backgroundColorClassName === defaultBackgroundStyle ? "soft" : ""} ${toggledContent ? "clickable" : ""}`}>
                            {secondaryContentToBeRendered?.map(content => 
                                (React.isValidElement(content) && content.key && <span key={`${content.key}-span`} className="move-stats-content">
                                    {content}
                                </span>)
                            )}
                        </strong>
                    </div>
                </div>
            </div>
            <div className="buffs-placeholder">
                {details?.map(detail => (
                    <details key={detail.detailId} id={detail.detailId} onClick={detail.onClick} className="buff-panel">
                        <summary>
                            {detail.summary}
                        </summary>
                        {detail.content}
                    </details>
                ))}
            </div>
        </li>
    );
}

export default ListEntry;