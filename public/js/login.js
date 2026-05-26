const form = document.getElementById("login-form");
const errorBox = document.getElementById("error-message");

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (email === "" || password === "") {
        errorBox.textContent = "Please fill in both your email and password.";
        errorBox.style.display = "block";
        return;
    }

    fetch("/app/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                errorBox.style.display = "none";
                window.location.href = "/app/dashboard.html";
            } else {
                errorBox.textContent = data.message;
                errorBox.style.display = "block";
            }
        })
        .catch((error) => {
            errorBox.textContent = "Cannot connect to server.";
            errorBox.style.display = "block";
        });
});
