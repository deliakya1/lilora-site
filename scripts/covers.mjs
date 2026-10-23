// Cover art for blog posts and care guides: hand-coded herbarium-style ink plates
// in the approved Paper/Ink/Fern/Terracotta palette. No generated imagery, no text,
// no gradients. Writes assets/images/covers/<slug>.svg (1200×675) for every slug below.
import { mkdirSync, writeFileSync } from "node:fs";

const INK = "#1E2620", FERN = "#33613F", SAGE = "#7FA07F", MIST = "#E4ECE2", MOSS = "#D2E1D0",
  PAPER = "#F7F3EC", SUNKEN = "#EFE9DE", CLAY = "#A9502B", BLUSH = "#EBD3C4", SAND = "#C9BFAE",
  WHITE = "#FFFFFF", WATER = "#CFDDE3";
const W = 1200, H = 675;
const r = (n) => Math.round(n * 10) / 10;
const stroke = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

// --- primitives -----------------------------------------------------------
const leaf = (x, y, len, wid, ang, fill = SAGE, veins = 4) => {
  const v = [];
  for (let i = 1; i <= veins; i++) {
    const p = (len * i) / (veins + 1), s = wid * 0.62 * (1 - i / (veins + 2));
    v.push(`M${r(p)} 0 L${r(p + len * 0.13)} ${r(-s)}M${r(p)} 0 L${r(p + len * 0.13)} ${r(s)}`);
  }
  return `<g transform="translate(${r(x)} ${r(y)}) rotate(${r(ang)})"><path d="M0 0 C${r(len * 0.22)} ${r(-wid)} ${r(len * 0.72)} ${r(-wid * 0.92)} ${r(len)} 0 C${r(len * 0.72)} ${r(wid * 0.92)} ${r(len * 0.22)} ${r(wid)} 0 0Z" fill="${fill}" ${stroke(3)}/><path d="M0 0 L${r(len * 0.94)} 0${v.join("")}" fill="none" ${stroke(1.8)}/></g>`;
};
// Heart-shaped leaf (pothos, philodendron) pointing along `ang`.
const heart = (x, y, len, ang, fill = SAGE) =>
  `<g transform="translate(${r(x)} ${r(y)}) rotate(${r(ang)})"><path d="M0 0 C${r(len * -0.05)} ${r(-len * 0.55)} ${r(len * 0.55)} ${r(-len * 0.62)} ${r(len)} 0 C${r(len * 0.55)} ${r(len * 0.62)} ${r(len * -0.05)} ${r(len * 0.55)} 0 0Z" fill="${fill}" ${stroke(3)}/><path d="M${r(len * 0.04)} 0 L${r(len * 0.9)} 0 M${r(len * 0.35)} 0 L${r(len * 0.55)} ${r(-len * 0.22)} M${r(len * 0.35)} 0 L${r(len * 0.55)} ${r(len * 0.22)}" fill="none" ${stroke(1.8)}/></g>`;
// A stem curving from (x,y) at an angle from vertical, ending in a leaf.
const sprig = (x, y, ang, len, leafLen, opts = {}) => {
  const a = (ang * Math.PI) / 180, ex = x + Math.sin(a) * len, ey = y - Math.cos(a) * len;
  const bend = opts.bend ?? 0.18, cx = x + Math.sin(a) * len * 0.5 - Math.cos(a) * len * bend, cy = y - Math.cos(a) * len * 0.5 - Math.sin(a) * len * bend;
  const dir = (Math.atan2(ey - cy, ex - cx) * 180) / Math.PI;
  const body = opts.heart ? heart(ex, ey, leafLen, dir, opts.fill) : leaf(ex, ey, leafLen, opts.wid ?? leafLen * 0.34, dir, opts.fill);
  return `<path d="M${r(x)} ${r(y)} Q${r(cx)} ${r(cy)} ${r(ex)} ${r(ey)}" fill="none" ${stroke(3)}/>${body}`;
};
const plant = (x, y, sprigs) => sprigs.map(([ang, len, leafLen, opts]) => sprig(x, y, ang, len, leafLen, opts)).join("");
// Tall blades for snake-plant-like forms.
const blade = (x, y, h, w, lean, fill = SAGE) =>
  `<path d="M${r(x - w / 2)} ${r(y)} C${r(x - w / 2 + lean * 0.3)} ${r(y - h * 0.6)} ${r(x + lean - w * 0.2)} ${r(y - h * 0.9)} ${r(x + lean)} ${r(y - h)} C${r(x + lean + w * 0.15)} ${r(y - h * 0.85)} ${r(x + w / 2 + lean * 0.3)} ${r(y - h * 0.55)} ${r(x + w / 2)} ${r(y)}Z" fill="${fill}" ${stroke(3)}/><path d="M${r(x)} ${r(y - h * 0.15)} Q${r(x + lean * 0.5)} ${r(y - h * 0.5)} ${r(x + lean * 0.92)} ${r(y - h * 0.9)}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="2 10" stroke-linecap="round"/>`;
