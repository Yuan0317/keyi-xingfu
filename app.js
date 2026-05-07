const authScreen = document.querySelector("#authScreen");
const appScreen = document.querySelector("#appScreen");
const authForm = document.querySelector("#authForm");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const logoutButton = document.querySelector("#logoutButton");
const greeting = document.querySelector("#greeting");
const randomMemory = document.querySelector("#randomMemory");
const shuffleButton = document.querySelector("#shuffleButton");
const dateInput = document.querySelector("#dateInput");
const gratitudeList = document.querySelector("#gratitudeList");
const addItemButton = document.querySelector("#addItemButton");
const completionCard = document.querySelector("#completionCard");
const completionIcon = document.querySelector("#completionIcon");
const completionText = document.querySelector("#completionText");
const historyList = document.querySelector("#historyList");
const bedtimeInput = document.querySelector("#bedtimeInput");
const bedReminderInput = document.querySelector("#bedReminderInput");
const morningReminderInput = document.querySelector("#morningReminderInput");
const saveSettingsButton = document.querySelector("#saveSettingsButton");
const settingsMessage = document.querySelector("#settingsMessage");
const itemTemplate = document.querySelector("#gratitudeItemTemplate");

const STORAGE_KEY = "canBeHappyPrototype";
const SESSION_KEY = "canBeHappyCurrentUser";

let state = loadState();
let currentUser = localStorage.getItem(SESSION_KEY);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { users: {} };
  }

  try {
    return JSON.parse(saved);
  } catch {
    return { users: {} };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getUser() {
  if (!currentUser) return null;
  return state.users[currentUser];
}

function ensureUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!state.users[normalizedEmail]) {
    state.users[normalizedEmail] = {
      email: normalizedEmail,
      password,
      records: {},
      settings: {
        bedtime: "22:30",
        bedReminder: true,
        morningReminder: true,
      },
    };
  }
  return normalizedEmail;
}

function showApp() {
  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
  dateInput.value = dateInput.value || todayKey();
  renderAll();
}

function showAuth() {
  appScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
}

function renderAll() {
  const user = getUser();
  if (!user) {
    showAuth();
    return;
  }

  greeting.textContent = greetingForDate(dateInput.value || todayKey());
  renderSettings();
  renderGratitudeList();
  renderHistory();
  renderRandomMemory();
}

function greetingForDate(date) {
  const today = todayKey();
  if (date === today) return "今天也收集一点点好";
  return "给这一天补上一点光";
}

function getItemsForDate(date) {
  const user = getUser();
  if (!user.records[date]) {
    user.records[date] = [
      { text: "", image: "" },
      { text: "", image: "" },
      { text: "", image: "" },
    ];
  }
  while (user.records[date].length < 3) {
    user.records[date].push({ text: "", image: "" });
  }
  return user.records[date];
}

function renderGratitudeList() {
  const date = dateInput.value || todayKey();
  const items = getItemsForDate(date);
  gratitudeList.innerHTML = "";

  items.forEach((item, index) => {
    const node = itemTemplate.content.firstElementChild.cloneNode(true);
    const number = node.querySelector(".item-number");
    const removeButton = node.querySelector(".remove-button");
    const textarea = node.querySelector("textarea");
    const fileInput = node.querySelector('input[type="file"]');
    const preview = node.querySelector(".photo-preview");

    number.textContent = index + 1;
    textarea.value = item.text;
    removeButton.hidden = items.length <= 3;

    if (item.image) {
      preview.src = item.image;
      preview.classList.remove("hidden");
    }

    textarea.addEventListener("input", () => {
      item.text = textarea.value;
      saveState();
      updateCompletion();
      renderHistory();
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        item.image = reader.result;
        preview.src = item.image;
        preview.classList.remove("hidden");
        saveState();
        renderHistory();
      });
      reader.readAsDataURL(file);
    });

    removeButton.addEventListener("click", () => {
      items.splice(index, 1);
      saveState();
      renderGratitudeList();
      renderHistory();
    });

    gratitudeList.appendChild(node);
  });

  updateCompletion();
}

