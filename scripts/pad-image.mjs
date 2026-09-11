// Pads a source image onto a larger transparent square canvas, centered,
// so link-preview crawlers (WhatsApp, Discord, Slack, …) don't render the
// bare icon flush against the frame edges. Most of our og:image sources are
// small flat sprites/icons (a type badge, a raid tier icon, a Pokémon
// sprite) never designed to fill a preview card on their own — without this
// they read as awkwardly cropped/off-center. League icons and the site logo
// are excluded by the caller: those were already designed with their own
// margin baked in.
import sharp from 'sharp';

const CANVAS = 600;
const CONTENT_RATIO = 0.65; // the icon occupies ~65% of the frame, ~17.5% margin each side
const MAX_UPSCALE = 2; // don't blow up tiny source icons past a mild, still-crisp upscale

/** Some icons bake their own solid background color into the artwork itself
 *  (the spawns icon's dark rounded square, unlike the type badges etc.,
 *  which just sit on real transparency) — padding that in `padImage` only
 *  frames it, it doesn't change it. This clears every opaque pixel within
 *  `threshold` Euclidean RGB distance of `from` (by default, to fully
 *  transparent — pass an opaque `to` color instead for a solid backdrop),
 *  leaving actual transparent pixels and any other foreground color (the
 *  icon's own artwork) untouched. Meant for a solid, evenly-colored
 *  background — not a general chroma-key tool. */
export const recolorBackground = async (source, { from, to = null, threshold = 70 } = {}) => {
	const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const { width, height, channels } = info;
	for (let i = 0; i < data.length; i += channels) {
		if (data[i + 3] === 0) continue; // leave real transparency alone
		const dr = data[i] - from.r;
		const dg = data[i + 1] - from.g;
		const db = data[i + 2] - from.b;
		if (Math.sqrt(dr * dr + dg * dg + db * db) <= threshold) {
			if (to) {
				data[i] = to.r;
				data[i + 1] = to.g;
				data[i + 2] = to.b;
			} else {
				data[i + 3] = 0; // make it real transparency, not just a color
			}
		}
	}
	return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
};

/** `source` is anything sharp() accepts (a file path or a Buffer). Returns a
 *  PNG Buffer: a CANVASxCANVAS square with `source` centered on top of
 *  `background` (defaults to fully transparent — pass an opaque color, e.g.
 *  `{ r: 255, g: 255, b: 255, alpha: 1 }`, for a source that isn't meant to
 *  blend into the crawler's own card background). */

export const padImage = async (source, { background = { r: 0, g: 0, b: 0, alpha: 0 } } = {}) => {
	const src = sharp(source);
	const { width, height } = await src.metadata();
	if (!width || !height) throw new Error('padImage: source has no intrinsic dimensions');

	const nativeMax = Math.max(width, height);
	const targetMax = Math.min(CANVAS * CONTENT_RATIO, nativeMax * MAX_UPSCALE);

	const resized = await sharp(source)
		.resize({ width: Math.round(targetMax), height: Math.round(targetMax), fit: 'inside' })
		.toBuffer();
	const resizedMeta = await sharp(resized).metadata();

	return sharp({
		create: {
			width: CANVAS,
			height: CANVAS,
			channels: 4,
			background,
		},
	})
		.composite([
			{
				input: resized,
				left: Math.round((CANVAS - (resizedMeta.width ?? 0)) / 2),
				top: Math.round((CANVAS - (resizedMeta.height ?? 0)) / 2),
			},
		])
		.png()
		.toBuffer();
};
