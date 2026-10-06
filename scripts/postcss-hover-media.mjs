/**
 * A PostCSS plugin: every rule that styles `:hover` is moved into `@media (hover: hover)`, so that it only applies on a device whose
 * main input can really hover (a mouse, a trackpad). On a touch screen there is no hover — a tap used to leave the last element
 * "hovered" (a stuck highlight, a lifted card) until the next tap elsewhere — so none of those rules apply there.
 *
 * A rule that has both kinds of selector is split (the ones without `:hover` stay where they are). `:not(:hover)` is not a hover
 * style (it describes how things look when they are not hovered, which is true on a touch screen too), and a rule that is already
 * inside `@media (hover: hover)` is left alone.
 */
const HOVER = /:hover\b/;
// `:not(...)` groups (one level of nested parentheses is enough for the selectors of this project)
const NOT_GROUP = /:not\((?:[^()]|\([^()]*\))*\)/g;

const isHoverSelector = (selector) => HOVER.test(selector.replace(NOT_GROUP, ''));

const insideHoverMedia = (node) => {
	for (let parent = node.parent; parent; parent = parent.parent) {
		if (parent.type === 'atrule' && parent.name === 'media' && /hover:\s*hover/.test(parent.params)) return true;
	}
	return false;
};

const insideKeyframes = (node) => {
	for (let parent = node.parent; parent; parent = parent.parent) {
		if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return true;
	}
	return false;
};

const hoverMedia = () => ({
	postcssPlugin: 'hover-media',
	Once(root, { AtRule }) {
		root.walkRules((rule) => {
			if (insideKeyframes(rule) || insideHoverMedia(rule)) return;
			const hover = rule.selectors.filter(isHoverSelector);
			if (hover.length === 0) return;
			const rest = rule.selectors.filter((selector) => !isHoverSelector(selector));
			const media = new AtRule({ name: 'media', params: '(hover: hover)' });
			const moved = rule.clone();
			moved.selectors = hover;
			media.append(moved);
			rule.parent.insertAfter(rule, media);
			if (rest.length > 0) rule.selectors = rest;
			else rule.remove();
		});
	},
});
hoverMedia.postcss = true;

export default hoverMedia;