// Pot with rim; (x,y) is the centre of the rim's top edge.
const pot = (x, y, w, h, fill = CLAY, opts = {}) => {
  const rim = h * 0.2, b = w * 0.38;
  return `<path d="M${r(x - w * 0.46)} ${r(y + rim)} L${r(x - b)} ${r(y + h)} L${r(x + b)} ${r(y + h)} L${r(x + w * 0.46)} ${r(y + rim)}Z" fill="${fill}" ${stroke(3)}/><rect x="${r(x - w / 2)}" y="${r(y)}" width="${r(w)}" height="${r(rim)}" rx="4" fill="${opts.rim || fill}" ${stroke(3)}/>${opts.soil ? `<path d="M${r(x - w * 0.42)} ${r(y + 2)} Q${r(x)} ${r(y - 10)} ${r(x + w * 0.42)} ${r(y + 2)}" fill="#6B5544" ${stroke(2.5)}/>` : ""}${opts.crust ? `<path d="M${r(x - w * 0.44)} ${r(y + rim + 10)} q12 8 24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="${WHITE}" stroke-width="5" stroke-linecap="round"/>` : ""}`;
};
const drop = (x, y, s = 1, fill = WATER) =>
  `<path transform="translate(${r(x)} ${r(y)}) scale(${s})" d="M0 -22 C10 -8 16 2 16 10 A16 16 0 0 1 -16 10 C-16 2 -10 -8 0 -22Z" fill="${fill}" ${stroke(2.5 / s)}/>`;
const disc = (x, y, rad, fill) => `<circle cx="${r(x)}" cy="${r(y)}" r="${r(rad)}" fill="${fill}"/>`;
const ground = (x1, x2, y) => `<path d="M${x1} ${y} L${x2} ${y}" ${stroke(2.5)}/>`;
const gnat = (x, y, s = 1) =>
  `<g transform="translate(${r(x)} ${r(y)}) scale(${s})"><ellipse cx="-9" cy="-7" rx="10" ry="5" fill="${WHITE}" ${stroke(1.6)} transform="rotate(-25 -9 -7)"/><ellipse cx="9" cy="-7" rx="10" ry="5" fill="${WHITE}" ${stroke(1.6)} transform="rotate(25 9 -7)"/><ellipse cx="0" cy="0" rx="3.5" ry="8" fill="${INK}"/><path d="M-2 8 L-7 15 M2 8 L7 15 M0 -8 L-4 -14 M0 -8 L4 -14" ${stroke(1.4)}/></g>`;
const sun = (x, y, rad) => {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return `M${r(x + Math.cos(a) * (rad + 12))} ${r(y + Math.sin(a) * (rad + 12))} L${r(x + Math.cos(a) * (rad + 30))} ${r(y + Math.sin(a) * (rad + 30))}`;
  }).join("");
  return `<circle cx="${x}" cy="${y}" r="${rad}" fill="${BLUSH}" ${stroke(3)}/><path d="${rays}" ${stroke(3)}/>`;
};
const windowFrame = (x, y, w, h, fill = WHITE) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" ${stroke(3)}/><path d="M${x + w / 2} ${y} L${x + w / 2} ${y + h} M${x} ${y + h / 2} L${x + w} ${y + h / 2}" ${stroke(2.5)}/><rect x="${x - 14}" y="${y + h}" width="${w + 28}" height="14" rx="3" fill="${SUNKEN}" ${stroke(3)}/>`;
const can = (x, y, s = 1, fill = FERN) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-60 -70 L60 -70 L52 40 L-52 40Z" fill="${fill}" ${stroke(3 / s)}/><path d="M60 -40 L150 -105 L158 -94 L64 -10" fill="${fill}" ${stroke(3 / s)}/><path d="M146 -112 L172 -96" ${stroke(6 / s)}/><path d="M-40 -70 C-40 -130 40 -130 40 -70" fill="none" ${stroke(5 / s)}/><path d="M-60 -40 C-100 -40 -100 20 -54 20" fill="none" ${stroke(4 / s)}/></g>`;
const jar = (x, y, w, h, waterLevel = 0.55) =>
  `<rect x="${r(x - w / 2)}" y="${r(y + h * (1 - waterLevel))}" width="${r(w)}" height="${r(h * waterLevel)}" rx="10" fill="${WATER}"/><path d="M${r(x - w / 2)} ${y} L${r(x - w / 2)} ${r(y + h - 12)} Q${r(x - w / 2)} ${y + h} ${r(x - w / 2 + 12)} ${y + h} L${r(x + w / 2 - 12)} ${y + h} Q${r(x + w / 2)} ${y + h} ${r(x + w / 2)} ${r(y + h - 12)} L${r(x + w / 2)} ${y}" fill="none" ${stroke(3)}/><path d="M${r(x - w / 2 - 6)} ${y} L${r(x + w / 2 + 6)} ${y}" ${stroke(3)}/><path d="M${r(x + w / 2 - 16)} ${r(y + 24)} L${r(x + w / 2 - 16)} ${r(y + h * 0.4)}" stroke="${WHITE}" stroke-width="5" stroke-linecap="round"/>`;
