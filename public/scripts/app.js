const cloth = document.getElementById("cloth");
const fold = document.getElementById("clothFold");

const dragState = document.getElementById("dragState");

const catButton = document.getElementById("catButton");
const meow = document.getElementById("meow");

/* =========================================================
   SETTINGS
   ========================================================= */

const settings = {
	maxX: 230,
	maxY: 160,

	follow: 0.17,

	spring: 0.055,

	damping: 0.8,

	maxRotation: 8,

	maxStretch: 0.055,

	clickThreshold: 5,
};

/* =========================================================
   STATE
   ========================================================= */

const state = {
	dragging: false,

	pointerDown: false,

	pointerId: null,

	startPointerX: 0,
	startPointerY: 0,

	pointerX: 0,
	pointerY: 0,

	previousX: 0,
	previousY: 0,

	x: 0,
	y: 0,

	velocityX: 0,
	velocityY: 0,

	rotation: 0,

	targetX: 0,
	targetY: 0,

	targetRotation: 0,

	foldX: 0,
	foldY: 0,

	foldOpacity: 0,
};

/* =========================================================
   CAT
   ========================================================= */

const catMessages = ["meow", "meow meow?", "meow meow meow...", "MEOW?!", "MEOOOOOOOOOOOOOOOOOOOOOOW!"];

const catPositions = [
	{
		right: "44px",
		top: "4px",
	},

	{
		right: "92px",
		top: "24px",
	},

	{
		right: "25px",
		top: "38px",
	},

	{
		right: "115px",
		top: "2px",
	},

	{
		right: "58px",
		top: "54px",
	},
];

const catRotations = [-8, 10, -14, 12, -18];

const catScales = [1.12, 1.18, 1.25, 1.32, 1.42];

let catClickCount = 0;

/* =========================================================
   CAT CLICK
   ========================================================= */

catButton.addEventListener("click", function (event) {
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

	catButton.animate(
		[
			{
				transform: "rotate(0deg) scale(1)",
			},

			{
				transform: `rotate(${catRotations[index]}deg)
					scale(${catScales[index]})`,
			},

			{
				transform: "rotate(0deg) scale(1)",
			},
		],
		{
			duration: 360 + catClickCount * 70,

			easing: "ease-out",
		},
	);

	clearTimeout(catButton.meowTimeout);

	catButton.meowTimeout = setTimeout(
		function () {
			meow.classList.remove("show");
		},
		1100 + catClickCount * 300,
	);
});

/* =========================================================
   HELPERS
   ========================================================= */

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function lerp(current, target, amount) {
	return current + (target - current) * amount;
}

/* =========================================================
   POINTER DOWN
   ========================================================= */

cloth.addEventListener("pointerdown", function (event) {
	if (event.target.closest("a, button")) {
		return;
	}

	state.pointerDown = true;

	state.dragging = true;

	state.pointerId = event.pointerId;

	state.startPointerX = event.clientX;

	state.startPointerY = event.clientY;

	state.pointerX = event.clientX;

	state.pointerY = event.clientY;

	state.previousX = event.clientX;

	state.previousY = event.clientY;

	state.velocityX = 0;

	state.velocityY = 0;

	cloth.classList.add("dragging");

	dragState.textContent = "DRAGGING";

	try {
		cloth.setPointerCapture(event.pointerId);
	} catch (error) {
		// Nothing to do.
	}

	event.preventDefault();
});

/* =========================================================
   POINTER MOVE
   ========================================================= */

cloth.addEventListener("pointermove", function (event) {
	if (!state.pointerDown) {
		return;
	}

	if (state.pointerId !== null && event.pointerId !== state.pointerId) {
		return;
	}

	state.pointerX = event.clientX;

	state.pointerY = event.clientY;

	const dx = event.clientX - state.previousX;

	const dy = event.clientY - state.previousY;

	state.previousX = event.clientX;

	state.previousY = event.clientY;

	/*
	 * De cloth volgt de muis.
	 */

	state.targetX = clamp(
		event.clientX - state.startPointerX,

		-settings.maxX,

		settings.maxX,
	);

	state.targetY = clamp(
		event.clientY - state.startPointerY,

		-settings.maxY,

		settings.maxY,
	);

	/*
	 * Snelheid.
	 */

	state.velocityX = lerp(state.velocityX, dx, 0.45);

	state.velocityY = lerp(state.velocityY, dy, 0.45);

	/*
	 * Rotatie.
	 */

	state.targetRotation = clamp(
		state.velocityX * 0.55,

		-settings.maxRotation,

		settings.maxRotation,
	);

	/*
	 * Fold positie.
	 */

	const rect = cloth.getBoundingClientRect();

	state.foldX = event.clientX - rect.left;

	state.foldY = event.clientY - rect.top;

	state.foldOpacity = clamp(
		(Math.abs(dx) + Math.abs(dy)) / 20,

		0.25,
		0.85,
	);
});

