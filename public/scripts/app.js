const cloth = document.getElementById("cloth");
const clothContent = cloth.querySelector(".cloth-content");
const canvas = document.getElementById("clothCanvas");
const ctx = canvas.getContext("2d");
const dragState = document.getElementById("dragState");

const catButton = document.getElementById("catButton");
const meow = document.getElementById("meow");

const CONFIG = {
	spacing: 20,
	iterations: 12,
	damping: 0.985,
	restStiffness: 0.01,
	shearStiffness: 0.7,
	bendStiffness: 0.25,
	grabRadius: 40,
	maxPull: 380,
	dragThreshold: 6,
	perspective: 1200,
	resetDelay: 5000,
	resetDuration: 2200,
	resetRestMultiplier: 5,
	resetDamping: 0.92,
	themeDelay: 700,
	themeFade: 0.025,
	textColorEvery: 3,
	partyCats: 6,
	partyMinGap: 20,
	partySpawnEvery: 450,
	partyLineGap: [1100, 1700],
	partyPause: [2500, 4500],
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

	{
		name: "prismatic",
		color(t, nx, ny, s, time) {
			const u = t * 2.2 + (nx * 0.9 + ny * 0.7) * 2.2 + time * 0.03;

			return hslToRgb((u - Math.floor(u)) * 360, 0.8, clamp(0.72 * s, 0.35, 0.88));
		},
	},

	{
		name: "aurora",
		color(t, nx, ny, s, time) {
			const wave = 0.5 + 0.5 * Math.sin(t * 5 + nx * 4 + ny * 3 + time * 0.4);

			return hslToRgb(140 + 130 * wave, 0.55, clamp(0.8 * s, 0.4, 0.92));
		},
	},
];

const themeState = {
	current: null,
	previous: null,
	mix: 1,
};

const CAT_FACES = ["🐈", "🐈‍⬛", "🐱", "😺", "😸", "🐈"];

const OPENERS = ["meow", "meow?", "mrrp", "meow meow", "nyaa"];

const ANSWERS_TO_QUESTION = ["meow.", "meow meow", "purr...", "mrrp", "MEOW"];

const ANSWERS_TO_SHOUT = ["meow?!", "mrrp?", "...meow", "meow meow?"];

const ANSWERS_GENERIC = ["meow", "meow?", "mrrp", "purr...", "meow meow meow", "MEOW!"];

const party = {
	element: null,
	cats: [],
	active: false,
};

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

	cat.element.style.left = `${best.px}%`;
	cat.element.style.top = `${best.py}%`;
}

function spawnCat() {
	const element = document.createElement("div");
	element.className = "party-cat";

	const flip = document.createElement("span");
	flip.className = "party-flip";

	if (Math.random() < 0.5) {
		flip.style.transform = "scaleX(-1)";
	}

	const face = document.createElement("span");
	face.className = "party-face";
	face.textContent = pickRandom(CAT_FACES);

	const bubble = document.createElement("div");
	bubble.className = "party-bubble";

	flip.appendChild(face);
	element.appendChild(flip);
	element.appendChild(bubble);

	party.element.appendChild(element);

	const cat = { element, bubble, px: 50, py: 50, timeout: null };

	party.cats.push(cat);

	placeCat(cat);

	requestAnimationFrame(() => {
		requestAnimationFrame(() => element.classList.add("in"));
	});

	return cat;
}

function say(cat, text) {
	cat.bubble.textContent = text;
	cat.bubble.classList.add("show");

	cat.element.classList.remove("talking");

	void cat.element.offsetWidth;

	cat.element.classList.add("talking");

	clearTimeout(cat.timeout);

	cat.timeout = setTimeout(() => cat.bubble.classList.remove("show"), 1500);
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
	cat.element.classList.remove("in");

	await sleep(420);

	placeCat(cat);

	await sleep(60);

	cat.element.classList.add("in");
}

async function conversation() {
	while (party.active) {
		const lines = 2 + Math.floor(Math.random() * 4);

		let speaker = pickRandom(party.cats);
		let text = pickRandom(OPENERS);

		for (let line = 0; line < lines && party.active; line++) {
			say(speaker, text);

			await sleep(randomBetween(CONFIG.partyLineGap));

			const others = party.cats.filter((cat) => cat !== speaker);

			speaker = pickRandom(others);
			text = replyTo(text);
		}

		await sleep(randomBetween(CONFIG.partyPause));

		const hops = 1 + Math.floor(Math.random() * 2);

		for (let n = 0; n < hops; n++) {
			hop(pickRandom(party.cats));

			await sleep(250);
		}

		await sleep(600);
	}
}

async function startCatParty() {
	if (party.active) {
		return;
	}

	party.active = true;

	party.element = document.createElement("div");
	party.element.className = "cat-party";

	clothContent.appendChild(party.element);

	for (let n = 0; n < CONFIG.partyCats; n++) {
		spawnCat();

		await sleep(CONFIG.partySpawnEvery);
	}

	await sleep(700);

	conversation();
}

