const form = document.getElementById("emailForm");

form.addEventListener("submit", function handleSubmit(event) {
  event.preventDefault();

  // check if user sent an email within the last hour
  if (localStorage.getItem("lastMessageSent") !== null) {
    const lastMessageSent = localStorage.getItem("lastMessageSent");
    const timeSinceLastMessageSent = Date.now() - lastMessageSent;
    if (timeSinceLastMessageSent < 3600000) {
      document.getElementById("submitButton").innerText = "You have already sent a message in the last hour. Please wait before sending another one.";
      document.getElementById("submitButton").classList.add("!bg-red-500");
      document.getElementById("submitButton").disabled = true;
      return;
    }
  }

  // send data to server
  const data = new FormData(event.target);
  const xhr = new XMLHttpRequest();
  xhr.open(form.method, form.action);
  xhr.setRequestHeader("Accept", "application/json");
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== XMLHttpRequest.DONE) return;
    if (xhr.status === 200) {
      form.reset();
      document.getElementById("submitButton").innerText = "Message has been sent ✅!";
      document.getElementById("submitButton").classList.add("!bg-green-500");
      setTimeout(() => {
        document.getElementById("submitButton").classList.remove("!bg-green-500");
        document.getElementById("submitButton").innerText = "Send message";
      }, 3000);
      // save data to localStorage so that the same person can't send another message for 5 minutes
      localStorage.setItem("lastMessageSent", Date.now());
    } else {
      document.getElementById("submitButton").innerText = "Oops! There was a problem 😞.";
      document.getElementById("submitButton").classList.add("!bg-red-500");
      setTimeout(() => {
        document.getElementById("submitButton").classList.remove("!bg-red-500");
        document.getElementById("submitButton").innerText = "Send message";
      }, 3000);
    }
  };
  xhr.send(data);

  // reset form
  form.reset();
});

// check if the user has sent a message in the last hour
if (localStorage.getItem("lastMessageSent") !== null) {
  const lastMessageSent = localStorage.getItem("lastMessageSent");
  const oneHourAgo = Date.now() - 3600000;
  if (lastMessageSent > oneHourAgo) {
    document.getElementById("submitButton").innerText = "You have already sent a message in the last hour. Please wait before sending another one.";
    document.getElementById("submitButton").classList.add("!bg-red-500");
    document.getElementById("submitButton").disabled = true;
  }
}
