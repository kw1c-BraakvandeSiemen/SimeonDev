const cloth = document.getElementById("cloth");
const clothContent = cloth.querySelector(".cloth-content");
const canvas = document.getElementById("clothCanvas");
const ctx = canvas.getContext("2d");
const dragState = document.getElementById("dragState");

const catButton = document.getElementById("catButton");
const meow = document.getElementById("meow");

const CONFIG = {
	spacing: 20,
	iterations: 16,
	damping: 0.985,
	restStiffness: 0.01,
	shearStiffness: 0.7,
	bendStiffness: 0.4,
	grabRadius: 40,
	maxPull: 220,
	dragRestStiffness: 0.02,
	shapeSigma: 190,
	shapeStrength: 0.05,
	maxDepth: 110,
	depthSoftness: 0.3,
	dragThreshold: 6,
	perspective: 1200,
	resetDelay: 5000,
	resetDuration: 4000,
	resetStrength: 0.045,
	resetDamping: 0.9,
	themeDelay: 700,
	themeFade: 0.025,
	textColorEvery: 3,
	partyCats: 6,
	partyMinGap: 20,
	partySpawnEvery: 450,
	partyLineGap: [1100, 1700],
	partyPause: [2500, 4500],
	partyDuration: [70000, 100000],
	rareChance: 0.05,
};

const LIGHT = (() => {
	const x = -0.4;
	const y = -0.5;
	const z = 0.77;
	const length = Math.hypot(x, y, z);

	return { x: x / length, y: y / length, z: z / length };
})();

const state = {
	pointerDown: false,
	dragging: false,
	pointerId: null,

	startClientX: 0,
	startClientY: 0,

	startLocalX: 0,
	startLocalY: 0,

	targetDx: 0,
	targetDy: 0,

	dx: 0,
	dy: 0,

	resetAt: 0,
	resetStart: 0,

	grabX: 0,
	grabY: 0,
};

let cols = 0;
let rows = 0;
let count = 0;

let width = 0;
let height = 0;

let offsetX = 0;
let offsetY = 0;

let dpr = 1;

let frameCount = 0;

let rx;
let ry;
let x;
let y;
let z;
let qx;
let qy;
let qz;
let sx;
let sy;
let shade;
let nxs;
let nys;
let pinned;

let cA;
let cB;
let cLen;
let cK;

let cluster = [];

let anchors = null;

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
	return a + (b - a) * t;
}

function randomBetween(range) {
	return range[0] + Math.random() * (range[1] - range[0]);
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickRandom(list) {
	return list[Math.floor(Math.random() * list.length)];
}

function hslToRgb(h, s, l) {
	const hue = ((h % 360) + 360) % 360;
	const a = s * Math.min(l, 1 - l);

	const f = (n) => {
		const k = (n + hue / 30) % 12;

		return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
	};

	return [f(0), f(8), f(4)];
}

function rgbToHue(r, g, b) {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;

	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);

	const delta = max - min;

	if (delta === 0) {
		return 0;
	}

	let hue;

	if (max === rn) {
		hue = ((gn - bn) / delta) % 6;
	} else if (max === gn) {
		hue = (bn - rn) / delta + 2;
	} else {
		hue = (rn - gn) / delta + 4;
	}

	return hue * 60;
}

function baseColor(t) {
	if (t < 0.52) {
		const u = t / 0.52;

		return [226 + 21 * u, 220 + 23 * u, 211 + 25 * u];
	}

	const u = (t - 0.52) / 0.48;

	return [247 - 49 * u, 243 - 53 * u, 236 - 58 * u];
}

const THEMES = [
	{
		name: "holographic",
		color(t, nx, ny, s, time) {
			const hue = t * 200 + nx * 160 + ny * 120 + time * 18;

			return hslToRgb(hue, 0.65, clamp(0.8 * s, 0.4, 0.93));
		},
	},

	// Rainbow variant, disabled for now.
	// {
	// 	name: "prismatic",
	// 	color(t, nx, ny, s, time) {
	// 		const u = t * 2.2 + (nx * 0.9 + ny * 0.7) * 2.2 + time * 0.03;
	//
	// 		return hslToRgb((u - Math.floor(u)) * 360, 0.8, clamp(0.72 * s, 0.35, 0.88));
	// 	},
	// },

	{
		name: "aurora",
		color(t, nx, ny, s, time) {
			const wave = 0.5 + 0.5 * Math.sin(t * 5 + nx * 4 + ny * 3 + time * 0.4);

			return hslToRgb(140 + 130 * wave, 0.55, clamp(0.8 * s, 0.4, 0.92));
		},
	},
];

const RETRO = {
	name: "retrowave",
	fixed: ["255,79,216", "53,224,255", "183,139,255"],
	color(t, nx, ny, s, time) {
		const stops = [
			[30, 6, 78],
			[96, 16, 130],
			[190, 32, 140],
			[255, 70, 150],
		];

		const scaled = clamp(t, 0, 1) * (stops.length - 1);
		const i = Math.min(Math.floor(scaled), stops.length - 2);
		const f = scaled - i;

		const a = stops[i];
		const b = stops[i + 1];

		const bands = 0.94 + 0.06 * Math.sin(t * 90 + time * 1.5);

		const r = (lerp(a[0], b[0], f) - nx * 40) * s * bands;
		const g = lerp(a[1], b[1], f) * s * bands;
		const bl = (lerp(a[2], b[2], f) + nx * 60) * s * bands;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(bl, 0, 255)];
	},
};

