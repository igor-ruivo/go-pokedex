import React, { useMemo, useState } from "react";
import { ReactNode } from "react"

interface IListEntryProps {
    mainIcon: EntryImage;
    extraIcons?: EntryImage[];
    backgroundColorClassName: string;
    secondaryContent?: ReactNode[];
    toggledContent?: ReactNode[];
    onClick?: (event: any) => void;
    details?: EntryDetails[];
    slim?: boolean;
    soft?: boolean;
    slimmer?: boolean;
    specificBackgroundStyle?: string;
    defaultBackgroundStyle?: string;
    expandable?: boolean;
    expandedContent?: ReactNode;
    expanded?: boolean;
    setExpanded?: () => void,
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
    defaultBackgroundStyle,
    expandable,
    expanded,
    setExpanded,
    expandedContent
}: IListEntryProps) => {
    const [toggled, setToggled] = useState(false);
    const secondaryContentToBeRendered = useMemo(() => toggled ? toggledContent : secondaryContent, [toggled, toggledContent, secondaryContent]);

    return(
        <li>
            <div className="with-border">
                <div onClick={e => (expandable && setExpanded) ? setExpanded() : onClick ? onClick(e) : undefined} style={specificBackgroundStyle ? {background: specificBackgroundStyle} : undefined} className={`move-card-content relativeIndex ${expandable && expanded ? "with-border-bottom" : ""} ${slim ? "slim-content" : "sparse-content"} ${!specificBackgroundStyle ? backgroundColorClassName : ""} ${(expandable || onClick) ? "selectable" : ""}`}>
                    <div className="move-main-info">
                        <strong className={`move-detail ${mainIcon.withBackground ? "with-shadow": ""} ${soft && !extraIcons && backgroundColorClassName === defaultBackgroundStyle ? "soft" : ""} ${slim ? "slim-padding" : ""}`}>
                            {mainIcon.image}
                            {!!mainIcon.imageSideText && <span className="ellipsed">{mainIcon.imageSideText}</span>}
                        </strong>
                        {extraIcons?.map(i => <strong key={i.imageDescription} className={`move-detail ${i.withBackground ? "with-shadow": ""} ${soft && backgroundColorClassName === defaultBackgroundStyle ? "soft" : ""} ${slim ? "slim-padding" : ""}`}>
                            {i.image}
                            {!!i.imageSideText && i.imageSideText}
                        </strong>
                        )}
                    </div>
                    {(expandable || secondaryContentToBeRendered) && <strong onClick={expandable ? undefined : toggledContent ? () => {setToggled(prev => !prev)} : undefined} className={`move-detail with-shadow ${slimmer ? "move-stats-slimmer" : slim ? "move-stats-slim" : "move-stats"} ${soft && backgroundColorClassName === defaultBackgroundStyle ? "soft" : ""} ${(expandable || toggledContent) ? "clickable" : ""}`}>
                        {expandable && !expanded && <img key="chevron" className="invert-dark-mode" alt="All available Fast Moves" loading="lazy" width="18" height="18" decoding="async" src={`/vectors/chevron-down.svg`} />}
                        {expandable && expanded && <img key="chevron" className="invert-dark-mode" alt="All available Fast Moves" loading="lazy" width="18" height="18" decoding="async" src={`/vectors/chevron-up.svg`} />}
                        {!expandable && secondaryContentToBeRendered && secondaryContentToBeRendered.map(content => 
                            (React.isValidElement(content) && content.key && <span key={`${content.key}-span`} className="move-stats-content">
                                {content}
                            </span>)
                        )}
                    </strong>}
                </div>
                {expandable && expanded && React.isValidElement(expandedContent) && <div className="with-small-margin-top">{expandedContent}</div>}
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