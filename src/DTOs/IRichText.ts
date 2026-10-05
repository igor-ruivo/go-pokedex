/** A stretch of text with the same look: what a post writes in bold or italics, or as a link, keeps it. */
export interface IRichRun {
	text: string;
	bold?: true;
	italic?: true;
	/** Where a link goes (an absolute URL). */
	href?: string;
}

/**
 * One block of a post's formatted text, in its order: a paragraph (`text`), a bullet point (`item`, numbered when `ordered`, `level`
 * deep when nested), a footnote or asterisk remark (`note`) or a title (`heading`).
 */
export interface IRichBlock {
	kind: 'text' | 'item' | 'note' | 'heading';
	runs: Array<IRichRun>;
	level?: number;
	ordered?: true;
}
