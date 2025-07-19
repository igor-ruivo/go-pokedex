import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import React, { isValidElement, useMemo, useState } from 'react';

import type { IDetailItem } from '../DTOs/IDetailItem';

interface IListEntryProps {
	mainIcon: EntryImage;
	extraIcons?: Array<EntryImage>;
	backgroundColorClassName: string;
	secondaryContent?: Array<ReactNode>;
	toggledContent?: Array<ReactNode>;
	onClick?: (
		event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>
	) => void;
	details?: Array<IDetailItem>;
	slim?: boolean;
	soft?: boolean;
	slimmer?: boolean;
	specificBackgroundStyle?: string;
	defaultBackgroundStyle?: string;
	expandable?: boolean;
	expandedContent?: ReactNode;
	expanded?: boolean;
	setExpanded?: () => void;
}

interface EntryImage {
	imageDescription: string;
	image: ReactNode;
	imageSideText?: string;
	withBackground: boolean;
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
	expandedContent,
}: IListEntryProps) => {
	const [toggled, setToggled] = useState(false);
	const secondaryContentToBeRendered = useMemo(
		() => (toggled ? (toggledContent ?? secondaryContent) : secondaryContent),
		[toggled, toggledContent, secondaryContent]
	);

	const handleMainClick = (
		e: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>
	) => {
		if (expandable && setExpanded) {
			setExpanded();
		} else if (onClick) {
			onClick(e);
		}
	};

	const handleMainKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key === 'Enter' || e.key === ' ') {
			handleMainClick(e);
		}
	};

	const handleStatsClick = () => {
		if (!expandable && toggledContent) {
			setToggled((prev) => !prev);
		}
	};

	const handleStatsKeyDown = (e: KeyboardEvent<HTMLElement>) => {
		if ((e.key === 'Enter' || e.key === ' ') && !expandable && toggledContent) {
			setToggled((prev) => !prev);
		}
	};

	return (
		<li>
			<div className='with-border'>
				<div
					role={expandable || onClick ? 'button' : undefined}
					tabIndex={expandable || onClick ? 0 : undefined}
					onClick={handleMainClick}
					onKeyDown={handleMainKeyDown}
					style={
						specificBackgroundStyle
							? { background: specificBackgroundStyle }
							: undefined
					}
					className={`move-card-content relativeIndex ${expandable && expanded ? 'with-border-bottom' : ''} ${slim ? 'slim-content' : 'sparse-content'} ${!specificBackgroundStyle ? backgroundColorClassName : ''} ${expandable || onClick ? 'selectable' : ''}`}
				>
					<div className='move-main-info'>
						<strong
							className={`move-detail ${mainIcon.withBackground ? 'with-shadow' : ''} ${soft && !extraIcons && backgroundColorClassName === defaultBackgroundStyle ? 'soft' : ''} ${slim ? 'slim-padding' : ''}`}
						>
							{mainIcon.image}
							{!!mainIcon.imageSideText && (
								<span className='ellipsed'>{mainIcon.imageSideText}</span>
							)}
						</strong>
						{extraIcons?.map((i) => (
							<strong
								key={i.imageDescription}
								className={`move-detail ${i.withBackground ? 'with-shadow' : ''} ${soft && backgroundColorClassName === defaultBackgroundStyle ? 'soft' : ''} ${slim ? 'slim-padding' : ''}`}
							>
								{i.image}
								{!!i.imageSideText && i.imageSideText}
							</strong>
						))}
					</div>
					{(!!expandable || !!secondaryContentToBeRendered) && (
						<strong
							role={expandable || toggledContent ? 'button' : undefined}
							tabIndex={expandable || toggledContent ? 0 : undefined}
							onClick={
								expandable
									? undefined
									: toggledContent
										? handleStatsClick
										: undefined
							}
							onKeyDown={
								expandable
									? undefined
									: toggledContent
										? handleStatsKeyDown
										: undefined
							}
							className={`move-detail with-shadow ${slimmer ? 'move-stats-slimmer' : slim ? 'move-stats-slim' : 'move-stats'} ${soft && backgroundColorClassName === defaultBackgroundStyle ? 'soft' : ''} ${expandable || toggledContent ? 'clickable' : ''}`}
						>
							{expandable && !expanded && (
								<img
									key='chevron'
									className='invert-dark-mode'
									alt='All available Fast Moves'
									loading='lazy'
									width='18'
									height='18'
									decoding='async'
									src={`/vectors/chevron-down.svg`}
								/>
							)}
							{expandable && expanded && (
								<img
									key='chevron'
									className='invert-dark-mode'
									alt='All available Fast Moves'
									loading='lazy'
									width='18'
									height='18'
									decoding='async'
									src={`/vectors/chevron-up.svg`}
								/>
							)}
							{!expandable &&
								secondaryContentToBeRendered?.map(
									(content) =>
										isValidElement(content) &&
										content.key && (
											<span
												key={`${content.key}-span`}
												className='move-stats-content'
											>
												{content}
											</span>
										)
								)}
						</strong>
					)}
				</div>
				{expandable && expanded && isValidElement(expandedContent) && (
					<div className='with-small-margin-top'>{expandedContent}</div>
				)}
			</div>
			<div className='buffs-placeholder'>
				{details?.map((detail) => (
					<div
						key={detail.detailId}
						role='button'
						tabIndex={0}
						onClick={detail.onClick}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								detail.onClick(e);
							}
						}}
					>
						<details id={detail.detailId} className='buff-panel'>
							<summary>{detail.summary}</summary>
							{detail.content}
						</details>
					</div>
				))}
			</div>
		</li>
	);
};

export default ListEntry;
