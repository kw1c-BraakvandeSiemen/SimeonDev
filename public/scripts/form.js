const form = document.getElementById("emailForm");

form.addEventListener("submit", function handleSubmit(event) {
	event.preventDefault();

	// verstuur de data naar de server
	const data = new FormData(event.target);
	const xhr = new XMLHttpRequest();
	xhr.open(form.method, form.action);
	xhr.setRequestHeader("Accept", "application/json");
	xhr.onreadystatechange = function () {
		if (xhr.readyState !== XMLHttpRequest.DONE) return;
		if (xhr.status === 200) {
			form.reset();
			document.getElementById("submitButton").innerText = "Bericht is verzonden!";
			document.getElementById("submitButton").classList.add("!bg-green-500");
			setTimeout(() => {
				document.getElementById("submitButton").classList.remove("!bg-green-500");
				document.getElementById("submitButton").innerText = "Verstuur";
			}, 3000);
			// save data to localStorage so that the same person can't send another message for 5 minutes
			localStorage.setItem("lastMessageSent", Date.now());
		} else {
			document.getElementById("submitButton").innerText = "Er is iets misgegaan. Probeer het later nog eens.";
			document.getElementById("submitButton").classList.add("!bg-red-500");
			setTimeout(() => {
				document.getElementById("submitButton").classList.remove("!bg-red-500");
				document.getElementById("submitButton").innerText = "Verstuur";
			}, 3000);
		}
	};
	xhr.send(data);

	// reset form
	form.reset();
});
