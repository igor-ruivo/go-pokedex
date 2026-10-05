import { Fragment, type ReactNode } from 'react';

import type { IRichBlock, IRichRun } from '../DTOs/IRichText';

const Runs = ({ runs }: { runs: ReadonlyArray<IRichRun> }) => (
	<>
		{runs.map((run, i) => {
			// a line break inside a block is a run of its own
			const parts = run.text.split('\n').flatMap((part, at) => (at === 0 ? [part] : [<br key={`br${at}`} />, part]));
			let node: ReactNode = parts;
			if (run.bold) node = <strong>{node}</strong>;
			if (run.italic) node = <em>{node}</em>;
			if (run.href) {
				node = (
					<a href={run.href} target='_blank' rel='noopener noreferrer'>
						{node}
					</a>
				);
			}
			return <Fragment key={i}>{node}</Fragment>;
		})}
	</>
);

/**
 * A post's formatted text, as the dex-server parsed it: paragraphs, bullet points (nested ones indented), the asterisk footnotes,
 * bold, italics and links. Built from the blocks, never from markup, so nothing of the page's own HTML is ever injected.
 */
export const RichText = ({
	blocks,
	className,
	bullet,
	fallbackBullet,
}: {
	blocks: ReadonlyArray<IRichBlock>;
	className?: string | undefined;
	/** Drawn in front of every bullet point instead of the list's own marker (an icon): the same for all, or made for each block (with its place among the blocks); nothing for a block means it has none of its own. */
	/** Drawn for the points of a list that have none of their own, when others in that list do. */
	fallbackBullet?: ReactNode;
	bullet?: ReactNode | ((block: IRichBlock, index: number) => ReactNode);
}) => {
	const out: Array<ReactNode> = [];
	let i = 0;
	while (i < blocks.length) {
		const block = blocks[i];
		if (block.kind === 'item') {
			// the items that follow each other make one list
			const start = i;
			const ordered = !!block.ordered;
			while (i < blocks.length && blocks[i].kind === 'item' && !!blocks[i].ordered === ordered) i++;
			const items = blocks.slice(start, i);
			const List = ordered ? 'ol' : 'ul';
			// a list where no point has anything to draw is a plain list; where some do, the others get the default one
			const marks = items.map((item, k) => (typeof bullet === 'function' ? bullet(item, start + k) : bullet));
			const drawn = marks.some(Boolean);
			out.push(
				<List key={start} className={drawn ? 'r-rich-list r-rich-list--icon' : 'r-rich-list'}>
					{items.map((item, k) => (
						<li key={k} data-level={item.level ?? 0}>
							{marks[k] ?? (drawn ? fallbackBullet : null)}
							<span>
								<Runs runs={item.runs} />
							</span>
						</li>
					))}
				</List>
			);
			continue;
		}
		out.push(
			block.kind === 'heading' ? (
				<h4 key={i} className='r-rich-heading'>
					<Runs runs={block.runs} />
				</h4>
			) : (
				<p key={i} className={block.kind === 'note' ? 'r-rich-note' : 'r-rich-text'}>
					<Runs runs={block.runs} />
				</p>
			)
		);
		i++;
	}
	return <div className={className ? `r-rich ${className}` : 'r-rich'}>{out}</div>;
};