function updateCompletion() {
  const items = getItemsForDate(dateInput.value || todayKey());
  const filledCount = items.filter((item) => item.text.trim()).length;
  const isDone = filledCount >= 3;

  completionCard.classList.toggle("done", isDone);
  completionIcon.textContent = isDone ? "✓" : "○";
  completionText.textContent = isDone
    ? "今天已经写满 3 件。很好，这一天被你认真接住了。"
    : `已经写下 ${filledCount} 件，还差 ${Math.max(3 - filledCount, 0)} 件。`;
}

function renderHistory() {
  const user = getUser();
  const dates = Object.keys(user.records)
    .filter((date) => user.records[date].some((item) => item.text.trim() || item.image))
    .sort()
    .reverse();

  historyList.innerHTML = "";

  if (!dates.length) {
    historyList.innerHTML = '<p class="form-note">还没有历史记录。先从今天的三件小事开始。</p>';
    return;
  }

  dates.forEach((date) => {
    const day = document.createElement("article");
    day.className = "history-day";
    const title = document.createElement("h4");
    title.textContent = formatDate(date);
    const list = document.createElement("ul");

    user.records[date]
      .filter((item) => item.text.trim() || item.image)
      .forEach((item) => {
        const li = document.createElement("li");
        if (item.text.trim()) {
          const text = document.createElement("span");
          text.textContent = item.text;
          li.appendChild(text);
        }
        if (item.image) {
          const image = document.createElement("img");
          image.src = item.image;
          image.alt = "感恩小事的图片";
          li.appendChild(image);
        }
        list.appendChild(li);
      });

    day.append(title, list);
    historyList.appendChild(day);
  });
}

function formatDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${date}T12:00:00`));
}

function collectMemories() {
  const user = getUser();
  return Object.entries(user.records).flatMap(([date, items]) =>
    items
      .filter((item) => item.text.trim())
      .map((item) => ({ date, text: item.text.trim() }))
  );
}

function renderRandomMemory() {
  const memories = collectMemories();
  if (!memories.length) {
    randomMemory.textContent = "还没有旧记录。写下今天的三件小事，明天的你会收到一份温柔。";
    return;
  }

  const memory = memories[Math.floor(Math.random() * memories.length)];
  randomMemory.textContent = `「${memory.text}」 ${formatDate(memory.date)}`;
}

function renderSettings() {
  const user = getUser();
  bedtimeInput.value = user.settings.bedtime;
  bedReminderInput.checked = user.settings.bedReminder;
  morningReminderInput.checked = user.settings.morningReminder;
}

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;

  if (password.length < 6) {
    emailInput.setCustomValidity("");
    passwordInput.setCustomValidity("密码至少 6 位");
    passwordInput.reportValidity();
    return;
  }

  const normalizedEmail = ensureUser(email, password);
  currentUser = normalizedEmail;
  localStorage.setItem(SESSION_KEY, normalizedEmail);
  saveState();
  showApp();
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  currentUser = null;
  showAuth();
});

dateInput.addEventListener("change", () => {
  renderAll();
  saveState();
});

addItemButton.addEventListener("click", () => {
  getItemsForDate(dateInput.value || todayKey()).push({ text: "", image: "" });
  saveState();
  renderGratitudeList();
});

shuffleButton.addEventListener("click", renderRandomMemory);

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((button) => button.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.view}`).classList.add("active");
  });
});

saveSettingsButton.addEventListener("click", () => {
  const user = getUser();
  user.settings = {
    bedtime: bedtimeInput.value || "22:30",
    bedReminder: bedReminderInput.checked,
    morningReminder: morningReminderInput.checked,
  };
  saveState();
  settingsMessage.textContent = "已保存。正式版会在这些时间发送手机提醒。";
});

dateInput.value = todayKey();

if (currentUser && state.users[currentUser]) {
  showApp();
} else {
  showAuth();
}
