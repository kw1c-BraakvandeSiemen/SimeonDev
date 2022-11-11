//Darkmode functie van tailwind
const parent = document.querySelector("html");
function toggleDarkMode() {
	parent.classList.toggle("dark");
	if (parent.classList.contains("dark")) {
		//zon
		document.getElementById("darkModeToggle").innerHTML = '<svg class="animate-[spin_15s_linear_infinite] h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fill-rule="evenodd" clip-rule="evenodd"></path></svg>';
		localStorage.theme = "dark";
	}
	//maan
	else {
		document.getElementById("darkModeToggle").innerHTML = '<svg class="animate-[pulse_3s_cubic-bezier(0.4,_0,_0.6,_1)_infinite] h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>';
		localStorage.theme = "light";
	}
}

if (localStorage.theme === "dark") {
	document.getElementById("darkModeToggle").innerHTML = '<svg class="animate-[spin_15s_linear_infinite] h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fill-rule="evenodd" clip-rule="evenodd"></path></svg>';

	parent.classList.add("dark");
} else if (localStorage.theme === "light") {
	document.getElementById("darkModeToggle").innerHTML = '<svg class="animate-[pulse_3s_cubic-bezier(0.4,_0,_0.6,_1)_infinite] h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>';

	parent.classList.remove("dark");
} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
	document.getElementById("darkModeToggle").innerHTML = '<svg class="animate-[spin_15s_linear_infinite] h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fill-rule="evenodd" clip-rule="evenodd"></path></svg>';

	parent.classList.add("dark");
} else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
	document.getElementById("darkModeToggle").innerHTML = '<svg class="animate-[pulse_3s_cubic-bezier(0.4,_0,_0.6,_1)_infinite] h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>';

	parent.classList.remove("dark");
} else {
	document.getElementById("darkModeToggle").innerHTML = '<svg class="animate-[pulse_3s_cubic-bezier(0.4,_0,_0.6,_1)_infinite] h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>';

	parent.classList.remove("dark");
}

function colorscheme() {
	if (localStorage.theme === "dark" || (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
		if (!document.getElementById("parent").classList.contains("dark")) {
			document.getElementById("parent").classList.add("dark");
		}
	} else {
		document.getElementById("parent").classList.remove("dark");
	}
}

// detect when the user changes their OS theme
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
	localStorage.removeItem("theme");
	colorscheme();
});

colorscheme();
