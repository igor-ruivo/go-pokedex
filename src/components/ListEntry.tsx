import React from "react";
import { ReactNode } from "react"

interface IListEntryProps {
    mainIcon: EntryImage;
    extraIcons?: EntryImage[];
    backgroundColorClassName: string;
    secondaryContent: ReactNode[];
    onClick?: (event: any) => void;
    details?: EntryDetails[];
    slim: boolean;
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
    onClick,
    details,
    slim
}: IListEntryProps) => {
    return(
        <li>
            <div className={`move-card ${backgroundColorClassName} ${onClick ? "selectable" : ""}`} onClick={onClick}>
                <div className={`move-card-content ${slim ? "slim-content" : "sparse-content"}`}>
                    <div className="move-main-info">
                        <strong className={`move-detail ${mainIcon.withBackground ? "with-shadow": ""} ${slim ? "slim-padding" : ""}`}>
                            {mainIcon.image}
                            {!!mainIcon.imageSideText && mainIcon.imageSideText}
                        </strong>
                        {extraIcons?.map(i => <strong key={i.imageDescription} className={`move-detail ${i.withBackground ? "with-shadow": ""}  ${slim ? "slim-padding" : ""}`}>
                            {i.image}
                            {!!i.imageSideText && i.imageSideText}
                        </strong>
                        )}
                    </div>
                    <strong className={`move-detail with-shadow ${slim ? "move-stats-slim" : "move-stats"}`}>
                        {secondaryContent.map(content => 
                            (React.isValidElement(content) && content.key && <span key={`${content.key}-span`} className="move-stats-content">
                                {content}
                            </span>)
                        )}
                    </strong>
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