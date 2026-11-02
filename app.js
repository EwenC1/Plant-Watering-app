// ============================================================
// app.js — what your site DOES.
// Plain JavaScript, no libraries, no installs.
// It uses STARTUP and LISTINGS from data.js (loaded first).
// ============================================================

(function () {
  "use strict";

  const storageKey = "tend-plants-v1";
  const notificationKey = "tend-notified-v1";
  const membershipKey = "tend-plan-v1";

  const storage = {
    get: function (key, fallback) {
      try {
        const saved = localStorage.getItem(key);
        return saved === null ? fallback : JSON.parse(saved);
      } catch (error) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
      }
    }
  };

  function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function dateOffset(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return localDateString(date);
  }

  function daysBetween(first, second) {
    const firstParts = first.split("-").map(Number);
    const secondParts = second.split("-").map(Number);
    const firstTime = Date.UTC(firstParts[0], firstParts[1] - 1, firstParts[2]);
    const secondTime = Date.UTC(secondParts[0], secondParts[1] - 1, secondParts[2]);
    return Math.round((secondTime - firstTime) / 86400000);
  }

  function displayDate(value) {
    const parts = value.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
  }

  const savedPlants = storage.get(storageKey, null);
  let plants = Array.isArray(savedPlants) ? savedPlants : PLANT_STARTERS.map(function (plant) {
    return {
      id: plant.id,
      name: plant.name,
      species: plant.species,
      interval: plant.interval,
      lastWatered: dateOffset(plant.daysAgo),
      image: plant.image
    };
  });
  if (savedPlants === null) storage.set(storageKey, plants);
  let notifiedDates = storage.get(notificationKey, {});
  let isPlus = storage.get(membershipKey, "free") === "plus";

  const plantGrid = document.getElementById("plant-grid");
  const emptyState = document.getElementById("empty-state");
  const plantDialog = document.getElementById("plant-dialog");
  const plantForm = document.getElementById("plant-form");
  const gardenMessage = document.getElementById("garden-message");
  const notificationButton = document.getElementById("notification-button");
  const notificationLabel = document.getElementById("notification-label");
  const sortControl = document.getElementById("plant-sort");
  const upgradeDialog = document.getElementById("upgrade-dialog");
  const activatePlusButton = document.getElementById("activate-plus-button");

  function updatePlanDisplay() {
    document.getElementById("plan-status").textContent = isPlus
      ? "Tend Plus demo · unlimited plants"
      : "Free plan · " + plants.length + " of 5 plants";
    document.getElementById("plan-description").textContent = isPlus
      ? "Plus is active on this device. No payment has been taken."
      : "Upgrade for unlimited plants and a bigger garden to grow into.";
    document.getElementById("free-plan-label").textContent = isPlus ? "Free plan" : "Your current plan";
    activatePlusButton.textContent = isPlus ? "Plus demo active" : "Try Plus demo";
    activatePlusButton.disabled = isPlus;
  }

  function daysUntilWatered(plant) {
    return Number(plant.interval) - daysBetween(plant.lastWatered, localDateString(new Date()));
  }

  function statusText(daysUntil) {
    if (daysUntil < 0) return "Overdue by " + Math.abs(daysUntil) + (Math.abs(daysUntil) === 1 ? " day" : " days");
    if (daysUntil === 0) return "Water today";
    if (daysUntil === 1) return "Water tomorrow";
    return "Water in " + daysUntil + " days";
  }

  function makePlantCard(plant) {
    const daysUntil = daysUntilWatered(plant);
    const isDue = daysUntil <= 0;
    const card = document.createElement("article");
    card.className = "plant-card" + (isDue ? " is-due" : "");

    const imageWrap = document.createElement("div");
    imageWrap.className = "plant-image-wrap";
    const image = document.createElement("img");
    image.className = "plant-image";
    image.src = plant.image || PLANT_STARTERS[0].image;
    image.alt = plant.name;
    image.loading = "lazy";
    image.addEventListener("error", function () {
      imageWrap.classList.add("image-fallback");
      image.hidden = true;
    });
    const imageLabel = document.createElement("span");
    imageLabel.className = "image-label";
    imageLabel.textContent = plant.name.charAt(0).toUpperCase();
    imageWrap.append(image, imageLabel);

    const details = document.createElement("div");
    details.className = "plant-details";
    const title = document.createElement("h3");
    title.textContent = plant.name;
    const species = document.createElement("p");
    species.className = "plant-species";
    species.textContent = plant.species || "Your plant";
    const schedule = document.createElement("p");
    schedule.className = "plant-schedule";
    schedule.textContent = "Every " + plant.interval + " days · Last watered " + displayDate(plant.lastWatered);
    details.append(title, species, schedule);

    const footer = document.createElement("div");
    footer.className = "plant-card-footer";
    const status = document.createElement("span");
    status.className = "water-status" + (isDue ? " status-due" : "");
    status.textContent = statusText(daysUntil);
    const wateredButton = document.createElement("button");
    wateredButton.className = "water-button";
    wateredButton.type = "button";
    wateredButton.textContent = "Watered today";
    wateredButton.setAttribute("aria-label", "Mark " + plant.name + " as watered today");
    wateredButton.addEventListener("click", function () {
      plant.lastWatered = localDateString(new Date());
      storage.set(storageKey, plants);
      gardenMessage.textContent = plant.name + " marked as watered today.";
      renderPlants();
    });
    const removeButton = document.createElement("button");
    removeButton.className = "remove-button";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", "Remove " + plant.name);
    removeButton.addEventListener("click", function () {
      plants = plants.filter(function (item) { return item.id !== plant.id; });
      storage.set(storageKey, plants);
      gardenMessage.textContent = plant.name + " removed from your garden.";
      renderPlants();
    });
    footer.append(status, wateredButton, removeButton);

    card.append(imageWrap, details, footer);
    return { card: card, daysUntil: daysUntil };
  }

  function renderPlants() {
    const today = new Date();
    document.getElementById("today-label").textContent = today.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric"
    }).toUpperCase();

    const dueCount = plants.filter(function (plant) { return daysUntilWatered(plant) <= 0; }).length;
    document.getElementById("plant-count").textContent = plants.length;
    document.getElementById("plant-total").textContent = plants.length;
    document.getElementById("due-count").textContent = dueCount;
    document.getElementById("healthy-count").textContent = plants.length - dueCount;
    updatePlanDisplay();
    emptyState.hidden = plants.length > 0;
    plantGrid.hidden = plants.length === 0;

    const rendered = plants.map(makePlantCard);
    if (sortControl.value === "name") {
      rendered.sort(function (first, second) {
        return first.card.querySelector("h3").textContent.localeCompare(second.card.querySelector("h3").textContent);
      });
    } else {
      rendered.sort(function (first, second) { return first.daysUntil - second.daysUntil; });
    }
    plantGrid.replaceChildren.apply(plantGrid, rendered.map(function (item) { return item.card; }));
    renderAgenda();
    checkReminders();
  }

  function renderAgenda() {
    const agendaList = document.getElementById("agenda-list");
    if (plants.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "agenda-empty";
      emptyMessage.textContent = "Add a plant to see your upcoming watering days.";
      agendaList.replaceChildren(emptyMessage);
      return;
    }

    const days = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      const scheduledPlants = plants.filter(function (plant) {
        const daysUntil = daysUntilWatered(plant);
        return offset === 0 ? daysUntil <= 0 : daysUntil === offset;
      });
      const row = document.createElement("div");
      row.className = "agenda-day" + (offset === 0 ? " is-today" : "");

      const dateGroup = document.createElement("div");
      dateGroup.className = "agenda-date-group";
      const dayName = document.createElement("strong");
      dayName.textContent = offset === 0
        ? "Today"
        : offset === 1
          ? "Tomorrow"
          : date.toLocaleDateString(undefined, { weekday: "short" });
      const calendarDate = document.createElement("span");
      calendarDate.textContent = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      dateGroup.append(dayName, calendarDate);

      const description = document.createElement("span");
      description.className = "agenda-plants" + (scheduledPlants.length ? " has-plants" : "");
      description.textContent = scheduledPlants.length
        ? scheduledPlants.map(function (plant) { return plant.name; }).join(", ")
        : "No plants due";

      const count = document.createElement("span");
      count.className = "agenda-count" + (scheduledPlants.length && offset === 0 ? " needs-water" : "");
      count.textContent = scheduledPlants.length
        ? scheduledPlants.length + (scheduledPlants.length === 1 ? " plant" : " plants")
        : "Clear";

      row.append(dateGroup, description, count);
      days.push(row);
    }
    agendaList.replaceChildren.apply(agendaList, days);
  }

  function checkReminders() {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    plants.forEach(function (plant) {
      if (daysUntilWatered(plant) <= 0 && notifiedDates[plant.id] !== plant.lastWatered) {
        new Notification("Time to water " + plant.name, {
          body: "It's due for a drink. Mark it watered when you're done.",
          tag: "tend-" + plant.id
        });
        notifiedDates[plant.id] = plant.lastWatered;
      }
    });
    storage.set(notificationKey, notifiedDates);
  }

  function updateNotificationButton() {
    if (typeof Notification === "undefined") {
      notificationLabel.textContent = "Alerts unavailable";
      notificationButton.disabled = true;
      notificationButton.title = "This browser does not support notifications.";
    } else if (Notification.permission === "granted") {
      notificationLabel.textContent = "Reminders on";
      notificationButton.setAttribute("aria-pressed", "true");
    } else if (Notification.permission === "denied") {
      notificationLabel.textContent = "Alerts blocked";
      notificationButton.disabled = true;
      notificationButton.title = "Allow notifications in your browser settings to enable reminders.";
    }
  }

  function openPlantDialog() {
    if (!isPlus && plants.length >= 5) {
      upgradeDialog.showModal();
      gardenMessage.textContent = "The free plan includes up to 5 plants.";
      return;
    }
    document.getElementById("last-watered-input").value = localDateString(new Date());
    plantDialog.showModal();
    plantForm.elements.name.focus();
  }

  document.getElementById("add-plant-button").addEventListener("click", openPlantDialog);
  document.getElementById("empty-add-button").addEventListener("click", openPlantDialog);
  document.getElementById("close-dialog-button").addEventListener("click", function () { plantDialog.close(); });
  document.getElementById("cancel-dialog-button").addEventListener("click", function () { plantDialog.close(); });
  document.getElementById("upgrade-button").addEventListener("click", function () { upgradeDialog.showModal(); });
  document.getElementById("view-plans-button").addEventListener("click", function () { upgradeDialog.showModal(); });
  document.getElementById("close-upgrade-button").addEventListener("click", function () { upgradeDialog.close(); });
  activatePlusButton.addEventListener("click", function () {
    if (isPlus) return;
    isPlus = true;
    storage.set(membershipKey, "plus");
    upgradeDialog.close();
    gardenMessage.textContent = "Tend Plus demo activated. No payment was taken.";
    renderPlants();
  });
  sortControl.addEventListener("change", renderPlants);

  plantForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const formData = new FormData(plantForm);
    plants.push({
      id: "plant-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      name: String(formData.get("name")).trim(),
      species: String(formData.get("species")).trim(),
      interval: Number(formData.get("interval")),
      lastWatered: String(formData.get("lastWatered")),
      image: PLANT_STARTERS[0].image
    });
    storage.set(storageKey, plants);
    gardenMessage.textContent = "Plant added to your garden.";
    plantForm.reset();
    plantDialog.close();
    renderPlants();
  });

  notificationButton.addEventListener("click", function () {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(function () {
      updateNotificationButton();
      checkReminders();
      if (Notification.permission === "granted") {
        gardenMessage.textContent = "Browser reminders are on while Tend is open.";
      }
    });
  });

  document.title = STARTUP.name + " | Plant care";
  document.getElementById("pitch").textContent = STARTUP.pitch;
  updateNotificationButton();
  renderPlants();
  window.setInterval(checkReminders, 60000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) checkReminders();
  });
})();