/* =========================================================
   POINTER UP
   ========================================================= */

function releaseCloth(event) {
	if (!state.pointerDown) {
		return;
	}

	if (state.pointerId !== null && event.pointerId !== state.pointerId) {
		return;
	}

	const movedX = event.clientX - state.startPointerX;

	const movedY = event.clientY - state.startPointerY;

	const distance = Math.sqrt(movedX * movedX + movedY * movedY);

	const wasClick = distance < settings.clickThreshold;

	state.pointerDown = false;

	state.pointerId = null;

	if (wasClick) {
		state.dragging = false;

		cloth.classList.remove("dragging");

		dragState.textContent = "READY";

		return;
	}

	state.dragging = false;

	state.targetX = 0;

	state.targetY = 0;

	state.targetRotation = 0;

	cloth.classList.remove("dragging");

	dragState.textContent = "RELEASING";

	try {
		cloth.releasePointerCapture(event.pointerId);
	} catch (error) {
		// Nothing to do.
	}
}

cloth.addEventListener("pointerup", releaseCloth);

cloth.addEventListener("pointercancel", function () {
	state.pointerDown = false;

	state.dragging = false;

	state.pointerId = null;

	cloth.classList.remove("dragging");

	dragState.textContent = "READY";
});

/* =========================================================
   PHYSICS
   ========================================================= */

function updatePhysics() {
	if (state.dragging) {
		state.x = lerp(state.x, state.targetX, settings.follow);

		state.y = lerp(state.y, state.targetY, settings.follow);

		state.rotation = lerp(state.rotation, state.targetRotation, 0.14);
	} else {
		/*
		 * Spring physics.
		 */

		const forceX = -state.x * settings.spring;

		const forceY = -state.y * settings.spring;

		state.velocityX += forceX;

		state.velocityY += forceY;

		state.velocityX *= settings.damping;

		state.velocityY *= settings.damping;

		state.x += state.velocityX;

		state.y += state.velocityY;

		state.rotation = lerp(state.rotation, 0, 0.08);
	}

	/* =====================================================
	   STRETCH
	   ===================================================== */

	const movement = Math.sqrt(state.x * state.x + state.y * state.y);

	const stretch = clamp(movement * 0.00028, 0, settings.maxStretch);

	const scaleX = 1 + stretch;

	const scaleY = 1 - stretch * 0.45;

	/* =====================================================
	   SKEW
	   ===================================================== */

	const skewX = clamp(state.velocityX * 0.055, -3.5, 3.5);

	const skewY = clamp(state.velocityY * 0.025, -2, 2);

	/* =====================================================
	   APPLY TRANSFORM
	   ===================================================== */

	cloth.style.setProperty("--move-x", `${state.x.toFixed(2)}px`);

	cloth.style.setProperty("--move-y", `${state.y.toFixed(2)}px`);

	cloth.style.setProperty("--rotate", `${state.rotation.toFixed(2)}deg`);

	cloth.style.setProperty("--scale-x", scaleX.toFixed(4));

	cloth.style.setProperty("--scale-y", scaleY.toFixed(4));

	cloth.style.setProperty("--skew-x", `${skewX.toFixed(2)}deg`);

	cloth.style.setProperty("--skew-y", `${skewY.toFixed(2)}deg`);

	/* =====================================================
	   FOLD
	   ===================================================== */

	if (state.dragging) {
		fold.style.opacity = state.foldOpacity.toFixed(2);

		const foldScale = 0.75 + Math.min(movement / 450, 0.8);

		fold.style.transform = `translate(
				${state.foldX}px,
				${state.foldY}px
			)
			translate(-50%, -50%)
			scale(
				${foldScale.toFixed(2)}
			)`;
	} else {
		state.foldOpacity = lerp(state.foldOpacity, 0, 0.12);

		fold.style.opacity = state.foldOpacity.toFixed(2);
	}

	/* =====================================================
	   RESET
	   ===================================================== */

	if (!state.dragging && Math.abs(state.x) < 0.15 && Math.abs(state.y) < 0.15 && Math.abs(state.velocityX) < 0.1 && Math.abs(state.velocityY) < 0.1) {
		state.x = 0;

		state.y = 0;

		state.velocityX = 0;

		state.velocityY = 0;

		state.rotation = 0;

		dragState.textContent = "READY";
	}
}

/* =========================================================
   ANIMATION LOOP
   ========================================================= */

function animate() {
	updatePhysics();

	requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

/* =========================================================
   HOVER
   ========================================================= */

cloth.addEventListener("pointerenter", function () {
	if (!state.pointerDown) {
		dragState.textContent = "GRAB ME";
	}
});

cloth.addEventListener("pointerleave", function () {
	if (!state.pointerDown) {
		dragState.textContent = "READY";
	}
});
