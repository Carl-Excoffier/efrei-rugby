fetch("api/user")
    .then((res) => res.json())
    .then((data) => {
        if (data.success) {
            if (
                data.user.roster_category === "coaches" ||
                data.user.preferred_position === "Admin"
            ) {
                const sideBar = document.getElementById("sidebar-list");
                const listElem = document.createElement("li");
                listElem.textContent = "Coach Panel";
                listElem.onclick = "location.href = 'coach'";

                sideBar.appendChild(listElem);
            }
        }
    });

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

    fetch("api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                errorBox.style.display = "none";
                window.location.href = "dashboard";
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