const TERMINAL = {
	name: "terminal",
	fixed: ["57,255,136", "125,255,176", "0,190,90"],
	color(t, nx, ny, s, time) {
		const scan = 0.9 + 0.1 * Math.sin(t * 140 + time * 2);

		const r = (6 + t * 4) * s * scan;
		const g = (18 + t * 14) * s * scan + Math.max(0, s - 1) * 60;
		const b = (10 + t * 6) * s * scan;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
	grid: { step: 1, color: "57,255,136", alpha: 0.06, cols: false },
};

const GAMEBOY_PALETTE = [
	[15, 56, 15],
	[48, 98, 48],
	[139, 172, 15],
	[155, 188, 15],
];

const GAMEBOY = {
	name: "gameboy",
	fixed: ["15,56,15", "48,98,48", "48,98,48"],
	edge: "rgba(15, 56, 15, 0.9)",
	color(t, nx, ny, s) {
		const v = clamp((s - 0.35) / 0.7, 0, 1);

		const level = v < 0.25 ? 0 : v < 0.5 ? 1 : v < 0.8 ? 2 : 3;

		return GAMEBOY_PALETTE[level].slice();
	},
};

const BLUEPRINT = {
	name: "blueprint",
	fixed: ["255,255,255", "159,208,255", "100,160,255"],
	edge: "rgba(255, 255, 255, 0.6)",
	color(t, nx, ny, s) {
		const r = lerp(16, 34, t) * s;
		const g = lerp(62, 104, t) * s;
		const b = lerp(138, 190, t) * s;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
	grid: { step: 2, color: "255,255,255", alpha: 0.22 },
};

const NEWSPAPER = {
	name: "newspaper",
	fixed: ["20,20,20", "122,31,18", "60,48,36"],
	edge: "rgba(60, 40, 20, 0.4)",
	color(t, nx, ny, s) {
		const r = lerp(232, 206, t) * s;
		const g = lerp(220, 190, t) * s;
		const b = lerp(186, 152, t) * s;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
	dots: { color: "70,50,30", alpha: 0.3 },
};

const FALLOUT = {
	name: "fallout",
	fixed: ["255,176,0", "255,214,102", "204,128,0"],
	edge: "rgba(255, 176, 0, 0.55)",
	color(t, nx, ny, s, time) {
		const flicker = 0.96 + 0.04 * Math.sin(time * 9 + t * 6);

		const r = (14 + t * 10) * s * flicker + Math.max(0, s - 1) * 90;
		const g = (10 + t * 7) * s * flicker + Math.max(0, s - 1) * 55;
		const b = (2 + t * 2) * s;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
	grid: { step: 1, color: "255,176,0", alpha: 0.08, cols: false },
};

const KEYBOARD = {
	name: "keyboard",
	fixed: ["26,26,26", "179,32,42", "90,70,60"],
	edge: "rgba(20, 20, 20, 0.5)",
	color(t, nx, ny, s, time, i, j) {
		const boundary = Math.round((i + 0.5) / 4);
		const nearBoundary = Math.abs(i + 0.5 - 4 * boundary) <= 1;
		const note = (boundary - 1 + 7) % 7;

		const black = j < 4 && boundary >= 1 && nearBoundary && note !== 2 && note !== 6;

		if (black) {
			const edgeLift = j === 3 ? 22 : 0;
			const gloss = Math.max(0, s - 1) * 90;

			return [clamp(26 * s + edgeLift + gloss, 0, 255), clamp(26 * s + edgeLift + gloss, 0, 255), clamp(32 * s + edgeLift + gloss, 0, 255)];
		}

		const tone = 1 - (j / Math.max(1, rows)) * 0.06;

		return [clamp(250 * s * tone, 0, 255), clamp(246 * s * tone, 0, 255), clamp(236 * s * tone, 0, 255)];
	},
	grid: { step: 4, color: "60,50,40", alpha: 0.55, rows: false },
};

const VIRTUALBOY_REDS = [
	[8, 0, 0],
	[60, 0, 0],
	[120, 0, 0],
	[190, 0, 0],
];

const VIRTUALBOY = {
	name: "virtualboy",
	fixed: ["255,48,48", "176,0,0", "255,110,110"],
	edge: "rgba(255, 30, 30, 0.8)",
	color(t, nx, ny, s) {
		const lift = s - 0.97;

		const level = lift < 0.05 ? 0 : lift < 0.13 ? 1 : lift < 0.22 ? 2 : 3;

		return VIRTUALBOY_REDS[level].slice();
	},
	grid: { step: 1, color: "255,30,30", alpha: 0.16 },
};

const WATER = {
	name: "water",
	fixed: ["255,255,255", "140,235,255", "60,170,230"],
	edge: "rgba(200, 245, 255, 0.7)",
	wave: { amp: 14, speed: 1.4, pull: 0.08 },
	color(t, nx, ny, s, time) {
		const band = 0.5 + 0.5 * Math.sin(t * 50 + time * 1.2 + nx * 6);

		const foam = clamp((s - 1.05) * 4, 0, 1);
		const dark = clamp((1 - s) * 1.4, 0, 1);

		let r = lerp(6, 24, t) * (1 + band * 0.12);
		let g = lerp(70, 150, t) * (1 + band * 0.12);
		let b = lerp(130, 200, t) * (1 + band * 0.1);

		r = lerp(r, 255, foam * 0.85) * (1 - dark * 0.5);
		g = lerp(g, 255, foam * 0.85) * (1 - dark * 0.5);
		b = lerp(b, 255, foam * 0.85) * (1 - dark * 0.5);

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
};

function hash2(i, j) {
	const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;

	return n - Math.floor(n);
}

const MINECRAFT = {
	name: "minecraft",
	fixed: ["255,255,255", "255,255,85", "85,255,85"],
	edge: "rgba(0, 0, 0, 0.6)",
	color(t, nx, ny, s, time, i, j) {
		const h = hash2(i, j);

		let base;

		if (j < 2 || (j === 2 && hash2(i, 7) > 0.5)) {
			base = [lerp(80, 110, h), lerp(140, 175, h), lerp(40, 60, h)];
		} else if (h > 0.93) {
			base = [125, 125, 125];
		} else if (h < 0.12) {
			base = [104, 72, 48];
		} else {
			base = [lerp(122, 146, h), lerp(86, 104, h), lerp(58, 76, h)];
		}

		return [clamp(base[0] * s, 0, 255), clamp(base[1] * s, 0, 255), clamp(base[2] * s, 0, 255)];
	},
	grid: { step: 1, color: "0,0,0", alpha: 0.1 },
};

const LEGO = {
	name: "lego",
	fixed: ["17,17,17", "201,26,9", "0,85,191"],
	edge: "rgba(120, 90, 0, 0.7)",
	studs: { radius: 9 },
	color(t, nx, ny, s) {
		const hi = clamp((s - 1) * 2.5, 0, 1);
		const lo = clamp((1 - s) * 1.4, 0, 1);

		let r = lerp(242, 255, hi);
		let g = lerp(205, 240, hi);
		let b = lerp(55, 150, hi);

		r *= 1 - lo * 0.3;
		g *= 1 - lo * 0.35;
		b *= 1 - lo * 0.4;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
};

const TETRIS_COLORS = [
	[0, 240, 240],
	[240, 240, 0],
	[160, 0, 240],
	[0, 240, 0],
	[240, 0, 0],
	[0, 0, 240],
	[240, 160, 0],
];

const TETRIS = {
	name: "tetris",
	fixed: ["255,255,255", "0,240,240", "240,240,0"],
	edge: "rgba(255, 255, 255, 0.6)",
	color(t, nx, ny, s, time, i, j) {
		const wall = i < 2 || i >= cols - 3;

		if (wall) {
			const side = i < 2 ? 0 : 1;
			const localI = i < 2 ? i : i - (cols - 3);

			const by = Math.floor(j / 2);
			const blockRows = Math.floor((rows - 1) / 2);

			const fromBottom = blockRows - 1 - by;
			const stack = 3 + Math.floor(hash2(side * 5, 3) * 8);

			const present = fromBottom < 2 || (fromBottom < stack && hash2(side * 13 + by, by * 7 + side) > 0.25);

			if (present) {
				const base = TETRIS_COLORS[Math.floor(hash2(side + by * 3, by) * TETRIS_COLORS.length)];

				const bevel = localI === 0 && j % 2 === 0 ? 45 : localI === 1 && j % 2 === 1 ? -45 : 0;

				return [clamp((base[0] + bevel) * s, 0, 255), clamp((base[1] + bevel) * s, 0, 255), clamp((base[2] + bevel) * s, 0, 255)];
			}
		}

		return [clamp((12 + t * 6) * s, 0, 255), clamp((12 + t * 6) * s, 0, 255), clamp((34 + t * 12) * s, 0, 255)];
	},
	grid: { step: 1, color: "120,140,255", alpha: 0.08 },
};

const CLOCK_NUMERALS = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

const clockPoint = { x: 0, y: 0 };

function clockEdge(angle, inset, frac) {
	const margin = 24;

	const halfW = width / 2 - margin;
	const halfH = height / 2 - margin;

	const dx = Math.sin(angle);
	const dy = -Math.cos(angle);

	const tx = Math.abs(dx) > 1e-6 ? halfW / Math.abs(dx) : Infinity;
	const ty = Math.abs(dy) > 1e-6 ? halfH / Math.abs(dy) : Infinity;

	const reach = Math.min(tx, ty) * frac - inset;

	sampleMesh(width / 2 + dx * reach, height / 2 + dy * reach, clockPoint);

	return { x: clockPoint.x, y: clockPoint.y };
}

function drawClock(strength) {
	const now = new Date();

	const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
	const minutes = now.getMinutes() + seconds / 60;
	const hours = (now.getHours() % 12) + minutes / 60;

	for (let n = 0; n < 60; n++) {
		const major = n % 5 === 0;
		const angle = (n / 60) * Math.PI * 2;

		const a = clockEdge(angle, 0, 1);
		const b = clockEdge(angle, major ? 14 : 7, 1);

		ctx.strokeStyle = "rgba(60, 40, 15, " + (major ? 0.55 : 0.3) * strength + ")";
		ctx.lineWidth = major ? 2 : 1;

		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.stroke();
	}

	ctx.font = "italic 13px Georgia, serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = "rgba(60, 40, 15, " + 0.5 * strength + ")";

	for (let h = 0; h < 12; h++) {
		const p = clockEdge((h / 12) * Math.PI * 2, 30, 1);

		ctx.fillText(CLOCK_NUMERALS[h], p.x, p.y);
	}

	const center = clockEdge(0, 0, 0);

	const hands = [
		{ angle: (hours / 12) * Math.PI * 2, frac: 0.5, width: 5, color: "rgba(60, 40, 15, " + 0.3 * strength + ")" },
		{ angle: (minutes / 60) * Math.PI * 2, frac: 0.75, width: 3, color: "rgba(60, 40, 15, " + 0.3 * strength + ")" },
		{ angle: (seconds / 60) * Math.PI * 2, frac: 0.85, width: 1.5, color: "rgba(170, 30, 20, " + 0.55 * strength + ")" },
	];

	hands.forEach((hand) => {
		const tip = clockEdge(hand.angle, 0, hand.frac);

		ctx.strokeStyle = hand.color;
		ctx.lineWidth = hand.width;
		ctx.lineCap = "round";

		ctx.beginPath();
		ctx.moveTo(center.x, center.y);
		ctx.lineTo(tip.x, tip.y);
		ctx.stroke();
	});

	ctx.lineCap = "butt";

	ctx.fillStyle = "rgba(170, 30, 20, " + 0.7 * strength + ")";
	ctx.beginPath();
	ctx.arc(center.x, center.y, 5, 0, Math.PI * 2);
	ctx.fill();
}

const CLOCK = {
	name: "clock",
	fixed: ["43,29,14", "138,28,20", "154,107,31"],
	edge: "rgba(154, 107, 31, 0.9)",
	draw: drawClock,
	color(t, nx, ny, s) {
		const r = lerp(240, 222, t) * s;
		const g = lerp(232, 208, t) * s;
		const b = lerp(210, 176, t) * s;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
};

const RUNESCAPE = {
	name: "runescape",
	fixed: ["255,255,0", "0,255,255", "255,152,31"],
	edge: "rgba(255, 200, 40, 0.9)",
	color(t, nx, ny, s, time, i, j) {
		const h = hash2(i, j);

		const tone = (h - 0.5) * 18;

		return [clamp((78 + tone) * s, 0, 255), clamp((66 + tone) * s, 0, 255), clamp((48 + tone * 0.8) * s, 0, 255)];
	},
	grid: { step: 4, color: "0,0,0", alpha: 0.28 },
};

function drawStuds(studs, strength) {
	for (let j = 1; j < rows - 1; j += 2) {
		for (let i = 1; i < cols - 1; i += 2) {
			const k = j * cols + i;

			const scale = (Math.hypot(sx[k + 1] - sx[k], sy[k + 1] - sy[k]) + Math.hypot(sx[k + cols] - sx[k], sy[k + cols] - sy[k])) / (2 * CONFIG.spacing);

			const radius = studs.radius * scale;

			ctx.fillStyle = "rgba(0, 0, 0, " + 0.12 * strength + ")";
			ctx.beginPath();
			ctx.arc(sx[k] + 1.5, sy[k] + 2.5, radius + 1.5, 0, Math.PI * 2);
			ctx.fill();

			ctx.fillStyle = "rgba(255, 255, 255, " + 0.3 * strength + ")";
			ctx.strokeStyle = "rgba(0, 0, 0, " + 0.2 * strength + ")";
			ctx.lineWidth = 1;

			ctx.beginPath();
			ctx.arc(sx[k], sy[k], radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
		}
	}
}

const GEM_STOPS = [
	[150, 10, 50],
	[110, 40, 170],
	[20, 70, 190],
	[10, 140, 90],
];

function drawSparkles(strength, time) {
	ctx.lineCap = "round";

	for (let j = 1; j < rows - 1; j += 3) {
		for (let i = 1; i < cols - 1; i += 3) {
			const h = hash2(i, j);

			if (h < 0.8) {
				continue;
			}

			const phase = (time * 0.8 + h * 10) % 1;
			const twinkle = Math.pow(Math.sin(phase * Math.PI), 4);

			if (twinkle < 0.05) {
				continue;
			}

			const k = j * cols + i;
			const reach = 5 + 9 * twinkle;

			ctx.strokeStyle = "rgba(255, 255, 255, " + 0.9 * twinkle * strength + ")";
			ctx.lineWidth = 1.5;

			ctx.beginPath();
			ctx.moveTo(sx[k] - reach, sy[k]);
			ctx.lineTo(sx[k] + reach, sy[k]);
			ctx.moveTo(sx[k], sy[k] - reach);
			ctx.lineTo(sx[k], sy[k] + reach);
			ctx.stroke();
		}
	}

	ctx.lineCap = "butt";
}

const GEMS = {
	name: "gems",
	fixed: ["255,255,255", "255,120,200", "120,220,255"],
	edge: "rgba(255, 255, 255, 0.85)",
	draw: drawSparkles,
	color(t, nx, ny, s, time, i, j) {
		const scaled = clamp(t, 0, 1) * (GEM_STOPS.length - 1);
		const index = Math.min(Math.floor(scaled), GEM_STOPS.length - 2);
		const f = scaled - index;

		const a = GEM_STOPS[index];
		const b = GEM_STOPS[index + 1];

		const facet = 0.8 + 0.4 * hash2(Math.floor(i / 3), Math.floor(j / 3));
		const glint = Math.max(0, s - 1.05) * 220;

		const r = lerp(a[0], b[0], f) * facet * s + glint;
		const g = lerp(a[1], b[1], f) * facet * s + glint;
		const bl = lerp(a[2], b[2], f) * facet * s + glint;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(bl, 0, 255)];
	},
	grid: { step: 3, color: "255,255,255", alpha: 0.14 },
};

const marqueePoint = { x: 0, y: 0 };

function marqueeAt(distance, inset) {
	const w = width - inset * 2;
	const h = height - inset * 2;

	let d = distance;

	if (d < w) {
		sampleMesh(inset + d, inset, marqueePoint);

		return;
	}

	d -= w;

	if (d < h) {
		sampleMesh(inset + w, inset + d, marqueePoint);

		return;
	}

	d -= h;

	if (d < w) {
		sampleMesh(inset + w - d, inset + h, marqueePoint);

		return;
	}

	d -= w;

	sampleMesh(inset, inset + h - d, marqueePoint);
}

function drawMarquee(strength, time) {
	const inset = 12;

	const perimeter = 2 * (width - inset * 2 + (height - inset * 2));
	const bulbs = Math.floor(perimeter / 30);

	const step = Math.floor(time * 4);

	for (let n = 0; n < bulbs; n++) {
		marqueeAt((n / bulbs) * perimeter, inset);

		const on = (n + step) % 3 !== 0;

		if (on) {
			ctx.fillStyle = "rgba(255, 215, 90, " + 0.25 * strength + ")";
			ctx.beginPath();
			ctx.arc(marqueePoint.x, marqueePoint.y, 7, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.fillStyle = on ? "rgba(255, 236, 150, " + strength + ")" : "rgba(160, 120, 40, " + 0.55 * strength + ")";
		ctx.beginPath();
		ctx.arc(marqueePoint.x, marqueePoint.y, 3.2, 0, Math.PI * 2);
		ctx.fill();
	}
}

const CASINO = {
	name: "casino",
	fixed: ["255,211,90", "255,59,59", "255,255,255"],
	edge: "rgba(255, 215, 90, 0.95)",
	draw: drawMarquee,
	color(t, nx, ny, s, time, i, j) {
		const grain = 0.94 + 0.12 * hash2(i, j);

		const r = lerp(10, 6, t) * grain * s + Math.max(0, s - 1.05) * 40;
		const g = lerp(98, 72, t) * grain * s + Math.max(0, s - 1.05) * 60;
		const b = lerp(56, 40, t) * grain * s + Math.max(0, s - 1.05) * 40;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
};

const meshA = { x: 0, y: 0 };
const meshB = { x: 0, y: 0 };
const meshC = { x: 0, y: 0 };
const pathPoint = { x: 0, y: 0 };

function withMesh(px, py, draw) {
	sampleMesh(px, py, meshA);
	sampleMesh(px + 20, py, meshB);
	sampleMesh(px, py + 20, meshC);

	ctx.save();

	ctx.transform((meshB.x - meshA.x) / 20, (meshB.y - meshA.y) / 20, (meshC.x - meshA.x) / 20, (meshC.y - meshA.y) / 20, meshA.x, meshA.y);

	draw();

	ctx.restore();
}

function meshLine(points, close) {
	ctx.beginPath();

	let first = true;

	const segments = close ? points.length : points.length - 1;

	for (let n = 0; n < segments; n++) {
		const a = points[n];
		const b = points[(n + 1) % points.length];

		const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 30));

		for (let k = first ? 0 : 1; k <= steps; k++) {
			const f = k / steps;

			sampleMesh(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, pathPoint);

			if (first) {
				ctx.moveTo(pathPoint.x, pathPoint.y);

				first = false;
			} else {
				ctx.lineTo(pathPoint.x, pathPoint.y);
			}
		}
	}

	if (close) {
		ctx.closePath();
	}
}

async function moveCat(cat, px, py) {
	cat.element.classList.remove("in");

	await sleep(420);

	cat.px = px;
	cat.py = py;

	await sleep(60);

	cat.element.classList.add("in");

	await sleep(300);
}

/* ---------- Windows XP ---------- */

function drawXp(strength) {
	ctx.globalAlpha = strength;

	withMesh(0, 0, () => {
		ctx.font = "bold 13px Tahoma, 'Trebuchet MS', sans-serif";
		ctx.textBaseline = "middle";
		ctx.textAlign = "left";

		ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
		ctx.fillText("siemen.dev", 15, 21);

		ctx.fillStyle = "#fff";
		ctx.fillText("siemen.dev", 14, 20);

		const button = (x, red) => {
			ctx.fillStyle = red ? "#d9472b" : "#2f6ed6";
			ctx.fillRect(x, 10, 20, 20);

			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 1.5;
			ctx.strokeRect(x + 0.5, 10.5, 19, 19);
		};

		const closeX = width - 30;

		button(closeX, true);
		button(closeX - 26, false);
		button(closeX - 52, false);

		ctx.strokeStyle = "#fff";
		ctx.lineWidth = 2;

		ctx.beginPath();
		ctx.moveTo(closeX + 5, 15);
		ctx.lineTo(closeX + 15, 25);
		ctx.moveTo(closeX + 15, 15);
		ctx.lineTo(closeX + 5, 25);
		ctx.stroke();

		ctx.strokeRect(closeX - 26 + 5, 15, 10, 9);

		ctx.beginPath();
		ctx.moveTo(closeX - 52 + 5, 24);
		ctx.lineTo(closeX - 52 + 14, 24);
		ctx.stroke();
	});

	ctx.globalAlpha = 1;
}

const XP = {
	name: "xp",
	fixed: ["0,84,227", "60,156,60", "10,36,106"],
	edge: "rgba(0, 60, 200, 0.95)",
	draw: drawXp,
	color(t, nx, ny, s, time, i, j) {
		if (j < 2) {
			const f = i / Math.max(1, cols - 1);

			const lift = j === 0 ? 18 : 0;

			return [clamp((lerp(0, 58, f) + lift) * s, 0, 255), clamp((lerp(84, 134, f) + lift) * s, 0, 255), clamp((lerp(227, 247, f) + lift) * s, 0, 255)];
		}

		return [clamp(236 * s, 0, 255), clamp(233 * s, 0, 255), clamp(216 * s, 0, 255)];
	},
};

/* ---------- Space Invaders ---------- */

const INVADERS = {
	name: "invaders",
	fixed: ["255,255,255", "80,255,80", "255,60,200"],
	edge: "rgba(80, 255, 80, 0.7)",
	grid: { step: 1, color: "80,255,80", alpha: 0.05, cols: false },
	color(t, nx, ny, s) {
		const glint = Math.max(0, s - 1.05) * 60;

		return [clamp(3 * s + glint * 0.3, 0, 255), clamp(8 * s + glint, 0, 255), clamp(4 * s + glint * 0.3, 0, 255)];
	},
};

/* ---------- Blue screen of death ---------- */

const BSOD = {
	name: "bsod",
	fixed: ["255,255,255", "170,170,255", "255,255,85"],
	edge: "rgba(255, 255, 255, 0.6)",
	color(t, nx, ny, s) {
		return [clamp(Math.max(0, s - 1) * 120, 0, 255), clamp(Math.max(0, s - 1) * 120, 0, 255), clamp(170 * s, 0, 255)];
	},
};

/* ---------- 404 ---------- */

function draw404(strength) {
	ctx.globalAlpha = 0.08 * strength;

	withMesh(width / 2, height / 2, () => {
		ctx.fillStyle = "#000";
		ctx.font = "bold 320px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.fillText("404", 0, 0);
	});

	ctx.globalAlpha = 1;
}

const NOTFOUND = {
	name: "notfound",
	fixed: ["34,34,34", "217,48,37", "110,110,110"],
	edge: "rgba(0, 0, 0, 0.25)",
	draw: draw404,
	color(t, nx, ny, s) {
		const v = lerp(248, 230, t) * s;

		return [clamp(v, 0, 255), clamp(v, 0, 255), clamp(v, 0, 255)];
	},
};

/* ---------- Chess ---------- */

const CHESS = {
	name: "chess",
	fixed: ["43,29,14", "139,26,26", "110,80,40"],
	edge: "rgba(43, 29, 14, 0.7)",
	color(t, nx, ny, s, time, i, j) {
		const dark = (Math.floor(i / 3) + Math.floor(j / 3)) % 2 === 1;

		const base = dark ? [214, 188, 150] : [240, 228, 200];

		return [clamp(base[0] * s, 0, 255), clamp(base[1] * s, 0, 255), clamp(base[2] * s, 0, 255)];
	},
};

/* ---------- Mini golf ---------- */

const golf = { phase: "idle", t0: 0 };

function drawGolf(strength) {
	const now = performance.now();

	const teeX = width * 0.05;
	const teeY = height * 0.5;
	const holeX = width * 0.95;
	const holeY = height * 0.5;

	ctx.globalAlpha = strength;

	withMesh(holeX, holeY, () => {
		ctx.fillStyle = "#0a0a0a";
		ctx.beginPath();
		ctx.arc(0, 0, 9, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
		ctx.lineWidth = 2;
		ctx.stroke();

		ctx.strokeStyle = "#fff";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(0, -38);
		ctx.stroke();

		ctx.fillStyle = "#e53935";
		ctx.beginPath();
		ctx.moveTo(0, -38);
		ctx.lineTo(17, -31);
		ctx.lineTo(0, -24);
		ctx.closePath();
		ctx.fill();
	});

	withMesh(teeX, teeY, () => {
		ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
		ctx.beginPath();
		ctx.arc(0, 2, 13, 0, Math.PI * 2);
		ctx.fill();
	});

	let ballX = teeX;
	let ballY = teeY;
	let show = golf.phase === "idle" || golf.phase === "flight";

	if (golf.phase === "flight") {
		const p = clamp((now - golf.t0) / 1800, 0, 1);
		const e = 1 - Math.pow(1 - p, 2.2);

		ballX = lerp(teeX, holeX, e);
		ballY = lerp(teeY, holeY, e);

		if (p >= 1) {
			golf.phase = "sunk";

			show = false;
		}
	}

	if (show) {
		withMesh(ballX, ballY, () => {
			ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
			ctx.beginPath();
			ctx.arc(1.5, 2.5, 5, 0, Math.PI * 2);
			ctx.fill();

			ctx.fillStyle = "#fff";
			ctx.beginPath();
			ctx.arc(0, 0, 5, 0, Math.PI * 2);
			ctx.fill();
		});
	}

	ctx.globalAlpha = 1;
}

const MINIGOLF = {
	name: "minigolf",
	fixed: ["255,255,255", "255,227,77", "10,110,30"],
	edge: "rgba(120, 80, 40, 0.95)",
	draw: drawGolf,
	color(t, nx, ny, s, time, i) {
		const stripe = Math.floor(i / 3) % 2 === 1;

		const r = (stripe ? 40 : 34) * s;
		const g = (stripe ? 168 : 150) * s + Math.max(0, s - 1.05) * 60;
		const b = (stripe ? 72 : 62) * s;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
};

/* ---------- Air hockey ---------- */

const hockey = { phase: "off", ready: false, last: 0, puck: { x: 0, y: 0, vx: 0, vy: 0 }, leftY: 0, rightY: 0, hits: 0, final: false, score: [0, 0] };

function resetHockey(start) {
	const h = hockey;

	h.ready = true;
	h.last = performance.now();

	h.puck.x = width / 2;
	h.puck.y = height / 2;
	h.puck.vx = start ? 470 : 0;
	h.puck.vy = start ? (Math.random() - 0.5) * 200 : 0;

	h.leftY = height / 2;
	h.rightY = height / 2;

	h.hits = 0;
	h.final = false;

	h.score = [0, 0];

	h.phase = start ? "rally" : "off";
}

function stepHockey(dt) {
	const h = hockey;

	if (h.phase !== "rally") {
		return;
	}

	const left = 14;
	const right = width - 14;
	const top = 14;
	const bottom = height - 14;

	const padL = left + 54;
	const padR = right - 54;

	const p = h.puck;

	p.x += p.vx * dt;
	p.y += p.vy * dt;

	if (p.y < top + 9) {
		p.y = top + 9;
		p.vy = Math.abs(p.vy);
	}

	if (p.y > bottom - 9) {
		p.y = bottom - 9;
		p.vy = -Math.abs(p.vy);
	}

	const follow = (current, target) => current + (target - current) * Math.min(1, dt * 7);

	h.leftY = follow(h.leftY, p.y);
	h.rightY = follow(h.rightY, h.final ? height * 0.12 : p.y);

	if (p.vx < 0 && p.x <= padL + 18) {
		h.hits++;

		p.x = padL + 18;

		if (h.hits >= 3) {
			const speed = 640;

			p.vx = speed;
			p.vy = (height / 2 - p.y) / ((right - 6 - p.x) / speed);

			h.final = true;
		} else {
			p.vx = 470;
			p.vy = (Math.random() - 0.5) * 420;
		}
	} else if (!h.final && p.vx > 0 && p.x >= padR - 18) {
		h.hits++;

		p.x = padR - 18;

		p.vx = -470;
		p.vy = (Math.random() - 0.5) * 420;
	}

	if (h.final && p.x >= right - 6) {
		h.phase = "goal";

		h.score[0] = 1;
	}
}

function drawHockey(strength) {
	const h = hockey;

	if (!h.ready) {
		resetHockey(false);
	}

	const now = performance.now();

	stepHockey(Math.min(0.05, (now - h.last) / 1000));

	h.last = now;

	const left = 14;
	const right = width - 14;
	const top = 14;
	const bottom = height - 14;
	const midY = height / 2;

	ctx.globalAlpha = strength;
	ctx.lineWidth = 2;
	ctx.shadowBlur = 10;

	ctx.strokeStyle = "#00f0ff";
	ctx.shadowColor = "#00f0ff";

	meshLine(
		[
			[left, top],
			[right, top],
			[right, bottom],
			[left, bottom],
		],
		true,
	);

	ctx.stroke();

	ctx.strokeStyle = "#ff2bd6";
	ctx.shadowColor = "#ff2bd6";

	meshLine(
		[
			[width / 2, top],
			[width / 2, bottom],
		],
		false,
	);

	ctx.stroke();

	const circle = [];

	for (let n = 0; n < 36; n++) {
		const angle = (n / 36) * Math.PI * 2;

		circle.push([width / 2 + Math.cos(angle) * 70, midY + Math.sin(angle) * 70]);
	}

	meshLine(circle, true);

	ctx.stroke();

	ctx.strokeStyle = "#39ff14";
	ctx.shadowColor = "#39ff14";
	ctx.lineWidth = 4;

	meshLine(
		[
			[left, midY - 60],
			[left, midY + 60],
		],
		false,
	);

	ctx.stroke();

	meshLine(
		[
			[right, midY - 60],
			[right, midY + 60],
		],
		false,
	);

	ctx.stroke();

	const paddle = (x, y, color) => {
		withMesh(x, y, () => {
			ctx.fillStyle = color;
			ctx.shadowColor = color;
			ctx.shadowBlur = 14;

			ctx.beginPath();
			ctx.arc(0, 0, 16, 0, Math.PI * 2);
			ctx.fill();
		});
	};

	paddle(left + 54, h.leftY, "rgba(255, 43, 214, 0.9)");
	paddle(right - 54, h.rightY, "rgba(0, 240, 255, 0.9)");

	withMesh(h.puck.x, h.puck.y, () => {
		ctx.fillStyle = "#39ff14";
		ctx.shadowColor = "#39ff14";
		ctx.shadowBlur = 16;

		ctx.beginPath();
		ctx.arc(0, 0, 9, 0, Math.PI * 2);
		ctx.fill();
	});

	withMesh(width / 2, 7, () => {
		ctx.font = "bold 12px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = "#fff";
		ctx.shadowColor = "#00f0ff";
		ctx.shadowBlur = 8;

		ctx.fillText(h.score[0] + " : " + h.score[1], 0, 0);
	});

	ctx.shadowBlur = 0;
	ctx.globalAlpha = 1;
}

const AIRHOCKEY = {
	name: "airhockey",
	fixed: ["0,240,255", "255,43,214", "57,255,20"],
	edge: "rgba(0, 240, 255, 0.7)",
	draw: drawHockey,
	color(t, nx, ny, s) {
		const glint = Math.max(0, s - 1.05) * 50;

		return [clamp(6 * s + glint * 0.4, 0, 255), clamp(9 * s + glint, 0, 255), clamp(22 * s + glint, 0, 255)];
	},
};

const SCENE_PLAYERS = [
	[8, 54],
	[93, 28],
	[93, 74],
	[50, 9],
	[50, 93],
];

function spawnAt(list) {
	return list.map(([px, py]) => {
		const cat = spawnCat();

		cat.px = px;
		cat.py = py;

		return cat;
	});
}

function cheerAll(cats, star, line) {
	cats.forEach((cat, index) => {
		cat.element.classList.add("cheer");

		setTimeout(() => say(cat, pickRandom(["meow!", "MEOW!", "meow meow!", "meow. wauw"])), index * 250);
	});

	star.element.classList.add("cheer");

	say(star, line);
}

/* ---------- Bowling ---------- */

const bowl = { phase: "idle", t0: 0, t1: 0 };

function drawBowling(strength) {
	const now = performance.now();

	const startX = width * 0.07;
	const endX = width - 58;
	const midY = height / 2;

	ctx.globalAlpha = strength;

	let since = 0;

	if (bowl.phase === "strike") {
		since = (now - bowl.t1) / 1000;
	}

	const baseX = width - 50;

	let index = 0;

	for (let r = 0; r < 4; r++) {
		for (let k = 0; k <= r; k++) {
			const px = baseX + r * 13;
			const py = midY + (k - r / 2) * 15;

			let dx = 0;
			let dy = 0;
			let rot = 0;
			let alpha = 1;

			if (bowl.phase === "strike") {
				const h = hash2(index, 3);

				dx = (30 + h * 60) * since * 1.5;
				dy = (hash2(index, 9) - 0.5) * 120 * since;
				rot = since * (6 + h * 8);
				alpha = clamp(1 - since / 1.4, 0, 1);
			}

			index++;

			if (alpha <= 0) {
				continue;
			}

			withMesh(px + dx, py + dy, () => {
				ctx.globalAlpha = strength * alpha;
				ctx.rotate(rot);

				ctx.fillStyle = "#fff";
				ctx.beginPath();
				ctx.ellipse(0, 1, 3.6, 6.2, 0, 0, Math.PI * 2);
				ctx.fill();

				ctx.beginPath();
				ctx.arc(0, -6, 2.6, 0, Math.PI * 2);
				ctx.fill();

				ctx.fillStyle = "#e53935";
				ctx.fillRect(-3.2, -3.2, 6.4, 1.8);
			});
		}
	}

	let ballX = startX;
	let ballAlpha = 1;
	let show = bowl.phase === "idle" || bowl.phase === "roll" || bowl.phase === "strike";

	if (bowl.phase === "roll") {
		const p = clamp((now - bowl.t0) / 1500, 0, 1);

		ballX = lerp(startX, endX, 1 - Math.pow(1 - p, 1.4));

		if (p >= 1) {
			bowl.phase = "strike";
			bowl.t1 = now;
		}
	}

	if (bowl.phase === "strike") {
		ballX = endX;
		ballAlpha = clamp(1 - since / 0.4, 0, 1);

		if (ballAlpha <= 0) {
			show = false;
		}
	}

	if (show) {
		withMesh(ballX, midY, () => {
			ctx.globalAlpha = strength * ballAlpha;

			ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
			ctx.beginPath();
			ctx.arc(1.5, 2.5, 8, 0, Math.PI * 2);
			ctx.fill();

			ctx.fillStyle = "#1a237e";
			ctx.beginPath();
			ctx.arc(0, 0, 8, 0, Math.PI * 2);
			ctx.fill();

			ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
			ctx.beginPath();
			ctx.arc(-3, -3, 2.2, 0, Math.PI * 2);
			ctx.fill();
		});
	}

	ctx.globalAlpha = 1;
}

const BOWLING = {
	name: "bowling",
	fixed: ["58,36,16", "198,40,40", "90,58,26"],
	edge: "rgba(70, 40, 20, 0.95)",
	draw: drawBowling,
	color(t, nx, ny, s, time, i, j) {
		if (j === 0 || j >= rows - 2) {
			return [clamp(46 * s, 0, 255), clamp(34 * s, 0, 255), clamp(28 * s, 0, 255)];
		}

		const plank = i % 2 === 1;

		const r = (lerp(226, 208, t) + (plank ? 5 : -3)) * s;
		const g = (lerp(184, 160, t) + (plank ? 4 : -2)) * s + Math.max(0, s - 1.05) * 40;
		const b = lerp(120, 100, t) * s;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
};

/* ---------- Penalty ---------- */

const pen = { phase: "idle", t0: 0 };

function drawPenalty(strength) {
	const now = performance.now();

	const midY = height / 2;
	const startX = width * 0.07;

	const targetX = width - 16;
	const targetY = midY - 34;

	ctx.globalAlpha = strength;
	ctx.lineWidth = 2;
	ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";

	meshLine(
		[
			[width - 6, midY - 96],
			[width - 96, midY - 96],
			[width - 96, midY + 96],
			[width - 6, midY + 96],
		],
		false,
	);

	ctx.stroke();

	ctx.lineWidth = 3;
	ctx.strokeStyle = "#fff";

	meshLine(
		[
			[width - 24, midY - 50],
			[width - 5, midY - 50],
			[width - 5, midY + 50],
			[width - 24, midY + 50],
		],
		false,
	);

	ctx.stroke();

	ctx.lineWidth = 1;
	ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";

	for (let n = -40; n <= 40; n += 16) {
		meshLine(
			[
				[width - 24, midY + n],
				[width - 5, midY + n],
			],
			false,
		);

		ctx.stroke();
	}

	for (let n = 0; n <= 3; n++) {
		meshLine(
			[
				[width - 20 + n * 5, midY - 50],
				[width - 20 + n * 5, midY + 50],
			],
			false,
		);

		ctx.stroke();
	}

	withMesh(startX, midY, () => {
		ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
		ctx.beginPath();
		ctx.arc(0, 8, 3, 0, Math.PI * 2);
		ctx.fill();
	});

	let ballX = startX;
	let ballY = midY;

	if (pen.phase === "flight") {
		const p = clamp((now - pen.t0) / 1100, 0, 1);
		const e = 1 - Math.pow(1 - p, 1.6);

		ballX = lerp(startX, targetX, e);
		ballY = lerp(midY, targetY, e) - Math.sin(p * Math.PI) * 18;

		if (p >= 1) {
			pen.phase = "goal";
		}
	}

	if (pen.phase === "goal") {
		ballX = targetX;
		ballY = targetY;
	}

	withMesh(ballX, ballY, () => {
		ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
		ctx.beginPath();
		ctx.arc(1.5, 2.5, 6, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.arc(0, 0, 6, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = "#222";
		ctx.beginPath();
		ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
		ctx.fill();
	});

	ctx.globalAlpha = 1;
}

const PENALTY = {
	name: "penalty",
	fixed: ["255,255,255", "255,235,59", "10,110,30"],
	edge: "rgba(255, 255, 255, 0.8)",
	draw: drawPenalty,
	color(t, nx, ny, s, time, i) {
		const stripe = Math.floor(i / 3) % 2 === 1;

		const r = (stripe ? 36 : 30) * s;
		const g = (stripe ? 134 : 118) * s + Math.max(0, s - 1.05) * 60;
		const b = (stripe ? 62 : 54) * s;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
};

/* ---------- Darts ---------- */

const dart = { phase: "idle", t0: 0 };

function drawDarts(strength) {
	const now = performance.now();

	const centerX = width / 2;
	const centerY = height / 2;

	ctx.globalAlpha = strength;

	withMesh(centerX, centerY, () => {
		for (let n = 0; n < 20; n++) {
			const a0 = (n / 20) * Math.PI * 2 - Math.PI / 20;
			const a1 = ((n + 1) / 20) * Math.PI * 2 - Math.PI / 20;

			ctx.fillStyle = n % 2 === 0 ? "rgba(0, 0, 0, 0.3)" : "rgba(245, 233, 208, 0.14)";

			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.arc(0, 0, 140, a0, a1);
			ctx.closePath();
			ctx.fill();
		}

		ctx.strokeStyle = "rgba(245, 233, 208, 0.25)";
		ctx.lineWidth = 1;

		[140, 128, 88, 76].forEach((radius) => {
			ctx.beginPath();
			ctx.arc(0, 0, radius, 0, Math.PI * 2);
			ctx.stroke();
		});

		ctx.fillStyle = "rgba(0, 160, 60, 0.5)";
		ctx.beginPath();
		ctx.arc(0, 0, 22, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = "rgba(230, 40, 50, 0.85)";
		ctx.beginPath();
		ctx.arc(0, 0, 9, 0, Math.PI * 2);
		ctx.fill();
	});

	if (dart.phase === "flight" || dart.phase === "stuck") {
		const startX = width * 0.06;
		const startY = height * 0.58;

		let x = centerX;
		let y = centerY;
		let angle = -0.35;

		if (dart.phase === "flight") {
			const p = clamp((now - dart.t0) / 900, 0, 1);

			x = lerp(startX, centerX, p);
			y = lerp(startY, centerY, p) - Math.sin(p * Math.PI) * 40;

			angle = Math.atan2(centerY - startY - ((Math.cos(p * Math.PI) * 40 * Math.PI) / 0.9) * 0.0, centerX - startX) + (p - 0.5) * 0.4;

			if (p >= 1) {
				dart.phase = "stuck";
			}
		}

		withMesh(x, y, () => {
			ctx.rotate(angle);

			ctx.strokeStyle = "#cfd8dc";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(-24, 0);
			ctx.stroke();

			ctx.fillStyle = "#e53935";
			ctx.beginPath();
			ctx.moveTo(-18, 0);
			ctx.lineTo(-28, -6);
			ctx.lineTo(-28, 6);
			ctx.closePath();
			ctx.fill();
		});
	}

	ctx.globalAlpha = 1;
}

const DARTS = {
	name: "darts",
	fixed: ["245,233,208", "255,204,102", "230,57,70"],
	edge: "rgba(245, 233, 208, 0.7)",
	draw: drawDarts,
	color(t, nx, ny, s) {
		const glint = Math.max(0, s - 1.05) * 50;

		return [clamp((62 + t * 10) * s + glint, 0, 255), clamp((16 + t * 4) * s + glint * 0.4, 0, 255), clamp((20 + t * 4) * s + glint * 0.4, 0, 255)];
	},
};

/* ---------- Poker ---------- */

const poker = { phase: "back", t0: 0 };

const POKER_FACES = ["A", "K", "Q", "J", "10"];

function drawPoker(strength) {
	const now = performance.now();

	ctx.globalAlpha = strength;

	for (let n = 0; n < 5; n++) {
		const cx = width / 2 + (n - 2) * 34;
		const cy = height - 26;

		let scaleX = 1;
		let face = false;

		if (poker.phase === "flip") {
			const p = clamp((now - poker.t0 - n * 180) / 500, 0, 1);

			scaleX = Math.max(0.05, Math.abs(Math.cos(p * Math.PI)));

			face = p > 0.5;
		}

		withMesh(cx, cy, () => {
			ctx.scale(scaleX, 1);

			ctx.fillStyle = face ? "#fff" : "#1d3f9c";
			ctx.fillRect(-14, -20, 28, 40);

			ctx.strokeStyle = face ? "#999" : "#fff";
			ctx.lineWidth = 1.5;
			ctx.strokeRect(-14, -20, 28, 40);

			if (face) {
				ctx.fillStyle = "#d32f2f";
				ctx.font = "bold 13px Georgia, serif";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";

				ctx.fillText(POKER_FACES[n], 0, -6);
				ctx.fillText("♥", 0, 9);
			} else {
				ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
				ctx.lineWidth = 1;

				ctx.beginPath();
				ctx.moveTo(-10, -16);
				ctx.lineTo(10, 16);
				ctx.moveTo(10, -16);
				ctx.lineTo(-10, 16);
				ctx.stroke();
			}
		});
	}

	ctx.globalAlpha = 1;
}

const POKER = {
	name: "poker",
	fixed: ["255,255,255", "255,213,79", "16,70,120"],
	edge: "rgba(255, 213, 79, 0.85)",
	draw: drawPoker,
	color(t, nx, ny, s, time, i, j) {
		const grain = 0.95 + 0.1 * hash2(i, j);

		const r = lerp(16, 12, t) * grain * s;
		const g = lerp(70, 56, t) * grain * s + Math.max(0, s - 1.05) * 50;
		const b = lerp(120, 100, t) * grain * s;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
};

/* ---------- Underwater ---------- */

const UNDERWATER = {
	name: "underwater",
	fixed: ["255,255,255", "140,235,255", "60,170,230"],
	edge: "rgba(160, 235, 255, 0.7)",
	wave: { amp: 8, speed: 0.8, pull: 0.06 },
	color(t, nx, ny, s, time) {
		const caustic = Math.max(0, Math.sin(t * 40 + time * 1.5 + nx * 8)) * 0.5;
		const foam = clamp((s - 1.05) * 3, 0, 1);
		const dark = clamp((1 - s) * 1.2, 0, 1);

		let r = lerp(0, 8, t);
		let g = lerp(48, 120, t) + caustic * 30;
		let b = lerp(108, 160, t) + caustic * 34;

		r = lerp(r, 255, foam * 0.6) * (1 - dark * 0.5);
		g = lerp(g, 255, foam * 0.6) * (1 - dark * 0.5);
		b = lerp(b, 255, foam * 0.6) * (1 - dark * 0.5);

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
};

/* ---------- VHS ---------- */

function drawVhsOsd(strength, time) {
	ctx.globalAlpha = strength;

	withMesh(0, 0, () => {
		ctx.font = "26px VT323, 'Courier New', monospace";
		ctx.textBaseline = "middle";

		const outline = (text, x, y, align) => {
			ctx.textAlign = align;

			ctx.fillStyle = "rgba(255, 0, 80, 0.7)";
			ctx.fillText(text, x - 1.5, y);

			ctx.fillStyle = "rgba(0, 220, 255, 0.7)";
			ctx.fillText(text, x + 1.5, y);

			ctx.fillStyle = "#fff";
			ctx.fillText(text, x, y);
		};

		outline("PLAY ▶", 16, 22, "left");

		const seconds = Math.floor(time);
		const stamp = String(Math.floor(seconds / 3600) % 24).padStart(2, "0") + ":" + String(Math.floor(seconds / 60) % 60).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");

		outline(stamp, width - 16, 22, "right");
	});

	ctx.globalAlpha = 1;
}

const VHS = {
	name: "vhs",
	fixed: ["255,255,255", "0,229,255", "255,77,157"],
	edge: "rgba(255, 255, 255, 0.4)",
	draw: drawVhsOsd,
	color(t, nx, ny, s, time, i, j) {
		const noise = hash2(i + Math.floor(time * 10), j);
		const band = Math.sin(j * 0.9 - time * 2.2) > 0.92 ? 26 : 0;

		const r = (22 + noise * 14 + band) * s;
		const g = (20 + noise * 12 + band) * s;
		const b = (32 + noise * 18 + band) * s;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
};

/* ---------- Cassette ---------- */

function drawCassette(strength, time) {
	ctx.globalAlpha = strength;

	const spin = time * 1.6;

	[width * 0.12, width * 0.88].forEach((x, index) => {
		withMesh(x, 22, () => {
			ctx.fillStyle = "rgba(42, 33, 24, 0.85)";
			ctx.beginPath();
			ctx.arc(0, 0, 15, 0, Math.PI * 2);
			ctx.fill();

			ctx.fillStyle = "#e8dcc0";
			ctx.beginPath();
			ctx.arc(0, 0, 6, 0, Math.PI * 2);
			ctx.fill();

			ctx.rotate(spin * (index === 0 ? 1 : 1.15));

			ctx.strokeStyle = "rgba(42, 33, 24, 0.9)";
			ctx.lineWidth = 2;

			for (let n = 0; n < 6; n++) {
				ctx.rotate(Math.PI / 3);
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(0, 6);
				ctx.stroke();
			}
		});
	});

	meshLine(
		[
			[width * 0.12 + 15, 22],
			[width * 0.88 - 15, 22],
		],
		false,
	);

	ctx.strokeStyle = "rgba(60, 40, 20, 0.5)";
	ctx.lineWidth = 2;
	ctx.stroke();

	withMesh(width / 2, 22, () => {
		ctx.fillStyle = "rgba(42, 33, 24, 0.75)";
		ctx.font = "bold 11px 'Courier New', monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.fillText("SIDE A · volume 1 · meowlody", 0, -8);
	});

	ctx.globalAlpha = 1;
}

const CASSETTE = {
	name: "cassette",
	fixed: ["42,33,24", "200,50,42", "90,70,50"],
	edge: "rgba(60, 40, 20, 0.8)",
	draw: drawCassette,
	color(t, nx, ny, s, time, i, j) {
		if (j >= rows - 3) {
			const base = j === rows - 3 ? [230, 120, 40] : [200, 50, 40];

			return [clamp(base[0] * s, 0, 255), clamp(base[1] * s, 0, 255), clamp(base[2] * s, 0, 255)];
		}

		const r = lerp(238, 224, t) * s;
		const g = lerp(226, 210, t) * s;
		const b = lerp(196, 176, t) * s;

		return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
	},
};

const ALL_THEMES = [...THEMES, RETRO, TERMINAL, GAMEBOY, BLUEPRINT, NEWSPAPER, FALLOUT, KEYBOARD, VIRTUALBOY, WATER, MINECRAFT, LEGO, TETRIS, CLOCK, RUNESCAPE, GEMS, CASINO, XP, INVADERS, BSOD, NOTFOUND, CHESS, MINIGOLF, AIRHOCKEY, BOWLING, PENALTY, DARTS, POKER, UNDERWATER, VHS, CASSETTE];

const BASICS_LINES = {
	ask: "Meow ik heb geen verdere thema inspiratie meer,\nterug naar de basics",
	after: "meow. basics",
};

const usedThemes = new Set();

const THEME_SCENES = {
	bowling: async (star) => {
		bowl.phase = "idle";

		star.element.classList.remove("mega");

		await moveCat(star, 4, 58);

		const fans = spawnAt([
			[93, 22],
			[93, 78],
			[50, 9],
			[50, 93],
		]);

		await sleep(1400);

		say(star, "meow. strike?");

		await sleep(900);

		bowl.phase = "roll";
		bowl.t0 = performance.now();

		await sleep(1700);

		cheerAll(fans, star, "meow. STRIKE");

		await sleep(3800);
	},

	penalty: async (star) => {
		pen.phase = "idle";

		star.element.classList.remove("mega");

		await moveCat(star, 4, 60);

		const [keeper, ...fans] = spawnAt([
			[94, 50],
			[50, 9],
			[50, 93],
			[22, 9],
		]);

		await sleep(1400);

		say(star, "meow. penalty");

		await sleep(1000);

		pen.phase = "flight";
		pen.t0 = performance.now();

		await sleep(250);

		keeper.element.classList.add("dive");

		await sleep(1000);

		cheerAll(fans, star, "meow. GOAL");

		await sleep(700);

		say(keeper, "meow. ik zag hem niet aankomen");

		await sleep(3200);
	},

	darts: async (star) => {
		dart.phase = "idle";

		star.element.classList.remove("mega");

		await moveCat(star, 5, 58);

		const fans = spawnAt([
			[93, 28],
			[93, 74],
			[50, 9],
			[50, 93],
		]);

		await sleep(1400);

		say(fans[0], "meow. 3");

		await sleep(1000);

		say(fans[1], "meow. 2");

		await sleep(1000);

		say(fans[2], "meow. 1");

		await sleep(1000);

		dart.phase = "flight";
		dart.t0 = performance.now();

		await sleep(1200);

		cheerAll(fans, star, "meow. bullseye");

		await sleep(3600);
	},

	poker: async (star) => {
		poker.phase = "back";

		star.element.classList.remove("mega");

		await moveCat(star, 6, 54);

		const others = spawnAt([
			[93, 28],
			[93, 74],
			[50, 9],
		]);

		await sleep(1400);

		say(others[0], "meow. pass");

		await sleep(1100);

		say(others[1], "meow. call");

		await sleep(1100);

		say(others[2], "meow. raise");

		await sleep(1300);

		say(star, "meow. all in");

		await sleep(1100);

		poker.phase = "flip";
		poker.t0 = performance.now();

		await sleep(2000);

		cheerAll(others, star, "meow. royal flush");

		await sleep(3600);
	},

	minigolf: async (star) => {
		golf.phase = "idle";

		star.element.classList.remove("mega");

		await moveCat(star, SCENE_PLAYERS[0][0], SCENE_PLAYERS[0][1]);

		const fans = SCENE_PLAYERS.slice(1).map(([px, py]) => {
			const fan = spawnCat();

			fan.px = px;
			fan.py = py;

			return fan;
		});

		await sleep(1400);

		say(star, "meow. fore!");

		await sleep(1000);

		golf.phase = "flight";
		golf.t0 = performance.now();

		await sleep(2100);

		golf.phase = "sunk";

		star.element.classList.add("cheer");

		fans.forEach((fan, index) => {
			fan.element.classList.add("cheer");

			setTimeout(() => say(fan, pickRandom(["meow!", "MEOW!", "meow meow!", "meow. wauw"])), index * 250);
		});

		say(star, "meow. hole in one");

		await sleep(3800);
	},

	airhockey: async (star) => {
		star.element.classList.remove("mega");

		await moveCat(star, 5, 50);

		const rival = spawnCat();

		rival.px = 95;
		rival.py = 50;

		await sleep(1400);

		resetHockey(true);

		say(star, "meow. serve");

		for (let n = 0; n < 200 && hockey.phase !== "goal"; n++) {
			await sleep(100);
		}

		star.element.classList.add("cheer");

		say(star, "meow. GOAL!");

		await sleep(1000);

		say(rival, "meow... oké");

		await sleep(3000);
	},

	runescape: async (star) => {
		const left = spawnCat();
		const right = spawnCat();

		left.px = 20;
		left.py = 40;

		right.px = 80;
		right.py = 40;

		await sleep(1400);

		say(left, "meow. wat is je fishing level?");

		await sleep(2800);

		say(star, "meow. 69");

		await sleep(2400);

		say(right, "meow. nice");

		await sleep(2600);
	},
};

function nextTheme() {
	let remaining = ALL_THEMES.filter((theme) => !usedThemes.has(theme.name));

	if (remaining.length === 0 && themeState.current === null) {
		usedThemes.clear();

		remaining = ALL_THEMES;
	}

	if (remaining.length === 0) {
		return null;
	}

	return pickRandom(remaining);
}

function waveWeight() {
	let weight = 0;

	if (themeState.current && themeState.current.wave) {
		weight += themeState.mix;
	}

	if (themeState.previous && themeState.previous.wave && themeState.mix < 1) {
		weight += 1 - themeState.mix;
	}

	return Math.min(weight, 1);
}

function applyWaves(time) {
	const wave = (themeState.current && themeState.current.wave) || (themeState.previous && themeState.previous.wave);

	const weight = waveWeight();

	if (!wave || weight <= 0.01) {
		return;
	}

	for (let k = 0; k < count; k++) {
		if (pinned[k]) {
			continue;
		}

		const px = rx[k];
		const py = ry[k];

		const target = weight * wave.amp * (Math.sin(px * 0.028 + py * 0.012 - time * wave.speed) + 0.6 * Math.sin(px * 0.011 - py * 0.034 + time * wave.speed * 1.3));

		z[k] += (target - z[k]) * wave.pull;
	}
}

const THEME_LINES = {
	holographic: { ask: "Meow ik wil glitter zien", after: "meow. glimmend" },
	aurora: { ask: "Meow ik wil noorderlicht zien", after: "meow. mooi" },
	retrowave: { ask: "Meow ik wil een ander thema zien", after: "meow. beter" },
	terminal: { ask: "Meow ik wil iets groens zien", after: "meow. sudo meow" },
	gameboy: { ask: "Meow ik wil pixels zien", after: "meow. press start" },
	blueprint: { ask: "Meow ik wil een tekening zien", after: "meow. dit is een bouwtekening" },
	newspaper: { ask: "Meow ik wil in de krant", after: "KAT VRAAGT ANDER THEMA" },
	fallout: { ask: "Meow ik wil naar de vault", after: "meow. war never changes" },
	keyboard: { ask: "Meow ik wil muziek maken", after: "meow. do re mi miauw" },
	virtualboy: { ask: "Meow ik wil rood zien", after: "meow. ik heb hoofdpijn" },
	water: { ask: "Meow ik wil water zien", after: "meow. ik blijf wel droog" },
	minecraft: { ask: "Meow ik wil blokjes zien", after: "meow. ssssss" },
	lego: { ask: "Meow ik wil bouwen", after: "meow. au, een steentje" },
	tetris: { ask: "Meow ik wil blokken zien vallen", after: "meow. lijn!" },
	clock: { ask: "Meow ik wil weten hoe laat het is", after: "meow. etenstijd" },
	runescape: { ask: "Meow ik wil de grind zien", after: "meow. level 99 miauwen" },
	gems: { ask: "Meow ik wil iets glimmends zien", after: "meow. ik ben rijk" },
	casino: { ask: "Meow ik wil gokken", after: "meow. alles op rood" },
	xp: { ask: "Meow ik wil Clippy zien", after: "meow. het lijkt alsof je een brief schrijft" },
	invaders: { ask: "Meow ik wil een highscore", after: "meow. game over" },
	bsod: { ask: "Meow ik wil een fout zien", after: "meow. er is een fout opgetreden" },
	notfound: { ask: "Meow ik wil een lege pagina zien", after: "meow. precies" },
	chess: { ask: "Meow ik wil schaken", after: "meow. schaakmat" },
	minigolf: { ask: "Meow ik wil golfen", after: "meow. makkelijk" },
	airhockey: { ask: "Meow ik wil air hockey spelen", after: "meow. 1-0" },
	bowling: { ask: "Meow ik wil bowlen", after: "meow. geen kegels meer" },
	penalty: { ask: "Meow ik wil voetballen", after: "meow. gewoon in de hoek" },
	darts: { ask: "Meow ik wil darten", after: "meow. 50 punten" },
	poker: { ask: "Meow ik wil pokeren", after: "meow. ik bluf nooit" },
	underwater: { ask: "Meow ik wil duiken", after: "meow. ik wil naar boven" },
	vhs: { ask: "Meow ik wil terugspoelen", after: "meow. be kind, rewind" },
	cassette: { ask: "Meow ik wil een mixtape", after: "meow. kant B" },
};

const themeState = {
	current: null,
	previous: null,
	mix: 1,
};

const CAT_FACES = ["🐈", "🐈‍⬛", "🐈", "🐈‍⬛", "🐈", "🐈‍⬛"];

const OPENERS = ["meow", "meow?", "miauw", "meow meow", "meow ik ben een kat"];

const ANSWERS_TO_QUESTION = ["meow.", "meow meow", "meow ik ben een poes", "MEOW"];

const ANSWERS_TO_SHOUT = ["meow?!", "kat geluid", "meow meow?"];

const ANSWERS_GENERIC = ["meow", "meow?", "mew", "meow meow meow", "MEOW!"];

const GOODBYES = ["meow. doei", "meow, doei", "meow. tot later", "meow. ik ga", "meow, dag"];

const BRABANTS_GOODBYES = ["meowdoe!", "meowdoe, hè", "meowdoe, en tot gauw"];

const CHORUS_LINES = ["MEOW", "meow.", "meow meow meow"];

const STARE_LINES = ["meow?", "meow."];

const PERSONAL_LINES = [
	() => "meow. je bent er nog",
	() => "meow. je kijkt al een tijdje naar een papiertje",
	() => {
		const minutes = Math.floor(performance.now() / 60000);

		return minutes >= 1 ? `meow. al ${minutes} minuut${minutes > 1 ? "en" : ""} hier` : "meow. ik zeg niks, maar ik zie je wel";
	},
];

const party = {
	element: null,
	cats: [],
	active: false,
	ending: false,
	timers: [],
	busy: false,
};

const mouse = { x: 0, y: 0, seen: false };

window.addEventListener("pointermove", (event) => {
	mouse.x = event.clientX;
	mouse.y = event.clientY;
	mouse.seen = true;
});

function partyLive() {
	return party.active && !party.ending;
}

function placeCat(cat) {
	let best = null;
	let bestGap = -1;

	for (let attempt = 0; attempt < 40; attempt++) {
		const px = 8 + Math.random() * 84;
		const py = 14 + Math.random() * 76;

		let gap = Infinity;

		party.cats.forEach((other) => {
			if (other !== cat) {
				gap = Math.min(gap, Math.hypot(other.px - px, (other.py - py) * 1.6));
			}
		});

		if (gap > bestGap) {
			bestGap = gap;
			best = { px, py };
		}

		if (gap >= CONFIG.partyMinGap) {
			break;
		}
	}

	cat.px = best.px;
	cat.py = best.py;
}

function spawnCat() {
	const element = document.createElement("div");
	element.className = "party-cat";

	const flip = document.createElement("span");
	flip.className = "party-flip";

	const face = document.createElement("span");
	face.className = "party-face";
	face.textContent = pickRandom(CAT_FACES);

	flip.appendChild(face);
	element.appendChild(flip);

	party.element.appendChild(element);

	const cat = { element, flip, px: 50, py: 50, dir: 1 };

	party.cats.push(cat);

	placeCat(cat);

	requestAnimationFrame(() => {
		requestAnimationFrame(() => element.classList.add("in"));
	});

	return cat;
}

function orientCats() {
	if (!partyLive() || !mouse.seen) {
		return;
	}

	party.cats.forEach((cat) => {
		const rect = cat.element.getBoundingClientRect();

		const dx = mouse.x - (rect.left + rect.width / 2);
		const dy = mouse.y - (rect.top + rect.height / 2);

		if (Math.abs(dx) > 14) {
			cat.dir = dx > 0 ? -1 : 1;
		}

		const tilt = clamp((-dy / (Math.abs(dx) + 60)) * 30, -14, 14);

		cat.flip.style.transform = `scaleX(${cat.dir}) rotate(${tilt}deg)`;
	});
}

function say(cat, text) {
	const float = document.createElement("span");
	float.className = "party-float";
	float.textContent = text;

	float.style.setProperty("--drift", `${Math.round((Math.random() - 0.5) * 24)}px`);

	float.addEventListener("animationend", () => float.remove());

	cat.element.appendChild(float);

	cat.element.classList.remove("talking");

	void cat.element.offsetWidth;

	cat.element.classList.add("talking");
}

function replyTo(previous) {
	if (previous.endsWith("?")) {
		return pickRandom(ANSWERS_TO_QUESTION);
	}

	if (previous === previous.toUpperCase() || previous.endsWith("!")) {
		return pickRandom(ANSWERS_TO_SHOUT);
	}

	return pickRandom(ANSWERS_GENERIC);
}

async function hop(cat) {
	if (!partyLive()) {
		return;
	}

	cat.element.classList.remove("in");

	await sleep(420);

	if (!partyLive()) {
		return;
	}

	placeCat(cat);

	await sleep(60);

	if (partyLive()) {
		cat.element.classList.add("in");
	}
}

async function rareEvent() {
	const kind = pickRandom(["chorus", "giant", "stare"]);

	if (kind === "chorus") {
		const text = pickRandom(CHORUS_LINES);

		party.cats.forEach((cat) => say(cat, text));

		await sleep(3000);

		return;
	}

	if (kind === "giant") {
		const cat = pickRandom(party.cats);

		cat.element.classList.add("giant");

		await sleep(700);

		say(cat, "meow.");

		await sleep(3800);

		cat.element.classList.remove("giant");

		await sleep(800);

		return;
	}

	party.cats.forEach((cat) => cat.element.classList.add("stare"));

	await sleep(3800);

	party.cats.forEach((cat) => cat.element.classList.remove("stare"));

	if (partyLive()) {
		say(pickRandom(party.cats), pickRandom(STARE_LINES));
	}

	await sleep(2200);
}

async function conversation() {
	while (partyLive()) {
		if (Math.random() < CONFIG.rareChance) {
			await rareEvent();

			await sleep(randomBetween(CONFIG.partyPause));

			continue;
		}

		const lines = 2 + Math.floor(Math.random() * 4);

		let speaker = pickRandom(party.cats);
		let text = pickRandom(OPENERS);

		for (let line = 0; line < lines && partyLive(); line++) {
			say(speaker, text);

			await sleep(randomBetween(CONFIG.partyLineGap));

			if (!partyLive()) {
				return;
			}

			const others = party.cats.filter((cat) => cat !== speaker);

			speaker = pickRandom(others);
			text = replyTo(text);
		}

		await sleep(randomBetween(CONFIG.partyPause));

		const hops = 1 + Math.floor(Math.random() * 2);

		for (let n = 0; n < hops && partyLive(); n++) {
			hop(pickRandom(party.cats));

			await sleep(250);
		}

		await sleep(600);
	}
}

function schedulePersonal() {
	[18000, 40000, 62000].forEach((delay, index) => {
		party.timers.push(
			setTimeout(async () => {
				if (!partyLive()) {
					return;
				}

				const cat = pickRandom(party.cats);

				cat.element.classList.add("stare");

				await sleep(600);

				if (partyLive()) {
					say(cat, PERSONAL_LINES[index]());
				}

				await sleep(2600);

				cat.element.classList.remove("stare");
			}, delay),
		);
	});
}

async function endCatParty() {
	if (!partyLive()) {
		return;
	}

	party.ending = true;

	party.timers.forEach((id) => clearTimeout(id));
	party.timers = [];

	const order = [...party.cats].sort(() => Math.random() - 0.5);

	for (const cat of order) {
		cat.element.classList.remove("stare", "giant");

		say(cat, Math.random() < 0.4 ? pickRandom(BRABANTS_GOODBYES) : pickRandom(GOODBYES));

		await sleep(900 + Math.random() * 500);

		cat.element.classList.remove("in");

		await sleep(350);
	}

	await sleep(3400);

	party.element.remove();

	party.element = null;
	party.cats = [];

	party.ending = false;
	party.active = false;
}

async function themeSequence(theme) {
	if (party.busy) {
		return;
	}

	party.busy = true;

	setCatReady(false);

	const lines = theme ? THEME_LINES[theme.name] || { ask: "Meow ik wil een ander thema zien", after: "meow. beter" } : BASICS_LINES;

	let star = null;

	if (party.active) {
		party.ending = true;

		party.timers.forEach((id) => clearTimeout(id));
		party.timers = [];

		party.cats.forEach((cat) => cat.element.classList.remove("giant", "stare"));

		star = party.cats.length ? pickRandom(party.cats) : null;

		for (const cat of party.cats) {
			if (cat !== star) {
				cat.element.classList.remove("in");

				await sleep(130);
			}
		}

		if (star) {
			star.element.classList.remove("in");

			await sleep(450);
		}
	} else {
		party.active = true;
		party.ending = true;

		party.element = document.createElement("div");
		party.element.className = "cat-party";

		clothContent.appendChild(party.element);
	}

	if (!star) {
		star = spawnCat();
	}

	star.px = 50;
	star.py = 52;

	star.flip.style.transform = "scaleX(1) rotate(0deg)";

	star.element.classList.add("mega");

	await sleep(80);

	star.element.classList.add("in");

	await sleep(1100);

	say(star, lines.ask);

	await sleep(3200);

	applyTheme(theme);

	if (!theme) {
		usedThemes.clear();
	}

	await sleep(2800);

	if (theme && THEME_SCENES[theme.name]) {
		await THEME_SCENES[theme.name](star);
	}

	say(star, lines.after);

	await sleep(3600);

	party.cats.forEach((cat) => cat.element.classList.remove("in"));

	await sleep(3800);

	party.element.remove();

	party.element = null;
	party.cats = [];

	party.ending = false;
	party.active = false;
	party.busy = false;

	setCatReady(true);
}

async function startCatParty() {
	if (party.active) {
		return;
	}

	party.active = true;
	party.ending = false;

	party.element = document.createElement("div");
	party.element.className = "cat-party";

	clothContent.appendChild(party.element);

	party.timers.push(setInterval(orientCats, 120));

	for (let n = 0; n < CONFIG.partyCats; n++) {
		if (!partyLive()) {
			return;
		}

		spawnCat();

		await sleep(CONFIG.partySpawnEvery);
	}

	await sleep(700);

	if (!partyLive()) {
		return;
	}

	schedulePersonal();

	party.timers.push(setTimeout(endCatParty, randomBetween(CONFIG.partyDuration)));

	conversation();
}

function themeColor(theme, t, nx, ny, s, time, i, j) {
	if (!theme) {
		const base = baseColor(t);

		return [Math.min(255, base[0] * s), Math.min(255, base[1] * s), Math.min(255, base[2] * s)];
	}

	return theme.color(t, nx, ny, s, time, i, j);
}

function setTextColors(colors) {
	const root = document.documentElement.style;

	root.setProperty("--text-a", `rgb(${colors[0]})`);
	root.setProperty("--text-b", `rgb(${colors[1]})`);
	root.setProperty("--text-c", `rgb(${colors[2]})`);

	root.setProperty("--text-a-soft", `rgba(${colors[0]}, 0.55)`);
	root.setProperty("--text-b-soft", `rgba(${colors[1]}, 0.55)`);
	root.setProperty("--text-c-soft", `rgba(${colors[2]}, 0.55)`);
}

function updateTextColors(time) {
	if (!themeState.current) {
		return;
	}

	if (themeState.current.fixed) {
		setTextColors(themeState.current.fixed);

		return;
	}

	const row = (rows - 1) >> 1;

	const fractions = [0.2, 0.55, 0.9];

	const colors = fractions.map((fraction) => {
		const col = Math.round((cols - 1) * fraction);
		const k = row * cols + col;

		const t = (col / (cols - 1) + row / (rows - 1)) / 2;

		const rgb = themeState.current.color(t, nxs[k], nys[k], shade[k], time);

		const vivid = hslToRgb(rgbToHue(rgb[0], rgb[1], rgb[2]), 1, 0.5);

		return `${vivid[0] | 0},${vivid[1] | 0},${vivid[2] | 0}`;
	});

	setTextColors(colors);
}

function applyTheme(theme) {
	themeState.previous = themeState.current;
	themeState.current = theme;
	themeState.mix = 0;

	if (theme) {
		document.documentElement.dataset.theme = theme.name;

		usedThemes.add(theme.name);
	} else {
		delete document.documentElement.dataset.theme;
	}

	updateTextColors(performance.now() / 1000);

	for (let k = 0; k < count; k++) {
		if (!pinned[k]) {
			z[k] += (Math.random() - 0.5) * (theme ? 6 : 3);
		}
	}

	requestAnimationFrame(measureWarpTargets);
}

function resetTheme() {
	if (!themeState.current || party.busy) {
		return;
	}

	applyTheme(null);

	endCatParty();
}

function changeTheme() {
	if (party.busy) {
		return;
	}

	let options = THEMES.filter((theme) => theme !== themeState.current && !usedThemes.has(theme.name));

	if (options.length === 0) {
		options = THEMES.filter((theme) => theme !== themeState.current);
	}

	applyTheme(pickRandom(options));

	startCatParty();

	setCatReady(true);
}

function build() {
	const rect = cloth.getBoundingClientRect();

	offsetX = rect.left;
	offsetY = rect.top;

	width = rect.width;
	height = rect.height;

	cols = Math.max(4, Math.round(width / CONFIG.spacing) + 1);
	rows = Math.max(4, Math.round(height / CONFIG.spacing) + 1);

	count = cols * rows;

	rx = new Float32Array(count);
	ry = new Float32Array(count);

	for (let j = 0; j < rows; j++) {
		for (let i = 0; i < cols; i++) {
			const k = j * cols + i;

			rx[k] = (i / (cols - 1)) * width;
			ry[k] = (j / (rows - 1)) * height;
		}
	}

	x = new Float32Array(rx);
	y = new Float32Array(ry);
	z = new Float32Array(count);

	qx = new Float32Array(rx);
	qy = new Float32Array(ry);
	qz = new Float32Array(count);

	sx = new Float32Array(rx);
	sy = new Float32Array(ry);

	shade = new Float32Array(count).fill(1);
	nxs = new Float32Array(count);
	nys = new Float32Array(count);

	pinned = new Uint8Array(count);

	cluster = [];

	state.resetAt = 0;
	state.resetStart = 0;

	const list = [];

	const add = (a, b, k) => list.push([a, b, k]);

	for (let j = 0; j < rows; j++) {
		for (let i = 0; i < cols; i++) {
			const k = j * cols + i;

			if (i < cols - 1) add(k, k + 1, 1);
			if (j < rows - 1) add(k, k + cols, 1);

			if (i < cols - 1 && j < rows - 1) {
				add(k, k + cols + 1, CONFIG.shearStiffness);
				add(k + 1, k + cols, CONFIG.shearStiffness);
			}

			if (i < cols - 2) add(k, k + 2, CONFIG.bendStiffness);
			if (j < rows - 2) add(k, k + 2 * cols, CONFIG.bendStiffness);
		}
	}

	cA = new Uint32Array(list.length);
	cB = new Uint32Array(list.length);
	cLen = new Float32Array(list.length);
	cK = new Float32Array(list.length);

	list.forEach(([a, b, k], index) => {
		cA[index] = a;
		cB[index] = b;
		cK[index] = k;
		cLen[index] = Math.hypot(rx[b] - rx[a], ry[b] - ry[a]);
	});

	const midCol = (cols - 1) >> 1;
	const midRow = (rows - 1) >> 1;

	const left = midRow * cols;
	const right = midRow * cols + cols - 1;
	const top = midCol;
	const bottom = (rows - 1) * cols + midCol;

	anchors = {
		left,
		right,
		top,
		bottom,
		restCx: (rx[left] + rx[right] + rx[top] + rx[bottom]) / 4,
		restCy: (ry[left] + ry[right] + ry[top] + ry[bottom]) / 4,
		spanX: rx[right] - rx[left],
		spanY: ry[bottom] - ry[top],
	};

	measureWarpTargets();
}

const fxCanvas = document.getElementById("fxCanvas");
const fxCtx = fxCanvas.getContext("2d");

const RAIN = {
	size: 16,
	chars: "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ0123456789",
	drops: [],
	frame: 0,
	lastActive: 0,
	dirty: false,
	snippets: [],
	lastSpawn: 0,
};

const RAIN_CODE = ["const cat = 'meow';", "if (cat) meow();", "npm run meow", "git commit -m 'meow'", "while (true) { meow(); }", "SELECT * FROM cats;", "sudo meow", "return 'meow';", "<cat>meow</cat>", "meow.exe", "import { cat } from 'meow'", "console.log('meow')"];

function resizeFx() {
	fxCanvas.width = Math.round(window.innerWidth * dpr);
	fxCanvas.height = Math.round(window.innerHeight * dpr);

	const columns = Math.ceil(window.innerWidth / RAIN.size);

	RAIN.drops = Array.from({ length: columns }, () => -Math.random() * 40);
}

function drawRain() {
	const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	RAIN.frame++;

	if (RAIN.frame % 3 !== 0 && !reduce) {
		return;
	}

	fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

	if (reduce) {
		fxCtx.fillStyle = "#000";
		fxCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);

		return;
	}

	fxCtx.fillStyle = "rgba(0, 6, 2, 0.14)";
	fxCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);

	fxCtx.font = RAIN.size + "px monospace";

	for (let i = 0; i < RAIN.drops.length; i++) {
		const y = RAIN.drops[i] * RAIN.size;
		const char = RAIN.chars[Math.floor(Math.random() * RAIN.chars.length)];

		fxCtx.fillStyle = "#2dff7a";
		fxCtx.fillText(char, i * RAIN.size, y);

		if (y > window.innerHeight && Math.random() > 0.975) {
			RAIN.drops[i] = 0;
		} else {
			RAIN.drops[i]++;
		}
	}

	const now = performance.now();

	if (now - RAIN.lastSpawn > 900 && RAIN.snippets.length < 6) {
		RAIN.lastSpawn = now;

		RAIN.snippets.push({
			text: pickRandom(RAIN_CODE),
			x: Math.random() * Math.max(1, window.innerWidth - 220),
			y: -10,
			speed: 5 + Math.random() * 5,
		});
	}

	fxCtx.font = "12px monospace";
	fxCtx.fillStyle = "#9dffc0";

	RAIN.snippets = RAIN.snippets.filter((snippet) => {
		snippet.y += snippet.speed;

		fxCtx.fillText(snippet.text, snippet.x, snippet.y);

		return snippet.y < window.innerHeight + 20;
	});
}

const FX = {
	notes: [],
	pieces: [],
	lastNote: 0,
	lastPiece: 0,
};

const FX_NOTES = ["♪", "♫", "♩", "♬"];

const TETROMINOES = [
	[
		[0, 0],
		[1, 0],
		[2, 0],
		[3, 0],
	],
	[
		[0, 0],
		[1, 0],
		[0, 1],
		[1, 1],
	],
	[
		[0, 0],
		[1, 0],
		[2, 0],
		[1, 1],
	],
	[
		[1, 0],
		[2, 0],
		[0, 1],
		[1, 1],
	],
	[
		[0, 0],
		[1, 0],
		[1, 1],
		[2, 1],
	],
	[
		[0, 0],
		[0, 1],
		[1, 1],
		[2, 1],
	],
	[
		[2, 0],
		[0, 1],
		[1, 1],
		[2, 1],
	],
];

const fxState = { theme: null, time: 0, dirty: false };

function fxReduced() {
	return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function drawNotes(now) {
	fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
	fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

	if (fxReduced()) {
		return;
	}

	if (now - FX.lastNote > 150 && FX.notes.length < 64) {
		FX.lastNote = now;

		FX.notes.push({
			x: bandX(30),
			y: -30,
			vy: 0.6 + Math.random() * 1.2,
			size: 18 + Math.random() * 20,
			glyph: pickRandom(FX_NOTES),
			sway: Math.random() * Math.PI * 2,
			swaySpeed: 0.01 + Math.random() * 0.02,
			alpha: 0.25 + Math.random() * 0.35,
			red: Math.random() < 0.25,
		});
	}

	fxCtx.textBaseline = "middle";

	FX.notes = FX.notes.filter((note) => {
		note.y += note.vy;
		note.sway += note.swaySpeed;

		fxCtx.font = note.size + "px serif";
		fxCtx.fillStyle = note.red ? "rgba(214, 58, 70, " + (note.alpha + 0.2) + ")" : "rgba(255, 255, 255, " + note.alpha + ")";

		fxCtx.fillText(note.glyph, note.x + Math.sin(note.sway) * 24, note.y);

		return note.y < window.innerHeight + 40;
	});
}

function bandX(pad) {
	const left = offsetX;
	const right = window.innerWidth - (offsetX + width);

	const sides = [];

	if (left > pad * 2) {
		sides.push([pad, left - pad]);
	}

	if (right > pad * 2) {
		sides.push([offsetX + width + pad, window.innerWidth - pad]);
	}

	const range = sides.length ? pickRandom(sides) : [0, window.innerWidth];

	return range[0] + Math.random() * (range[1] - range[0]);
}

function pieceSpawnX(size) {
	const left = offsetX;
	const right = window.innerWidth - (offsetX + width);

	const sides = [];

	if (left - 7 * size > 0) {
		sides.push([3 * size, left - 4 * size]);
	}

	if (right - 7 * size > 0) {
		sides.push([offsetX + width + 3 * size, window.innerWidth - 4 * size]);
	}

	const range = sides.length ? pickRandom(sides) : [3 * size, window.innerWidth - 4 * size];

	return Math.floor((range[0] + Math.random() * Math.max(0, range[1] - range[0])) / size) * size;
}

function drawPieces(now) {
	fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
	fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

	if (fxReduced()) {
		return;
	}

	const size = 28;

	if (now - FX.lastPiece > 280 && FX.pieces.length < 22) {
		FX.lastPiece = now;

		let cells = pickRandom(TETROMINOES).map((cell) => cell.slice());

		const turns = Math.floor(Math.random() * 4);

		for (let n = 0; n < turns; n++) {
			cells = cells.map(([cx, cy]) => [-cy, cx]);
		}

		FX.pieces.push({
			cells,
			color: pickRandom(TETRIS_COLORS),
			x: pieceSpawnX(size),
			y: -size * 4,
			vy: 1.2 + Math.random() * 1.2,
		});
	}

	FX.pieces = FX.pieces.filter((piece) => {
		piece.y += piece.vy;

		const [r, g, b] = piece.color;

		piece.cells.forEach(([cx, cy]) => {
			const px = piece.x + cx * size;
			const py = piece.y + cy * size;

			fxCtx.fillStyle = "rgba(" + r + "," + g + "," + b + ",0.5)";
			fxCtx.fillRect(px + 1, py + 1, size - 2, size - 2);

			fxCtx.fillStyle = "rgba(255, 255, 255, 0.28)";
			fxCtx.fillRect(px + 1, py + 1, size - 2, 4);
			fxCtx.fillRect(px + 1, py + 1, 4, size - 2);

			fxCtx.fillStyle = "rgba(0, 0, 0, 0.25)";
			fxCtx.fillRect(px + size - 5, py + 1, 4, size - 2);
			fxCtx.fillRect(px + 1, py + size - 5, size - 2, 4);
		});

		return piece.y < window.innerHeight + size * 4;
	});
}

const SUITS = { items: [], last: 0 };

const SUIT_GLYPHS = ["♠", "♥", "♦", "♣", "♥", "♦", "$"];

function drawSuits(now) {
	fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
	fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

	if (fxReduced()) {
		return;
	}

	if (now - SUITS.last > 300 && SUITS.items.length < 30) {
		SUITS.last = now;

		SUITS.items.push({
			x: bandX(30),
			y: -30,
			vy: 0.8 + Math.random() * 1.2,
			size: 22 + Math.random() * 22,
			glyph: pickRandom(SUIT_GLYPHS),
			sway: Math.random() * Math.PI * 2,
			swaySpeed: 0.01 + Math.random() * 0.02,
			alpha: 0.25 + Math.random() * 0.3,
		});
	}

	fxCtx.textBaseline = "middle";

	SUITS.items = SUITS.items.filter((item) => {
		item.y += item.vy;
		item.sway += item.swaySpeed;

		let color = "255, 255, 255";

		if (item.glyph === "♥" || item.glyph === "♦") {
			color = "255, 70, 70";
		} else if (item.glyph === "$") {
			color = "255, 215, 90";
		}

		fxCtx.font = "bold " + item.size + "px serif";
		fxCtx.fillStyle = "rgba(" + color + "," + item.alpha + ")";

		fxCtx.fillText(item.glyph, item.x + Math.sin(item.sway) * 20, item.y);

		return item.y < window.innerHeight + 40;
	});
}

const INV_SPRITES = {
	squid: [
		["00011000", "00111100", "01111110", "11011011", "11111111", "00100100", "01011010", "10100101"],
		["00011000", "00111100", "01111110", "11011011", "11111111", "01011010", "10000001", "01000010"],
	],
	crab: [
		["00100000100", "00010001000", "00111111100", "01101110110", "11111111111", "10111111101", "10100000101", "00011011000"],
		["00100000100", "10010001001", "10111111101", "11101110111", "11111111111", "01111111110", "00100000100", "01000000010"],
	],
};

const INV = { bullets: [], lastShot: 0, lastFire: 0, cannonX: 0 };

function drawSprite(rows, x, y, size, color) {
	fxCtx.fillStyle = color;

	for (let by = 0; by < rows.length; by++) {
		for (let bx = 0; bx < rows[by].length; bx++) {
			if (rows[by][bx] === "1") {
				fxCtx.fillRect(x + bx * size, y + by * size, size, size);
			}
		}
	}
}

function drawInvaders(now) {
	fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
	fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

	const reduced = fxReduced();

	const size = 4;
	const gapX = 90;
	const gapY = 50;

	const perRow = Math.max(3, Math.min(12, Math.floor((window.innerWidth - 60) / gapX)));
	const rowCount = Math.max(1, Math.min(3, Math.floor((offsetY - 14) / gapY)));

	const fieldW = perRow * gapX;
	const slack = Math.max(0, (window.innerWidth - fieldW) / 2 - 10);

	const ox = (window.innerWidth - fieldW) / 2 + (reduced ? 0 : Math.sin(now / 2600) * Math.min(60, slack));
	const oy = 12 + (reduced ? 0 : Math.abs(Math.sin(now / 3000)) * 6);

	const frame = reduced ? 0 : Math.floor(now / 500) % 2;

	fxCtx.globalAlpha = 0.8;

	const alive = [];

	for (let r = 0; r < rowCount; r++) {
		const sprite = r === 0 ? INV_SPRITES.squid : INV_SPRITES.crab;
		const color = r === 0 ? "#ff3cc8" : r === 1 ? "#50ff50" : "#ffffff";

		for (let c = 0; c < perRow; c++) {
			const x = ox + c * gapX + (gapX - 11 * size) / 2;
			const y = oy + r * gapY;

			drawSprite(sprite[frame], x, y, size, color);

			alive.push([x + 20, y + 32]);
		}
	}

	const bottom = window.innerHeight - 36;

	if (mouse.seen) {
		INV.cannonX += (mouse.x - INV.cannonX) * 0.12;
	} else {
		INV.cannonX = window.innerWidth / 2 + Math.sin(now / 1800) * 200;
	}

	INV.cannonX = clamp(INV.cannonX, 30, window.innerWidth - 30);

	fxCtx.fillStyle = "#50ff50";
	fxCtx.fillRect(INV.cannonX - 18, bottom, 36, 8);
	fxCtx.fillRect(INV.cannonX - 10, bottom - 8, 20, 8);
	fxCtx.fillRect(INV.cannonX - 3, bottom - 14, 6, 6);

	if (!reduced) {
		if (now - INV.lastShot > 650) {
			INV.lastShot = now;

			INV.bullets.push({ x: INV.cannonX, y: bottom - 16, vy: -7 });
		}

		if (now - INV.lastFire > 900) {
			INV.lastFire = now;

			const shooter = pickRandom(alive);

			INV.bullets.push({ x: shooter[0], y: shooter[1], vy: 4 });
		}
	}

	fxCtx.fillStyle = "#fff";

	INV.bullets = INV.bullets.filter((bullet) => {
		bullet.y += bullet.vy;

		fxCtx.fillRect(bullet.x - 1, bullet.y, 3, 12);

		return bullet.y > -20 && bullet.y < window.innerHeight + 20;
	});

	fxCtx.globalAlpha = 1;
}

const CHESS_POOL = { items: [], last: 0 };

const CHESS_GLYPHS = ["♔", "♕", "♖", "♗", "♘", "♙", "♚", "♛", "♜", "♝", "♞", "♟"];

function drawChess(now) {
	fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
	fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

	if (fxReduced()) {
		return;
	}

	if (now - CHESS_POOL.last > 260 && CHESS_POOL.items.length < 36) {
		CHESS_POOL.last = now;

		CHESS_POOL.items.push({
			x: bandX(30),
			y: -30,
			vy: 0.7 + Math.random() * 1.1,
			size: 26 + Math.random() * 26,
			glyph: pickRandom(CHESS_GLYPHS),
			sway: Math.random() * Math.PI * 2,
			swaySpeed: 0.008 + Math.random() * 0.015,
			alpha: 0.25 + Math.random() * 0.3,
		});
	}

	fxCtx.textBaseline = "middle";

	CHESS_POOL.items = CHESS_POOL.items.filter((piece) => {
		piece.y += piece.vy;
		piece.sway += piece.swaySpeed;

		const black = CHESS_GLYPHS.indexOf(piece.glyph) >= 6;

		fxCtx.font = piece.size + "px serif";
		fxCtx.fillStyle = black ? "rgba(214, 170, 110, " + piece.alpha + ")" : "rgba(255, 255, 255, " + piece.alpha + ")";

		fxCtx.fillText(piece.glyph, piece.x + Math.sin(piece.sway) * 18, piece.y);

		return piece.y < window.innerHeight + 40;
	});
}

const UW = { bubbles: [], fish: [], lastBubble: 0, lastFish: 0 };

const UW_FISH = ["🐟", "🐠", "🐡"];

function drawBubbles(now) {
	fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
	fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

	if (fxReduced()) {
		return;
	}

	if (now - UW.lastBubble > 140 && UW.bubbles.length < 50) {
		UW.lastBubble = now;

		UW.bubbles.push({
			x: bandX(30),
			y: window.innerHeight + 20,
			vy: 0.6 + Math.random() * 1.4,
			r: 4 + Math.random() * 11,
			sway: Math.random() * Math.PI * 2,
			swaySpeed: 0.02 + Math.random() * 0.03,
		});
	}

	if (now - UW.lastFish > 3500 && UW.fish.length < 3) {
		UW.lastFish = now;

		const dir = Math.random() < 0.5 ? 1 : -1;

		UW.fish.push({
			x: dir === 1 ? -60 : window.innerWidth + 60,
			y: window.innerHeight * (0.15 + Math.random() * 0.7),
			vx: dir * (1.2 + Math.random() * 1.5),
			size: 30 + Math.random() * 26,
			glyph: pickRandom(UW_FISH),
			bob: Math.random() * Math.PI * 2,
		});
	}

	fxCtx.lineWidth = 1.5;

	UW.bubbles = UW.bubbles.filter((bubble) => {
		bubble.y -= bubble.vy;
		bubble.sway += bubble.swaySpeed;

		const x = bubble.x + Math.sin(bubble.sway) * 10;

		fxCtx.fillStyle = "rgba(255, 255, 255, 0.12)";
		fxCtx.strokeStyle = "rgba(255, 255, 255, 0.8)";
		fxCtx.beginPath();
		fxCtx.arc(x, bubble.y, bubble.r, 0, Math.PI * 2);
		fxCtx.fill();
		fxCtx.stroke();

		fxCtx.fillStyle = "rgba(255, 255, 255, 0.35)";
		fxCtx.beginPath();
		fxCtx.arc(x - bubble.r * 0.35, bubble.y - bubble.r * 0.35, bubble.r * 0.25, 0, Math.PI * 2);
		fxCtx.fill();

		return bubble.y > -20;
	});

	fxCtx.textBaseline = "middle";
	fxCtx.textAlign = "center";

	UW.fish = UW.fish.filter((fish) => {
		fish.x += fish.vx;
		fish.bob += 0.04;

		fxCtx.save();

		fxCtx.globalAlpha = 0.6;
		fxCtx.translate(fish.x, fish.y + Math.sin(fish.bob) * 8);
		fxCtx.scale(fish.vx > 0 ? -1 : 1, 1);
		fxCtx.font = fish.size + "px serif";
		fxCtx.fillText(fish.glyph, 0, 0);

		fxCtx.restore();

		return fish.x > -80 && fish.x < window.innerWidth + 80;
	});
}

function drawVhs(now) {
	fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
	fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

	if (fxReduced()) {
		return;
	}

	for (let n = 0; n < 220; n++) {
		const v = 140 + Math.floor(Math.random() * 115);

		fxCtx.fillStyle = "rgba(" + v + "," + v + "," + v + "," + (0.06 + Math.random() * 0.12) + ")";
		fxCtx.fillRect(Math.random() * window.innerWidth, Math.random() * window.innerHeight, 2, 1.5);
	}

	for (let n = 0; n < 5; n++) {
		fxCtx.fillStyle = "rgba(255, 255, 255, " + (0.03 + Math.random() * 0.06) + ")";
		fxCtx.fillRect(0, Math.random() * window.innerHeight, window.innerWidth, 1 + Math.random() * 2);
	}

	const barY = ((now / 14) % (window.innerHeight + 160)) - 80;

	const gradient = fxCtx.createLinearGradient(0, barY - 40, 0, barY + 40);

	gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
	gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.07)");
	gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

	fxCtx.fillStyle = gradient;
	fxCtx.fillRect(0, barY - 40, window.innerWidth, 80);
}

const FX_THEMES = {
	underwater: drawBubbles,
	vhs: drawVhs,
	invaders: drawInvaders,
	chess: drawChess,
	casino: drawSuits,
	terminal: drawRain,
	keyboard: drawNotes,
	tetris: drawPieces,
};

function updateFx(now) {
	const current = themeState.current && FX_THEMES[themeState.current.name] ? themeState.current : null;

	if (current) {
		fxState.theme = current;
		fxState.time = now;
	}

	const live = current || (fxState.theme && now - fxState.time < 2000 ? fxState.theme : null);

	if (live) {
		FX_THEMES[live.name](now);

		fxState.dirty = true;
	} else if (fxState.dirty) {
		fxCtx.setTransform(1, 0, 0, 1, 0, 0);
		fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

		fxState.dirty = false;
	}
}

function resizeCanvas() {
	dpr = Math.min(window.devicePixelRatio || 1, 2);

	canvas.width = Math.round(window.innerWidth * dpr);
	canvas.height = Math.round(window.innerHeight * dpr);

	resizeFx();
}

function snapToRest() {
	x.set(rx);
	y.set(ry);
	z.fill(0);

	qx.set(rx);
	qy.set(ry);
	qz.fill(0);
}

function settleTowardRest(amount) {
	const keep = 1 - amount;

	for (let k = 0; k < count; k++) {
		if (pinned[k]) {
			continue;
		}

		x[k] = rx[k] + (x[k] - rx[k]) * keep;
		y[k] = ry[k] + (y[k] - ry[k]) * keep;
		z[k] *= keep;

		qx[k] = rx[k] + (qx[k] - rx[k]) * keep;
		qy[k] = ry[k] + (qy[k] - ry[k]) * keep;
		qz[k] *= keep;
	}
}

function guideShape() {
	const sigma2 = CONFIG.shapeSigma * CONFIG.shapeSigma;
	const strength = CONFIG.shapeStrength;

	for (let k = 0; k < count; k++) {
		if (pinned[k]) {
			continue;
		}

		const ddx = rx[k] - state.grabX;
		const ddy = ry[k] - state.grabY;

		const w = Math.exp(-(ddx * ddx + ddy * ddy) / sigma2);

		const moveX = (rx[k] + state.dx * w - x[k]) * strength;
		const moveY = (ry[k] + state.dy * w - y[k]) * strength;
		const moveZ = -z[k] * strength;

		x[k] += moveX;
		y[k] += moveY;
		z[k] += moveZ;

		qx[k] += moveX;
		qy[k] += moveY;
		qz[k] += moveZ;
	}
}

function limitDepth() {
	const max = CONFIG.maxDepth;

	for (let k = 0; k < count; k++) {
		if (z[k] > max) {
			z[k] = max + (z[k] - max) * CONFIG.depthSoftness;
		} else if (z[k] < -max) {
			z[k] = -max + (z[k] + max) * CONFIG.depthSoftness;
		}
	}
}

function pick(localX, localY) {
	let best = -1;
	let bestDistance = CONFIG.spacing * 1.6;

	for (let k = 0; k < count; k++) {
		const distance = Math.hypot(sx[k] - localX, sy[k] - localY);

		if (distance < bestDistance) {
			bestDistance = distance;
			best = k;
		}
	}

	return best;
}

function applyPins() {
	for (let n = 0; n < cluster.length; n++) {
		const item = cluster[n];

		x[item.index] = item.x + state.dx;
		y[item.index] = item.y + state.dy;
	}
}

function startDrag() {
	const center = pick(state.startLocalX, state.startLocalY);

	if (center === -1) {
		return false;
	}

	const cx = x[center];
	const cy = y[center];

	state.grabX = rx[center];
	state.grabY = ry[center];

	cluster = [];

	for (let k = 0; k < count; k++) {
		if (Math.hypot(x[k] - cx, y[k] - cy) <= CONFIG.grabRadius) {
			pinned[k] = 1;

			cluster.push({ index: k, x: x[k], y: y[k] });
		}
	}

	for (let k = 0; k < count; k++) {
		z[k] += (Math.random() - 0.5) * 1.5;
	}

	state.dx = 0;
	state.dy = 0;
	state.targetDx = 0;
	state.targetDy = 0;

	state.resetAt = 0;
	state.resetStart = 0;

	return true;
}

function endDrag() {
	for (let n = 0; n < cluster.length; n++) {
		pinned[cluster[n].index] = 0;
	}

	cluster = [];
}

function integrate(damping, rest) {
	for (let k = 0; k < count; k++) {
		if (pinned[k]) {
			continue;
		}

		const vx = (x[k] - qx[k]) * damping;
		const vy = (y[k] - qy[k]) * damping;
		const vz = (z[k] - qz[k]) * damping;

		qx[k] = x[k];
		qy[k] = y[k];
		qz[k] = z[k];

		x[k] += vx + (rx[k] - x[k]) * rest;
		y[k] += vy + (ry[k] - y[k]) * rest;
		z[k] += vz - z[k] * rest;

		if (state.dragging) {
			z[k] += (Math.random() - 0.5) * 0.05;
		}
	}
}

function solve() {
	const total = cA.length;

	for (let iteration = 0; iteration < CONFIG.iterations; iteration++) {
		for (let c = 0; c < total; c++) {
			const a = cA[c];
			const b = cB[c];

			const wa = pinned[a] ? 0 : 1;
			const wb = pinned[b] ? 0 : 1;

			const sum = wa + wb;

			if (sum === 0) {
				continue;
			}

			const dx = x[b] - x[a];
			const dy = y[b] - y[a];
			const dz = z[b] - z[a];

			const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;

			const diff = ((distance - cLen[c]) / distance) * (cK[c] / sum);

			x[a] += dx * diff * wa;
			y[a] += dy * diff * wa;
			z[a] += dz * diff * wa;

			x[b] -= dx * diff * wb;
			y[b] -= dy * diff * wb;
			z[b] -= dz * diff * wb;
		}

		applyPins();
	}
}

function project() {
	const cx = width / 2;
	const cy = height / 2;

	for (let k = 0; k < count; k++) {
		const depth = clamp(z[k], -400, CONFIG.perspective * 0.6);
		const scale = CONFIG.perspective / (CONFIG.perspective - depth);

		sx[k] = cx + (x[k] - cx) * scale;
		sy[k] = cy + (y[k] - cy) * scale;
	}
}

function computeShading() {
	for (let j = 0; j < rows; j++) {
		for (let i = 0; i < cols; i++) {
			const k = j * cols + i;

			const l = j * cols + Math.max(i - 1, 0);
			const r = j * cols + Math.min(i + 1, cols - 1);
			const t = Math.max(j - 1, 0) * cols + i;
			const b = Math.min(j + 1, rows - 1) * cols + i;

			const ux = x[r] - x[l];
			const uy = y[r] - y[l];
			const uz = z[r] - z[l];

			const vx = x[b] - x[t];
			const vy = y[b] - y[t];
			const vz = z[b] - z[t];

			let nx = uy * vz - uz * vy;
			let ny = uz * vx - ux * vz;
			let nz = ux * vy - uy * vx;

			if (nz < 0) {
				nx = -nx;
				ny = -ny;
				nz = -nz;
			}

			const length = Math.hypot(nx, ny, nz) || 1;

			const d = (nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z) / length;

			shade[k] = clamp(1 + (d - LIGHT.z) * 1.7, 0.4, 1.22);

			nxs[k] = nx / length;
			nys[k] = ny / length;
		}
	}
}

function gridIndices(n, step) {
	const list = [];

	for (let i = 0; i < n; i += step) {
		list.push(i);
	}

	if (list[list.length - 1] !== n - 1) {
		list.push(n - 1);
	}

	return list;
}

function drawExtras(theme, strength, time) {
	if (!theme || strength < 0.02) {
		return;
	}

	if (theme.studs) {
		drawStuds(theme.studs, strength);
	}

	if (theme.draw) {
		theme.draw(strength, time);
	}

	if (theme.grid) {
		const grid = theme.grid;

		ctx.lineWidth = 1;
		ctx.strokeStyle = "rgba(" + grid.color + "," + grid.alpha * strength + ")";

		ctx.beginPath();

		if (grid.cols !== false) {
			gridIndices(cols, grid.step).forEach((i) => {
				for (let j = 0; j < rows; j++) {
					const k = j * cols + i;

					if (j === 0) ctx.moveTo(sx[k], sy[k]);
					else ctx.lineTo(sx[k], sy[k]);
				}
			});
		}

		if (grid.rows !== false) {
			gridIndices(rows, grid.step).forEach((j) => {
				for (let i = 0; i < cols; i++) {
					const k = j * cols + i;

					if (i === 0) ctx.moveTo(sx[k], sy[k]);
					else ctx.lineTo(sx[k], sy[k]);
				}
			});
		}

		ctx.stroke();
	}

	if (theme.dots) {
		ctx.fillStyle = "rgba(" + theme.dots.color + "," + theme.dots.alpha * strength + ")";

		ctx.beginPath();

		for (let j = 0; j < rows - 1; j++) {
			for (let i = 0; i < cols - 1; i++) {
				const a = j * cols + i;
				const b = a + 1;
				const c = a + cols;
				const d = c + 1;

				const s = (shade[a] + shade[b] + shade[c] + shade[d]) * 0.25;

				const r = clamp((1.3 - s) * 2.4 + 0.5, 0.4, 2.6);

				for (let u = 0.25; u < 1; u += 0.5) {
					for (let v = 0.25; v < 1; v += 0.5) {
						const topX = sx[a] + (sx[b] - sx[a]) * u;
						const botX = sx[c] + (sx[d] - sx[c]) * u;
						const topY = sy[a] + (sy[b] - sy[a]) * u;
						const botY = sy[c] + (sy[d] - sy[c]) * u;

						const px = topX + (botX - topX) * v;
						const py = topY + (botY - topY) * v;

						ctx.moveTo(px + r, py);
						ctx.arc(px, py, r, 0, Math.PI * 2);
					}
				}
			}
		}

		ctx.fill();
	}
}

function draw(time) {
	themeState.mix = Math.min(1, themeState.mix + CONFIG.themeFade);

	const blending = themeState.mix < 1;

	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

	ctx.translate(offsetX, offsetY);

	ctx.lineWidth = 1;
	ctx.lineJoin = "round";

	for (let j = 0; j < rows - 1; j++) {
		for (let i = 0; i < cols - 1; i++) {
			const a = j * cols + i;
			const b = a + 1;
			const c = a + cols;
			const d = c + 1;

			const s = (shade[a] + shade[b] + shade[c] + shade[d]) * 0.25;
			const nx = (nxs[a] + nxs[b] + nxs[c] + nxs[d]) * 0.25;
			const ny = (nys[a] + nys[b] + nys[c] + nys[d]) * 0.25;

			const t = (i / (cols - 1) + j / (rows - 1)) / 2;

			let rgb = themeColor(themeState.current, t, nx, ny, s, time, i, j);

			if (blending) {
				const previous = themeColor(themeState.previous, t, nx, ny, s, time, i, j);
				const m = themeState.mix;

				rgb = [lerp(previous[0], rgb[0], m), lerp(previous[1], rgb[1], m), lerp(previous[2], rgb[2], m)];
			}

			const color = `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;

			ctx.fillStyle = color;
			ctx.strokeStyle = color;

			ctx.beginPath();
			ctx.moveTo(sx[a], sy[a]);
			ctx.lineTo(sx[b], sy[b]);
			ctx.lineTo(sx[d], sy[d]);
			ctx.lineTo(sx[c], sy[c]);
			ctx.closePath();

			ctx.fill();
			ctx.stroke();
		}
	}

	drawExtras(themeState.current, themeState.mix, time);

	if (blending) {
		drawExtras(themeState.previous, 1 - themeState.mix, time);
	}

	ctx.beginPath();

	for (let i = 0; i < cols; i++) {
		const k = i;

		if (i === 0) ctx.moveTo(sx[k], sy[k]);
		else ctx.lineTo(sx[k], sy[k]);
	}

	for (let j = 1; j < rows; j++) {
		const k = j * cols + cols - 1;

		ctx.lineTo(sx[k], sy[k]);
	}

	for (let i = cols - 2; i >= 0; i--) {
		const k = (rows - 1) * cols + i;

		ctx.lineTo(sx[k], sy[k]);
	}

	for (let j = rows - 2; j >= 0; j--) {
		const k = j * cols;

		ctx.lineTo(sx[k], sy[k]);
	}

	ctx.closePath();

	ctx.strokeStyle = (themeState.current && themeState.current.edge) || "rgba(255, 255, 255, 0.35)";
	ctx.stroke();
}

const WARP_SELECTOR = [".cloth-meta", ".eyebrow", ".intro h1", ".hello", ".intro-text", ".section-label", ".contact h2", ".contact-row", ".cloth-footer"].join(",");

let warpTargets = [];

function measureWarpTargets() {
	const known = new Set(warpTargets.map((target) => target.element));

	warpTargets = warpTargets.filter((target) => target.element.isConnected);

	cloth.querySelectorAll(WARP_SELECTOR).forEach((element) => {
		if (!known.has(element)) {
			warpTargets.push({ element, left: 0, top: 0, w: 1, h: 1 });
		}
	});

	warpTargets.forEach((target) => {
		target.element.style.transform = "";
		target.element.style.transformOrigin = "0 0";
	});

	const origin = cloth.getBoundingClientRect();

	warpTargets.forEach((target) => {
		const rect = target.element.getBoundingClientRect();

		target.left = rect.left - origin.left;
		target.top = rect.top - origin.top;
		target.w = Math.max(rect.width, 1);
		target.h = Math.max(rect.height, 1);
	});

	if (sx) {
		updateContent();
	}
}

function sampleMesh(px, py, out) {
	const gi = clamp((px / width) * (cols - 1), 0, cols - 1);
	const gj = clamp((py / height) * (rows - 1), 0, rows - 1);

	const i0 = Math.min(Math.floor(gi), cols - 2);
	const j0 = Math.min(Math.floor(gj), rows - 2);

	const fi = gi - i0;
	const fj = gj - j0;

	const a = j0 * cols + i0;
	const b = a + 1;
	const c = a + cols;
	const d = c + 1;

	out.x = (sx[a] * (1 - fi) + sx[b] * fi) * (1 - fj) + (sx[c] * (1 - fi) + sx[d] * fi) * fj;
	out.y = (sy[a] * (1 - fi) + sy[b] * fi) * (1 - fj) + (sy[c] * (1 - fi) + sy[d] * fi) * fj;
}

const warpA = { x: 0, y: 0 };
const warpB = { x: 0, y: 0 };
const warpC = { x: 0, y: 0 };

function updateContent() {
	for (let n = 0; n < warpTargets.length; n++) {
		const t = warpTargets[n];

		sampleMesh(t.left, t.top, warpA);
		sampleMesh(t.left + t.w, t.top, warpB);
		sampleMesh(t.left, t.top + t.h, warpC);

		const a = (warpB.x - warpA.x) / t.w;
		const b = (warpB.y - warpA.y) / t.w;
		const c = (warpC.x - warpA.x) / t.h;
		const d = (warpC.y - warpA.y) / t.h;

		t.element.style.transform = `translate(${warpA.x - t.left}px, ${warpA.y - t.top}px) matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`;
	}

	if (party.active) {
		const basis = 20;

		for (let n = 0; n < party.cats.length; n++) {
			const cat = party.cats[n];

			const restX = (cat.px / 100) * width;
			const restY = (cat.py / 100) * height;

			sampleMesh(restX, restY, warpA);
			sampleMesh(restX + basis, restY, warpB);
			sampleMesh(restX, restY + basis, warpC);

			const a = (warpB.x - warpA.x) / basis;
			const b = (warpB.y - warpA.y) / basis;
			const c = (warpC.x - warpA.x) / basis;
			const d = (warpC.y - warpA.y) / basis;

			cat.element.style.transform = `translate(${warpA.x}px, ${warpA.y}px) matrix(${a}, ${b}, ${c}, ${d}, 0, 0) translate(-50%, -50%)`;
		}
	}
}

function updateReset(now) {
	if (!state.dragging && state.resetAt && now >= state.resetAt) {
		state.resetAt = 0;
		state.resetStart = now;

		dragState.textContent = "RESETTING";
	}

	if (state.resetStart) {
		if (now - state.resetStart >= CONFIG.resetDuration) {
			state.resetStart = 0;

			snapToRest();

			dragState.textContent = "READY";
		}
	}

	if (!Number.isFinite(x[anchors.left] + y[anchors.top] + z[anchors.bottom])) {
		snapToRest();
	}
}

function animate() {
	const now = performance.now();
	const time = now / 1000;

	updateReset(now);

	let damping = CONFIG.damping;
	let settle = 0;

	if (state.resetStart) {
		const p = clamp((now - state.resetStart) / CONFIG.resetDuration, 0, 1);
		const ease = p * p * (3 - 2 * p);

		damping = lerp(CONFIG.damping, CONFIG.resetDamping, ease);
		settle = clamp(p / 0.35, 0, 1) ** 2 * CONFIG.resetStrength;
	}

	state.dx += (state.targetDx - state.dx) * 0.5;
	state.dy += (state.targetDy - state.dy) * 0.5;

	for (let n = 0; n < cluster.length; n++) {
		const item = cluster[n];

		qx[item.index] = x[item.index];
		qy[item.index] = y[item.index];
		qz[item.index] = z[item.index];
	}

	integrate(damping, state.dragging ? CONFIG.dragRestStiffness : CONFIG.restStiffness);

	applyPins();

	solve();

	if (state.dragging) {
		guideShape();
	}

	applyWaves(time);

	limitDepth();

	if (settle > 0) {
		settleTowardRest(settle);
	}

	project();

	computeShading();

	draw(time);

	updateContent();

	updateFx(now);

	frameCount++;

	if (frameCount % CONFIG.textColorEvery === 0) {
		updateTextColors(time);
	}

	requestAnimationFrame(animate);
}

function toLocal(event) {
	return {
		x: event.clientX - offsetX,
		y: event.clientY - offsetY,
	};
}

canvas.addEventListener("pointerdown", (event) => {
	const local = toLocal(event);

	if (pick(local.x, local.y) === -1) {
		return;
	}

	state.pointerDown = true;
	state.pointerId = event.pointerId;

	state.startClientX = event.clientX;
	state.startClientY = event.clientY;

	state.startLocalX = local.x;
	state.startLocalY = local.y;

	try {
		canvas.setPointerCapture(event.pointerId);
	} catch {
		// Ignore.
	}
});

canvas.addEventListener("pointermove", (event) => {
	if (!state.pointerDown) {
		const local = toLocal(event);

		canvas.style.cursor = pick(local.x, local.y) === -1 ? "default" : "grab";

		return;
	}

	if (event.pointerId !== state.pointerId) {
		return;
	}

	const dx = event.clientX - state.startClientX;
	const dy = event.clientY - state.startClientY;

	if (!state.dragging && Math.hypot(dx, dy) >= CONFIG.dragThreshold) {
		if (!startDrag()) {
			state.pointerDown = false;

			return;
		}

		state.dragging = true;

		canvas.style.cursor = "grabbing";

		dragState.textContent = "DRAGGING";
	}

	if (!state.dragging) {
		return;
	}

	const length = Math.hypot(dx, dy);
	const scale = length > 0 ? (CONFIG.maxPull * Math.tanh(length / CONFIG.maxPull)) / length : 1;

	state.targetDx = dx * scale;
	state.targetDy = dy * scale;

	event.preventDefault();
});

function releaseCloth(event) {
	if (!state.pointerDown || event.pointerId !== state.pointerId) {
		return;
	}

	state.pointerDown = false;

	state.pointerId = null;

	if (state.dragging) {
		state.dragging = false;

		endDrag();

		state.resetAt = performance.now() + CONFIG.resetDelay;

		canvas.style.cursor = "grab";

		dragState.textContent = "RELAXING";

		setTimeout(() => {
			if (!state.dragging && !state.resetStart) {
				dragState.textContent = "READY";
			}
		}, 650);
	}

	try {
		canvas.releasePointerCapture(event.pointerId);
	} catch {
		// Ignore.
	}
}

canvas.addEventListener("pointerup", releaseCloth);

canvas.addEventListener("pointercancel", releaseCloth);

window.addEventListener("resize", () => {
	state.pointerDown = false;
	state.dragging = false;

	resizeCanvas();

	build();
});

resizeCanvas();

build();

animate();

if (document.fonts && document.fonts.ready) {
	document.fonts.ready.then(measureWarpTargets);
}

window.addEventListener("load", measureWarpTargets);

if (document.fonts && document.fonts.addEventListener) {
	document.fonts.addEventListener("loadingdone", measureWarpTargets);
}

const catMessages = ["meow", "meow meow?", "meow meow meow...", "MEOW?!", "MEOOOOOOOOOOOOOOW!"];

const catPositions = [
	{
		right: "46px",
		top: "4px",
	},

	{
		right: "100px",
		top: "25px",
	},

	{
		right: "28px",
		top: "40px",
	},

	{
		right: "118px",
		top: "2px",
	},

	{
		right: "62px",
		top: "57px",
	},
];

let catClickCount = 0;

let themeUnlocked = false;

function setCatReady(ready) {
	catButton.disabled = !ready;

	if (ready) {
		catButton.classList.add("pulse");

		clearTimeout(catButton.pulseTimeout);

		catButton.pulseTimeout = setTimeout(() => catButton.classList.remove("pulse"), 3600);
	} else {
		catButton.classList.remove("pulse");

		clearTimeout(catButton.pulseTimeout);
	}
}

catButton.addEventListener("click", (event) => {
	event.stopPropagation();

	if (themeUnlocked) {
		catButton.animate([{ transform: "rotate(0deg) scale(1)" }, { transform: "rotate(-10deg) scale(1.15)" }, { transform: "rotate(0deg) scale(1)" }], { duration: 320, easing: "ease-out" });

		themeSequence(nextTheme());

		return;
	}

	catClickCount++;

	if (catClickCount > catMessages.length) {
		catClickCount = 1;
	}

	const index = catClickCount - 1;

	meow.textContent = catMessages[index];

	meow.style.right = catPositions[index].right;

	meow.style.top = catPositions[index].top;

	meow.classList.remove("show");

	void meow.offsetWidth;

	meow.classList.add("show");

	const rotation = index % 2 === 0 ? -8 : 8;

	const scale = 1 + index * 0.07;

	catButton.animate(
		[
			{
				transform: "rotate(0deg) scale(1)",
			},

			{
				transform: `rotate(${rotation}deg) scale(${scale})`,
			},

			{
				transform: "rotate(0deg) scale(1)",
			},
		],
		{
			duration: 350 + index * 80,

			easing: "ease-out",
		},
	);

	clearTimeout(catButton.meowTimeout);

	catButton.meowTimeout = setTimeout(
		() => {
			meow.classList.remove("show");
		},
		1200 + index * 250,
	);

	if (index === catMessages.length - 1) {
		clearTimeout(catButton.themeTimeout);

		catButton.themeTimeout = setTimeout(changeTheme, CONFIG.themeDelay);

		themeUnlocked = true;

		setCatReady(false);
	}
});

document.querySelector(".logo").addEventListener("click", (event) => {
	event.preventDefault();

	resetTheme();
});
