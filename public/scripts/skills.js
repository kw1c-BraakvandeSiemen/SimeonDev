const SKILLS = [
	{
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
		label: "Web development",
		icons: [
			{ name: "HTML5", src: "icons/html5.svg" },
			{ name: "CSS3", src: "icons/css3-fill.svg" },
			{ name: "JavaScript", src: "icons/javascript.svg" },
			{ name: "Tailwind CSS", src: "icons/tailwindcss.svg" },
		],
	},

	{
		label: "Video editing",
		icons: [
			{ name: "Final Cut Pro", src: "icons/icons8-final-cut-pro-x.svg" },
			{ name: "Premiere Pro", src: "icons/adobepremierepro.svg" },
			{ name: "After Effects", src: "icons/adobeaftereffects.svg" },
		],
	},

	{
		label: "Design",
		icons: [
			{ name: "Photoshop", src: "icons/adobephotoshop.svg" },
			{ name: "Illustrator", src: "icons/adobeillustrator.svg" },
			{ name: "Adobe XD", src: "icons/adobexd.svg" },
			{ name: "InDesign", src: "icons/adobeindesign.svg" },
		],
	},
];

const SPEED = 26;
const TOUCH_HOLD = 3500;
const RESUME_DELAY = 180;

const root = document.getElementById("skills");
const track = document.getElementById("skillsTrack");
const caption = document.getElementById("skillsCaption");
const list = document.getElementById("skillsList");

const defaultCaption = caption ? caption.textContent : "";

let activeTile = null;
let resumeTimer = 0;
let lastPointer = "mouse";

function loadIcon(icon) {
	return new Promise((resolve) => {
		const image = new Image();

		image.onload = () => resolve({ ...icon, ok: true });
		image.onerror = () => resolve({ ...icon, ok: false });

		image.src = encodeURI(icon.src);
	});
}

async function resolveSkills() {
	const groups = await Promise.all(
		SKILLS.map(async (skill) => ({
			label: skill.label,
			icons: (await Promise.all(skill.icons.map(loadIcon))).filter((icon) => icon.ok),
		})),
	);

	return groups.filter((group) => group.icons.length > 0);
}

function buildCopy(groups) {
	const copy = document.createElement("div");

	copy.className = "skills-copy";

	groups.forEach((group) => {
		const label = document.createElement("span");

		label.className = "skill-group";
		label.textContent = group.label;

		copy.appendChild(label);

		group.icons.forEach((icon) => {
			const tile = document.createElement("span");

			tile.className = "skill";
			tile.dataset.name = icon.name;

			const image = document.createElement("img");

			image.src = encodeURI(icon.src);
			image.alt = "";
			image.draggable = false;

			tile.appendChild(image);
			copy.appendChild(tile);
		});

		const separator = document.createElement("span");

		separator.className = "skill-sep";

		copy.appendChild(separator);
	});

	return copy;
}

function buildList(groups) {
	groups.forEach((group) => {
		const item = document.createElement("li");

		item.textContent = `${group.label}: ${group.icons.map((icon) => icon.name).join(", ")}`;

		list.appendChild(item);
	});
}

function updateSpeed() {
	const first = track.firstElementChild;

	if (first) {
		track.style.setProperty("--dur", `${first.offsetWidth / SPEED}s`);
	}
}

function setCaption(text) {
	if (caption.textContent === text) {
		return;
	}

	caption.textContent = text;

	caption.classList.remove("swap");

	void caption.offsetWidth;

	caption.classList.add("swap");
}

function setActive(tile) {
	if (activeTile) {
		activeTile.classList.remove("active");
	}

	activeTile = tile;

	if (tile) {
		tile.classList.add("active");
	}
}

function hold(tile) {
	clearTimeout(resumeTimer);

	track.classList.add("paused");

	setActive(tile);
	setCaption(tile.dataset.name);
}

function release(delay = 0) {
	clearTimeout(resumeTimer);

	resumeTimer = setTimeout(() => {
		track.classList.remove("paused");

		setActive(null);
		setCaption(defaultCaption);
	}, delay);
}

function bindInteraction() {
	track.addEventListener("pointerdown", (event) => {
		lastPointer = event.pointerType;
	});

	track.addEventListener("pointerover", (event) => {
		const tile = event.target.closest(".skill");

		if (!tile || event.pointerType === "touch") {
			return;
		}

		hold(tile);
	});

	track.addEventListener("pointerout", (event) => {
		if (event.pointerType === "touch") {
			return;
		}

		const next = event.relatedTarget && event.relatedTarget.closest ? event.relatedTarget.closest(".skill") : null;

		if (!next) {
			release(RESUME_DELAY);
		}
	});

	track.addEventListener("click", (event) => {
		const tile = event.target.closest(".skill");

		if (!tile || lastPointer === "mouse") {
			return;
		}

		if (tile === activeTile) {
			release();

			return;
		}

		hold(tile);

		release(TOUCH_HOLD);
	});
}

async function init() {
	if (!root || !track || !caption || !list) {
		return;
	}

	const groups = await resolveSkills();

	if (groups.length === 0) {
		return;
	}

	track.append(buildCopy(groups), buildCopy(groups));

	buildList(groups);

	root.classList.add("js");

	updateSpeed();

	bindInteraction();

	window.addEventListener("resize", updateSpeed);

	if (document.fonts && document.fonts.ready) {
		document.fonts.ready.then(updateSpeed);
	}
}

init();
