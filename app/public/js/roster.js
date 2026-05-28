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
                listElem.onclick = () => {
                    location.href = "coach";
                };

                sideBar.appendChild(listElem);
            }
        }
    });

fetch("api/roster")
    .then((res) => res.json())
    .then((data) => {
        if (data.success) {
            const container = document.getElementById("sections-wrapper");
            data.roster.forEach((category) => {
                const categorySection = document.createElement("div");
                categorySection.className = "roster-section";

                const title = document.createElement("h2");
                title.textContent = `${category.title}`;

                const photoGrid = document.createElement("div");
                photoGrid.className = "roster-grid";

                category.players.forEach((player) => {
                    const playerCard = document.createElement("div");
                    playerCard.className = "roster-card";

                    const playerImg = document.createElement("img");
                    playerImg.className = "roster-img";
                    const formattedFirstName = player.first_name
                        .toLowerCase()
                        .trim();
                    const formattedLastName = player.last_name
                        .toLowerCase()
                        .trim();
                    const expectedPhotoName = `${formattedFirstName}_${formattedLastName}.jpg`;
                    playerImg.src = `/photos/profiles/${expectedPhotoName}`;

                    playerImg.onerror = function () {
                        this.onerror = null;
                        this.src = "photos/profiles/billy.jpg";
                    };

                    const playerName = document.createElement("h4");
                    playerName.className = "roster-name";
                    playerName.textContent = `${player.first_name}`;

                    const playerPos = document.createElement("p");
                    playerPos.className = "roster-pos";
                    playerPos.textContent = `${player.preferred_position}`;

                    playerCard.append(playerImg, playerName, playerPos);
                    photoGrid.appendChild(playerCard);
                });

                categorySection.append(title, photoGrid);
                container.appendChild(categorySection);
            });
        }
    });

document.getElementById("logout-btn").addEventListener("click", () => {
    fetch("api/logout", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
            if (data.success) window.location.href = "./";
        });
});
