const SKILLS = [
	{
		key: "apps",
		label: "Building applications",
		icons: [
			{ name: "Unity", src: "icons/unity.svg" },
			{ name: "C#", src: "icons/csharp (1).svg" },
			{ name: "Microsoft SQL Server", src: "icons/microsoftsqlserver.svg" },
			{ name: "MySQL", src: "icons/mysql.svg" },
			{ name: "PHP", src: "icons/php.svg" },
			{ name: "Selenium", src: "icons/selenium.svg" },
		],
	},

	{
		key: "web",
		label: "Web development",
		icons: [
			{ name: "HTML5", src: "icons/html5.svg" },
			{ name: "CSS3", src: "icons/css3-fill.svg" },
			{ name: "JavaScript", src: "icons/javascript.svg" },
			{ name: "Tailwind CSS", src: "icons/tailwindcss.svg" },
		],
	},

	{
		key: "video",
		label: "Video editing",
		icons: [
			{ name: "Final Cut Pro", src: "icons/icons8-final-cut-pro-x.svg" },
			{ name: "Premiere Pro", src: "icons/adobepremierepro.svg" },
			{ name: "After Effects", src: "icons/adobeaftereffects.svg" },
		],
	},

	{
		key: "design",
		label: "Design",
		icons: [
			{ name: "Photoshop", src: "icons/adobephotoshop.svg" },
			{ name: "Illustrator", src: "icons/adobeillustrator.svg" },
			{ name: "Adobe XD", src: "icons/adobexd.svg" },
			{ name: "InDesign", src: "icons/adobeindesign.svg" },
		],
	},
];

const TIMING = {
	startDelay: 900,
	collapsedHold: 900,
	openHold: 3200,
	collapseTime: 500,
	gap: 350,
};

const root = document.getElementById("skills");
const stage = document.getElementById("skillStage");
const dotBox = document.getElementById("skillDots");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const pills = [];
const dots = [];

let run = 0;
let paused = false;

root.classList.add("js");

SKILLS.forEach((skill, index) => {
	const pill = document.createElement("button");

	pill.type = "button";
	pill.className = "skill-pill";
	pill.dataset.skill = skill.key;
	pill.setAttribute("aria-expanded", "false");

	const label = document.createElement("span");

	label.className = "skill-label";
	label.textContent = skill.label;

	const reveal = document.createElement("span");

	reveal.className = "skill-reveal";

	const icons = document.createElement("span");

	icons.className = "skill-icons";

	skill.icons.forEach((icon, order) => {
		const tile = document.createElement("span");

		tile.className = "skill-icon";
		tile.title = icon.name;
		tile.style.setProperty("--i", order);

		const image = document.createElement("img");

		image.src = encodeURI(icon.src);
		image.alt = icon.name;
		image.draggable = false;

		image.addEventListener("error", () => tile.remove());

		tile.appendChild(image);
		icons.appendChild(tile);
	});

	reveal.appendChild(icons);

	pill.append(label, reveal);

	pill.addEventListener("click", () => onPill(index));

	stage.appendChild(pill);

	pills.push(pill);

	const dot = document.createElement("button");

	dot.type = "button";
	dot.className = "skill-dot";
	dot.dataset.skill = skill.key;
	dot.setAttribute("aria-label", `Show ${skill.label}`);

	dot.addEventListener("click", () => jump(index, true));

	dotBox.appendChild(dot);

	dots.push(dot);
});

function activate(index) {
	pills.forEach((pill, i) => {
		if (i !== index) {
			pill.classList.remove("show", "open");
			pill.setAttribute("aria-expanded", "false");
		}
	});

	pills[index].classList.add("show");

	dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
}

function setOpen(index, open) {
	pills[index].classList.toggle("open", open);
	pills[index].setAttribute("aria-expanded", String(open));
}

function wait(token, ms) {
	return new Promise((resolve) => {
		let left = ms;
		let last = performance.now();

		const tick = () => {
			if (token !== run) {
				resolve(false);

				return;
			}

			const now = performance.now();

			if (!paused && !document.hidden) {
				left -= now - last;
			}

			last = now;

			if (left <= 0) {
				resolve(true);
			} else {
				setTimeout(tick, 50);
			}
		};

		tick();
	});
}

async function play(token, index, phase) {
	let i = index;
	let current = phase;

	while (token === run) {
		if (current === "enter") {
			activate(i);

			if (!(await wait(token, TIMING.collapsedHold))) return;

			current = "collapsed";
		}

		if (current === "collapsed") {
			setOpen(i, true);

			current = "expanded";
		}

		if (current === "expanded") {
			if (!(await wait(token, TIMING.openHold))) return;

			setOpen(i, false);

			current = "leave";
		}

		if (current === "leave") {
			if (!(await wait(token, TIMING.collapseTime))) return;

			pills[i].classList.remove("show");

			if (!(await wait(token, TIMING.gap))) return;

			i = (i + 1) % pills.length;

			current = "enter";
		}
	}
}

function jump(index, open) {
	run++;

	activate(index);
	setOpen(index, open);

	if (!reduceMotion) {
		play(run, index, open ? "expanded" : "leave");
	}
}

function onPill(index) {
	const open = pills[index].classList.contains("open");

	if (reduceMotion) {
		setOpen(index, !open);

		return;
	}

	if (open) {
		run++;

		setOpen(index, false);

		play(run, index, "leave");
	} else {
		jump(index, true);
	}
}

[stage, dotBox].forEach((element) => {
	element.addEventListener("pointerenter", (event) => {
		if (event.pointerType === "mouse") {
			paused = true;
		}
	});

	element.addEventListener("pointerleave", () => {
		paused = false;
	});

	element.addEventListener("focusin", () => {
		paused = true;
	});

	element.addEventListener("focusout", () => {
		paused = false;
	});
});

if (reduceMotion) {
	activate(0);
	setOpen(0, true);
} else {
	setTimeout(() => {
		if (run === 0) {
			play(++run, 0, "enter");
		}
	}, TIMING.startDelay);
}