const label = (x, y) =>
  `<rect x="${x}" y="${y}" width="190" height="92" rx="3" fill="${PAPER}" stroke="${SAND}" stroke-width="2"/><path d="M${x + 18} ${y + 28} L${x + 150} ${y + 28} M${x + 18} ${y + 50} L${x + 172} ${y + 50} M${x + 18} ${y + 72} L${x + 110} ${y + 72}" stroke="${SAND}" stroke-width="2.5" stroke-linecap="round"/>`;
const tape = (x, y, ang) => `<rect x="${x - 34}" y="${y - 12}" width="68" height="24" fill="${BLUSH}" opacity=".85" transform="rotate(${ang} ${x} ${y})"/>`;

// The herbarium sheet every cover sits on.
const plate = (bg, body, opts = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-hidden="true"><rect width="${W}" height="${H}" fill="${bg}"/><rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="4" fill="none" stroke="${SAND}" stroke-width="2"/>${opts.label === false ? "" : label(W - 260, H - 150)}${body}</svg>\n`;

// --- covers ---------------------------------------------------------------
const leafy = (x, y, scale = 1, fill = SAGE) =>
  plant(x, y, [
    [-58, 150 * scale, 92 * scale, { fill }],
    [-22, 210 * scale, 104 * scale, { fill: FERN }],
    [8, 240 * scale, 110 * scale, { fill }],
    [38, 190 * scale, 98 * scale, { fill: FERN }],
    [66, 140 * scale, 86 * scale, { fill }],
  ]);
const trailing = (x, y, fill = SAGE) =>
  plant(x, y, [
    [-35, 120, 62, { heart: true, fill }],
    [5, 150, 66, { heart: true, fill: FERN }],
    [40, 115, 60, { heart: true, fill }],
  ]) +
  `<path d="M${x + 70} ${y + 20} C${x + 150} ${y + 60} ${x + 150} ${y + 170} ${x + 120} ${y + 250}" fill="none" ${stroke(3)}/>` +
  heart(x + 145, y + 100, 52, 60, FERN) + heart(x + 128, y + 190, 50, 100, SAGE) +
  `<path d="M${x - 70} ${y + 20} C${x - 140} ${y + 70} ${x - 130} ${y + 150} ${x - 150} ${y + 210}" fill="none" ${stroke(3)}/>` +
  heart(x - 132, y + 92, 50, 130, SAGE) + heart(x - 150, y + 200, 48, 95, FERN);

const covers = {
  // Blog posts ----------------------------------------------------------------
  "check-before-you-water": plate(MIST,
    disc(520, 330, 210, MOSS) + leafy(520, 400) + pot(520, 390, 230, 190, CLAY, { soil: true }) +
    `<path d="M600 280 L640 520" stroke="#B88A5A" stroke-width="12" stroke-linecap="round"/><path d="M600 280 L640 520" fill="none" ${stroke(2.5)} stroke-dasharray="1 0"/>` +
    `<circle cx="760" cy="240" r="58" fill="${PAPER}" ${stroke(3)}/><path d="M732 242 L752 262 L790 220" fill="none" stroke="${FERN}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` +
    ground(330, 720, 580)),
  "autumn-plant-reset": plate(SUNKEN,
    windowFrame(160, 110, 300, 300) + disc(640, 340, 200, BLUSH) + leafy(640, 400, 0.95) + pot(640, 390, 220, 185) +
    leaf(860, 210, 70, 26, 30, CLAY) + leaf(900, 330, 64, 24, 120, "#C9773F") + leaf(820, 460, 66, 25, 200, CLAY) + leaf(260, 500, 60, 22, 160, "#C9773F") +
    ground(140, 960, 580)),
  "moving-house-with-plants": plate(MIST,
    leafy(560, 330, 0.85) +
    `<path d="M380 330 L740 330 L740 570 L380 570Z" fill="#D9B98F" ${stroke(3)}/><path d="M380 330 L320 270 L560 270 M740 330 L800 270 L560 270" fill="#E6CDA8" ${stroke(3)}/><path d="M380 330 L330 400 M740 330 L790 400" ${stroke(3)}/><path d="M470 330 L470 420 L650 420 L650 330" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="8 8"/><rect x="520" y="460" width="80" height="44" fill="${PAPER}" ${stroke(2.5)}/><path d="M533 482 L587 482" stroke="${SAND}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M880 200 L940 150 L1000 200 L1000 290 L880 290Z" fill="${PAPER}" ${stroke(3)}/><rect x="925" y="235" width="30" height="55" fill="${SAGE}" ${stroke(2.5)}/>` +
    ground(260, 900, 570)),
  "keeping-a-plant-care-journal": plate(SUNKEN,
    `<path d="M220 160 L590 190 L590 540 L220 510Z" fill="${PAPER}" ${stroke(3)}/><path d="M590 190 L960 160 L960 510 L590 540Z" fill="${WHITE}" ${stroke(3)}/>` +
    Array.from({ length: 7 }, (_, i) => `<path d="M640 ${240 + i * 38} L910 ${222 + i * 38}" stroke="${SAND}" stroke-width="2.5" stroke-linecap="round"/>`).join("") +
    `<path d="M300 480 Q380 360 420 250" fill="none" ${stroke(3)}/>` + leaf(330, 420, 90, 30, -150, SAGE) + leaf(380, 340, 95, 32, -30, FERN) + leaf(400, 290, 80, 28, -140, SAGE) + leaf(420, 250, 70, 25, -70, FERN) +
    tape(290, 470, -20) + tape(430, 240, 15) +
    `<path d="M980 520 L1060 250" stroke="${CLAY}" stroke-width="18" stroke-linecap="round"/><path d="M980 520 L990 488" ${stroke(6)}/>`,
    { label: false }),

  // New blog posts --------------------------------------------------------------
  "brown-leaf-tips": plate(MIST,
    disc(560, 340, 220, MOSS) +
    `<g transform="translate(300 470) rotate(-28)"><path d="M0 0 C150 -150 500 -140 640 0 C500 140 150 150 0 0Z" fill="${SAGE}" ${stroke(3.5)}/><path d="M500 -88 C560 -60 610 -30 640 0 C610 30 560 60 500 88 C540 40 540 -40 500 -88Z" fill="#9A6A3F" ${stroke(3)}/><path d="M0 0 L620 0 M120 0 L180 -70 M120 0 L180 70 M240 0 L300 -88 M240 0 L300 88 M360 0 L420 -86 M360 0 L420 86" fill="none" ${stroke(2)}/></g>` +
    `<circle cx="880" cy="200" r="56" fill="none" ${stroke(4)}/><path d="M920 240 L975 295" ${stroke(9)}/>`),
  "mold-on-houseplant-soil": plate(SUNKEN,
    disc(470, 340, 200, MOSS) + leafy(470, 380, 0.75) + pot(470, 370, 240, 200, CLAY, { soil: true }) +
    `<path d="M380 368 c6 -14 18 -14 24 0 c6 -12 18 -12 22 2 M470 362 c6 -12 18 -12 24 0 c6 -10 16 -10 20 2 M530 368 c5 -10 14 -10 18 0" fill="${WHITE}" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<circle cx="410" cy="360" r="3" fill="${WHITE}"/><circle cx="500" cy="356" r="3" fill="${WHITE}"/>` +
    `<circle cx="780" cy="300" r="78" fill="${WHITE}" fill-opacity=".55" ${stroke(5)}/><path d="M835 355 L905 425" ${stroke(12)}/>` +
    `<path d="M745 305 c8 -18 22 -18 30 0 c8 -16 22 -16 28 2" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/><path d="M738 318 L822 318" stroke="#6B5544" stroke-width="10" stroke-linecap="round"/>` +
    ground(300, 960, 572)),
  "cleaning-houseplant-leaves": plate(MIST,
    disc(560, 330, 210, PAPER) +
    `<g transform="translate(330 450) rotate(-22)"><path d="M0 0 C140 -170 470 -160 600 0 C470 160 140 170 0 0Z" fill="${FERN}" ${stroke(3.5)}/><path d="M0 0 L580 0 M140 0 L200 -80 M140 0 L200 80 M280 0 L340 -94 M280 0 L340 94 M420 0 L470 -70 M420 0 L470 70" fill="none" stroke="${MIST}" stroke-width="2.5"/><path d="M170 -40 L420 -40" stroke="${WHITE}" stroke-width="8" stroke-linecap="round" opacity=".7"/></g>` +
    `<path d="M700 470 C760 430 860 440 900 480 L870 560 C820 530 750 530 690 550Z" fill="${WHITE}" ${stroke(3)}/><path d="M720 500 L860 500 M710 525 L850 528" stroke="${SAND}" stroke-width="2" stroke-linecap="round"/>` +
    drop(860, 230, 0.9) + drop(930, 300, 0.7) + drop(820, 330, 0.6)),
  "leggy-houseplants": plate(SUNKEN,
    windowFrame(760, 100, 260, 280) + sun(890, 240, 34) +
    `<path d="M430 470 C440 360 520 250 660 170" fill="none" ${stroke(3)}/>` + leaf(445, 400, 70, 24, -160, SAGE) + leaf(500, 300, 64, 22, 20, SAGE) + leaf(570, 230, 70, 24, -150, FERN) + leaf(660, 170, 90, 30, -20, FERN) +
    pot(430, 460, 200, 160, CLAY, { soil: true }) +
    `<g transform="translate(250 230) rotate(-30)"><circle cx="-20" cy="30" r="18" fill="none" ${stroke(3)}/><circle cx="20" cy="30" r="18" fill="none" ${stroke(3)}/><path d="M-8 16 L28 -70 M8 16 L-28 -70" ${stroke(4)}/></g>` +
    ground(260, 760, 620 - 2)),
  "grow-lights-for-houseplants": plate(MIST,
    `<path d="M600 40 L600 150" ${stroke(3)}/><path d="M500 210 C500 140 700 140 700 210Z" fill="${FERN}" ${stroke(3)}/><path d="M520 210 L680 210" ${stroke(3)}/>` +
    `<path d="M520 225 L410 470 M560 225 L520 470 M600 225 L600 470 M640 225 L680 470 M680 225 L790 470" stroke="#C99A3A" stroke-width="2.5" stroke-dasharray="10 12" stroke-linecap="round"/>` +
    leafy(600, 470, 0.7) + pot(600, 462, 200, 140, CLAY) + ground(380, 820, 602)),
  "tap-water-for-houseplants": plate(SUNKEN,
    `<path d="M300 200 L300 160 L420 160 L420 200" fill="none" ${stroke(3)}/><path d="M290 200 L430 200 L410 520 L310 520Z" fill="${WHITE}" ${stroke(3)}/><path d="M298 300 L422 300 L410 520 L310 520Z" fill="${WATER}" ${stroke(3)}/><path d="M430 230 C480 230 480 320 425 330" fill="none" ${stroke(4)}/>` +
    leafy(700, 390, 0.75) + pot(700, 380, 240, 200, CLAY, { crust: true }) +
    `<circle cx="365" cy="380" r="6" fill="${WHITE}" ${stroke(1.5)}/><circle cx="345" cy="440" r="4" fill="${WHITE}" ${stroke(1.5)}/><circle cx="385" cy="470" r="5" fill="${WHITE}" ${stroke(1.5)}/>` +
    ground(240, 960, 580)),
  "bottom-watering": plate(MIST,
    leafy(560, 330, 0.8) + pot(560, 320, 220, 190) +
    `<path d="M330 470 L360 580 L760 580 L790 470Z" fill="${WATER}" ${stroke(3)}/><path d="M350 500 q20 -8 40 0 t40 0 t40 0 M680 500 q20 -8 40 0 t40 0" fill="none" ${stroke(2)}/>` +
    `<path d="M860 520 L860 300 M835 330 L860 300 L885 330" fill="none" stroke="${FERN}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` + drop(860, 560, 0.7)),
  "terracotta-vs-plastic-pots": plate(SUNKEN,
    disc(400, 360, 170, BLUSH) + disc(800, 360, 170, MOSS) +
    leafy(400, 360, 0.6) + pot(400, 350, 220, 200, CLAY) +
    plant(800, 360, [[-30, 150, 70, { fill: SAGE }], [0, 180, 80, { fill: FERN }], [32, 140, 70, { fill: SAGE }]]) + pot(800, 350, 220, 200, "#5E7F86", { rim: "#6E9097" }) +
    `<path d="M600 160 L600 560" stroke="${SAND}" stroke-width="2.5" stroke-dasharray="6 10"/>` + ground(220, 980, 552)),
  "buying-a-healthy-houseplant": plate(MIST,
    disc(520, 330, 210, PAPER) + leafy(520, 390, 0.9) + pot(520, 380, 220, 190) +
    `<path d="M640 470 L700 430 L760 470 L760 560 L640 560Z" fill="${PAPER}" ${stroke(3)}/><circle cx="700" cy="460" r="7" fill="none" ${stroke(2.5)}/><path d="M690 450 C670 420 640 410 620 420" fill="none" ${stroke(2)}/>` +
    `<circle cx="820" cy="250" r="80" fill="${WHITE}" fill-opacity=".55" ${stroke(5)}/><path d="M876 306 L950 380" ${stroke(12)}/>` + leaf(780, 250, 70, 24, -10, FERN) +
    ground(300, 900, 570)),
  "do-houseplants-purify-air": plate(SUNKEN,
    leafy(560, 450, 0.7) + pot(560, 440, 200, 140) +
    `<path d="M380 580 L380 260 C380 110 740 110 740 260 L740 580" fill="${WHITE}" fill-opacity=".45" ${stroke(3.5)}/><path d="M560 120 L560 90" ${stroke(3)}/><circle cx="560" cy="80" r="14" fill="${PAPER}" ${stroke(3)}/><path d="M410 300 L410 470" stroke="${WHITE}" stroke-width="8" stroke-linecap="round"/>` +
    `<path d="M820 240 c40 -20 80 20 120 0 M800 310 c40 -20 80 20 120 0 M830 380 c40 -20 80 20 120 0" fill="none" stroke="${SAGE}" stroke-width="4" stroke-linecap="round"/>` +
    ground(300, 820, 582)),

  // Care guides ---------------------------------------------------------------
  "watering-houseplants": plate(MIST,
    disc(450, 350, 200, MOSS) + leafy(450, 400, 0.8) + pot(450, 390, 220, 180) + can(780, 330, 1.15) + drop(640, 330, 0.7) + drop(600, 390, 0.55) + ground(270, 980, 570)),
  "overwatering-vs-underwatering": plate(SUNKEN,
    disc(380, 360, 160, MOSS) + disc(820, 360, 160, BLUSH) +
    plant(380, 380, [[-40, 130, 70, { fill: SAGE }], [0, 170, 80, { fill: FERN }], [40, 130, 70, { fill: SAGE }]]) + pot(380, 370, 190, 160, CLAY, { soil: true }) + drop(300, 230, 0.6) + drop(470, 250, 0.5) +
    plant(820, 380, [[-70, 110, 66, { fill: "#B8A35E", bend: -0.25 }], [-10, 140, 70, { fill: "#C9B36B", bend: -0.3 }], [70, 110, 62, { fill: "#B8A35E", bend: 0.3 }]]) + pot(820, 370, 190, 160) +
    `<path d="M600 160 L600 560" stroke="${SAND}" stroke-width="2.5" stroke-dasharray="6 10"/>` + ground(220, 980, 532)),
  "root-rot": plate(SUNKEN,
    plant(560, 260, [[-40, 110, 70, { fill: SAGE }], [0, 140, 76, { fill: "#B8A35E" }], [40, 110, 70, { fill: SAGE }]]) +
    `<path d="M440 260 L680 260 L650 420 L470 420Z" fill="#6B5544" ${stroke(3)}/>` +
    `<path d="M520 420 C510 470 480 500 470 560 M560 420 C565 480 545 520 560 590 M600 420 C620 470 650 500 640 560 M540 470 C520 490 500 492 490 510 M590 480 C610 500 630 500 640 520" fill="none" stroke="#7A5638" stroke-width="5" stroke-linecap="round"/><path d="M560 540 C565 570 555 580 560 590" stroke="#3E2D22" stroke-width="7" stroke-linecap="round"/>` +
    `<circle cx="820" cy="430" r="70" fill="none" ${stroke(4)}/><path d="M870 480 L930 540" ${stroke(10)}/>`),
  "potting-mix-and-drainage": plate(MIST,
    `<path d="M380 180 L820 180 L770 560 L430 560Z" fill="${PAPER}" ${stroke(3)}/>` +
    `<path d="M392 260 L808 260 L796 350 L404 350Z" fill="#6B5544"/><path d="M404 350 L796 350 L784 440 L416 440Z" fill="#8C6E58"/><path d="M416 440 L784 440 L772 520 L428 520Z" fill="${SAND}"/>` +
    Array.from({ length: 18 }, (_, i) => `<circle cx="${440 + (i % 9) * 40}" cy="${380 + Math.floor(i / 9) * 32}" r="${5 + (i % 3)}" fill="${WHITE}" ${stroke(1.5)}/>`).join("") +
    Array.from({ length: 8 }, (_, i) => `<ellipse cx="${450 + i * 42}" cy="485" rx="14" ry="10" fill="#B28A6A" ${stroke(1.8)}/>`).join("") +
    `<path d="M380 180 L820 180 L770 560 L430 560Z" fill="none" ${stroke(3)}/><path d="M600 560 L600 610" stroke="${WATER}" stroke-width="10" stroke-linecap="round"/>` + drop(600, 630, 0.5)),
  "indoor-plant-light-guide": plate(SUNKEN,
    windowFrame(160, 110, 320, 320) + sun(320, 270, 40) +
    `<path d="M480 180 L900 520 M480 300 L780 560 M480 410 L640 560" stroke="#C99A3A" stroke-width="2.5" stroke-dasharray="10 12" stroke-linecap="round"/>` +
    leafy(780, 400, 0.75) + pot(780, 392, 200, 160) + ground(140, 960, 552)),
  "houseplant-humidity": plate(MIST,
    leafy(470, 390, 0.85) + pot(470, 380, 220, 180) +
    `<path d="M790 300 L790 230 L850 230 L850 300" fill="none" ${stroke(3)}/><path d="M760 300 L880 300 L870 520 L770 520Z" fill="${WHITE}" ${stroke(3)}/><path d="M850 240 L900 240 L900 270" fill="none" ${stroke(3)}/><rect x="790" y="210" width="50" height="22" rx="4" fill="${FERN}" ${stroke(3)}/>` +
    `<circle cx="690" cy="230" r="5" fill="${WATER}" ${stroke(1.5)}/><circle cx="660" cy="260" r="7" fill="${WATER}" ${stroke(1.5)}/><circle cx="700" cy="290" r="4" fill="${WATER}" ${stroke(1.5)}/><circle cx="640" cy="215" r="4" fill="${WATER}" ${stroke(1.5)}/>` +
    ground(280, 960, 560)),
  "winter-houseplant-care": plate(SUNKEN,
    windowFrame(170, 110, 300, 300) +
    `<path d="M250 190 l40 40 m-40 0 l40 -40 M245 210 l50 0 M270 185 l0 50" ${stroke(2.5)}/><path d="M380 300 l30 30 m-30 0 l30 -30 M375 315 l40 0 M395 295 l0 40" ${stroke(2.5)}/>` +
    disc(720, 350, 190, MOSS) + leafy(720, 400, 0.85) + pot(720, 390, 220, 180) +
    `<rect x="900" y="250" width="34" height="200" rx="17" fill="${PAPER}" ${stroke(3)}/><circle cx="917" cy="460" r="30" fill="${CLAY}" ${stroke(3)}/><path d="M917 450 L917 330" stroke="${CLAY}" stroke-width="12" stroke-linecap="round"/>` +
    ground(150, 980, 570)),
  "fertilizing-houseplants": plate(MIST,
    disc(480, 340, 200, PAPER) + leafy(480, 400, 0.85) + pot(480, 390, 220, 180) +
    `<path d="M780 260 L780 220 L840 220 L840 260" fill="none" ${stroke(3)}/><path d="M750 260 L870 260 L870 520 L750 520Z" fill="${FERN}" ${stroke(3)}/><rect x="770" y="330" width="80" height="110" rx="4" fill="${PAPER}" ${stroke(2.5)}/>` + leaf(790, 400, 46, 16, -40, SAGE) +
    `<path d="M760 200 L860 200" ${stroke(3)}/><rect x="775" y="180" width="70" height="22" rx="4" fill="${CLAY}" ${stroke(3)}/>` +
    ground(300, 960, 570)),
  "when-to-repot-houseplants": plate(SUNKEN,
    plant(420, 300, [[-35, 120, 70, { fill: SAGE }], [0, 150, 78, { fill: FERN }], [35, 120, 70, { fill: SAGE }]]) +
    `<path d="M340 300 C320 360 330 420 360 450 C390 470 450 470 480 450 C510 420 520 360 500 300Z" fill="#6B5544" ${stroke(3)}/><path d="M360 340 C390 380 450 330 480 380 M350 400 C400 440 440 380 490 420" fill="none" stroke="#C9A27A" stroke-width="3"/>` +
    `<path d="M380 470 C370 510 360 530 350 560 M440 470 C445 510 455 540 450 570" fill="none" stroke="#C9A27A" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M620 420 L880 420 M820 380 L880 420 L820 460" fill="none" stroke="${FERN}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` +
    pot(770, 470, 180, 110) + ground(260, 980, 580)),
  "propagating-cuttings": plate(MIST,
    jar(450, 300, 170, 250) +
    `<path d="M430 420 C420 330 430 250 460 180" fill="none" ${stroke(3)}/>` + heart(460, 180, 80, -60, FERN) + heart(440, 260, 66, -150, SAGE) +
    `<path d="M430 420 C410 460 400 480 395 520 M430 420 C440 470 450 490 470 515 M430 420 C430 470 428 500 432 530" fill="none" stroke="#C9A27A" stroke-width="3" stroke-linecap="round"/>` +
    jar(730, 340, 140, 210, 0.5) +
    `<path d="M720 450 C715 380 720 320 740 260" fill="none" ${stroke(3)}/>` + leaf(740, 260, 80, 28, -70, FERN) + leaf(725, 330, 60, 22, -160, SAGE) +
    `<path d="M720 450 C705 480 700 500 700 520 M720 450 C730 480 740 495 750 520" fill="none" stroke="#C9A27A" stroke-width="3" stroke-linecap="round"/>` +
    ground(300, 920, 552)),
  "houseplant-pests": plate(SUNKEN,
    `<g transform="translate(250 460) rotate(-24)"><path d="M0 0 C150 -170 520 -160 660 0 C520 160 150 170 0 0Z" fill="${SAGE}" ${stroke(3.5)}/><path d="M0 0 L640 0 M150 0 L210 -84 M150 0 L210 84 M300 0 L360 -98 M300 0 L360 98 M450 0 L500 -76 M450 0 L500 76" fill="none" ${stroke(2)}/></g>` +
    `<g transform="translate(560 320)"><ellipse rx="20" ry="14" fill="${WHITE}" ${stroke(2)}/><path d="M-18 6 L-28 14 M18 6 L28 14 M-12 12 L-16 22 M12 12 L16 22" ${stroke(1.6)}/></g>` +
    `<g transform="translate(640 270)"><ellipse rx="14" ry="10" fill="${WHITE}" ${stroke(2)}/></g><g transform="translate(470 380)"><circle r="7" fill="${CLAY}" ${stroke(1.6)}/></g><g transform="translate(500 360)"><circle r="6" fill="${CLAY}" ${stroke(1.6)}/></g>` +
    `<circle cx="880" cy="230" r="70" fill="${WHITE}" fill-opacity=".5" ${stroke(5)}/><path d="M930 280 L995 345" ${stroke(11)}/>`),
  "yellow-houseplant-leaves": plate(MIST,
    disc(560, 340, 210, PAPER) +
    `<path d="M560 560 C560 460 560 360 570 220" fill="none" ${stroke(3)}/>` +
    leaf(560, 470, 150, 52, -165, "#E3C76A") + leaf(562, 400, 150, 52, -15, SAGE) + leaf(566, 320, 140, 48, -160, FERN) + leaf(570, 220, 130, 44, -60, SAGE) +
    leaf(780, 540, 120, 42, 10, "#E3C76A") + ground(330, 900, 570)),
  "pet-safe-houseplants": plate(SUNKEN,
    disc(470, 340, 200, MOSS) + leafy(470, 390, 0.8) + pot(470, 380, 220, 180) +
    `<g fill="${CLAY}" ${stroke(2.5)}><ellipse cx="800" cy="400" rx="54" ry="46"/><ellipse cx="730" cy="320" rx="22" ry="28"/><ellipse cx="785" cy="290" rx="22" ry="28"/><ellipse cx="845" cy="295" rx="22" ry="28"/><ellipse cx="890" cy="335" rx="22" ry="28"/></g>` +
    ground(290, 960, 560)),
  "shared-plant-care": plate(MIST,
    disc(600, 330, 200, PAPER) + leafy(600, 390, 0.8) + pot(600, 380, 220, 180) +
    `<rect x="240" y="210" width="190" height="210" rx="8" fill="${WHITE}" ${stroke(3)}/><path d="M240 250 L430 250" ${stroke(3)}/><path d="M280 195 L280 225 M390 195 L390 225" ${stroke(4)}/>` +
    Array.from({ length: 9 }, (_, i) => `<rect x="${262 + (i % 3) * 52}" y="${270 + Math.floor(i / 3) * 46}" width="36" height="30" rx="4" fill="${i === 4 ? SAGE : MIST}" stroke="${SAND}" stroke-width="2"/>`).join("") +
    `<path d="M275 330 L285 342 L302 318" fill="none" stroke="${FERN}" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M820 300 c0 -40 60 -40 60 0 c0 40 -60 40 -60 0Z M840 360 c-40 0 -60 60 -60 80 L940 440 c0 -20 -20 -80 -60 -80Z" fill="${BLUSH}" ${stroke(3)}/>` +
    ground(220, 980, 560)),
};

mkdirSync("assets/images/covers", { recursive: true });
for (const [slug, svg] of Object.entries(covers)) writeFileSync(`assets/images/covers/${slug}.svg`, svg);
console.log(`Wrote ${Object.keys(covers).length} covers.`);
