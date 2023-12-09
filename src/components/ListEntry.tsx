import React from "react";
import { ReactNode } from "react"

interface IListEntryProps {
    imageDescription: string;
    imageUrl: string;
    backgroundColorClassName: string;
    mainText: string;
    secondaryContent: ReactNode[];
    details?: EntryDetails[];
}

interface EntryDetails {
    detailId: string;
    onClick: (event: any) => void;
    summary: ReactNode;
    content: ReactNode;
}

const ListEntry = ({
    imageDescription,
    imageUrl,
    backgroundColorClassName,
    mainText,
    secondaryContent,
    details
}: IListEntryProps) => {
    return(
        <li>
            <div className={`move-card ${backgroundColorClassName}`}>
                <div className="move-card-content">
                    <strong className="move-detail move-name">
                        <img title={imageDescription} alt={imageDescription} height="36" width="36" src={imageUrl}/>
                        {mainText}
                    </strong>
                    <strong className="move-detail move-stats">
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