function themeColor(theme, t, nx, ny, s, time) {
	if (!theme) {
		const base = baseColor(t);

		return [Math.min(255, base[0] * s), Math.min(255, base[1] * s), Math.min(255, base[2] * s)];
	}

	return theme.color(t, nx, ny, s, time);
}

function updateTextColors(time) {
	if (!themeState.current) {
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

	const root = document.documentElement.style;

	root.setProperty("--text-a", `rgb(${colors[0]})`);
	root.setProperty("--text-b", `rgb(${colors[1]})`);
	root.setProperty("--text-c", `rgb(${colors[2]})`);

	root.setProperty("--text-a-soft", `rgba(${colors[0]}, 0.55)`);
	root.setProperty("--text-b-soft", `rgba(${colors[1]}, 0.55)`);
	root.setProperty("--text-c-soft", `rgba(${colors[2]}, 0.55)`);
}

function changeTheme() {
	const options = THEMES.filter((theme) => theme !== themeState.current);

	themeState.previous = themeState.current;
	themeState.current = options[Math.floor(Math.random() * options.length)];
	themeState.mix = 0;

	document.documentElement.dataset.theme = themeState.current.name;

	updateTextColors(performance.now() / 1000);

	for (let k = 0; k < count; k++) {
		if (!pinned[k]) {
			z[k] += (Math.random() - 0.5) * 6;
		}
	}

	startCatParty();
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

	clothContent.style.transformOrigin = `${anchors.restCx}px ${anchors.restCy}px`;
}

function resizeCanvas() {
	dpr = Math.min(window.devicePixelRatio || 1, 2);

	canvas.width = Math.round(window.innerWidth * dpr);
	canvas.height = Math.round(window.innerHeight * dpr);
}

function snapToRest() {
	x.set(rx);
	y.set(ry);
	z.fill(0);

	qx.set(rx);
	qy.set(ry);
	qz.fill(0);
}

function maxDisplacement() {
	let max = 0;

	for (let k = 0; k < count; k++) {
		const d = Math.max(Math.abs(x[k] - rx[k]), Math.abs(y[k] - ry[k]), Math.abs(z[k]));

		if (d > max) {
			max = d;
		}
	}

	return max;
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

			let rgb = themeColor(themeState.current, t, nx, ny, s, time);

			if (blending) {
				const previous = themeColor(themeState.previous, t, nx, ny, s, time);
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

	ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
	ctx.stroke();
}

function updateContent() {
	const { left, right, top, bottom, restCx, restCy, spanX, spanY } = anchors;

	const exX = (sx[right] - sx[left]) / spanX;
	const exY = (sy[right] - sy[left]) / spanX;

	const eyX = (sx[bottom] - sx[top]) / spanY;
	const eyY = (sy[bottom] - sy[top]) / spanY;

	const cx = (sx[left] + sx[right] + sx[top] + sx[bottom]) / 4;
	const cy = (sy[left] + sy[right] + sy[top] + sy[bottom]) / 4;

	clothContent.style.transform = `translate(${cx - restCx}px, ${cy - restCy}px) matrix(${exX}, ${exY}, ${eyX}, ${eyY}, 0, 0)`;
}

function updateReset(now) {
	if (!state.dragging && state.resetAt && now >= state.resetAt) {
		state.resetAt = 0;
		state.resetStart = now;

		dragState.textContent = "RESETTING";
	}

	if (state.resetStart) {
		const elapsed = now - state.resetStart;

		const finished = elapsed > CONFIG.resetDuration && maxDisplacement() < 0.4;
		const timedOut = elapsed > CONFIG.resetDuration * 2;

		if (finished || timedOut) {
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
	let rest = CONFIG.restStiffness;

	if (state.resetStart) {
		const p = clamp((now - state.resetStart) / CONFIG.resetDuration, 0, 1);
		const ease = p * p * (3 - 2 * p);

		rest = lerp(CONFIG.restStiffness, CONFIG.restStiffness * CONFIG.resetRestMultiplier, ease);
		damping = lerp(CONFIG.damping, CONFIG.resetDamping, ease);
	}

	state.dx += (state.targetDx - state.dx) * 0.5;
	state.dy += (state.targetDy - state.dy) * 0.5;

	for (let n = 0; n < cluster.length; n++) {
		const item = cluster[n];

		qx[item.index] = x[item.index];
		qy[item.index] = y[item.index];
		qz[item.index] = z[item.index];
	}

	integrate(damping, rest);

	applyPins();

	solve();

	project();

	computeShading();

	draw(time);

	updateContent();

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
	const scale = length > CONFIG.maxPull ? CONFIG.maxPull / length : 1;

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

catButton.addEventListener("click", (event) => {
	event.stopPropagation();

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
	}
});
