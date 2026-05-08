const authScreen = document.querySelector("#authScreen");
const appScreen = document.querySelector("#appScreen");
const authForm = document.querySelector("#authForm");
const signupButton = document.querySelector("#signupButton");
const authMessage = document.querySelector("#authMessage");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const logoutButton = document.querySelector("#logoutButton");
const greeting = document.querySelector("#greeting");
const randomMemory = document.querySelector("#randomMemory");
const shuffleButton = document.querySelector("#shuffleButton");
const dateInput = document.querySelector("#dateInput");
const gratitudeList = document.querySelector("#gratitudeList");
const addItemButton = document.querySelector("#addItemButton");
const saveEntriesButton = document.querySelector("#saveEntriesButton");
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

const isConfigured =
  window.CAN_BE_HAPPY_SUPABASE_URL &&
  window.CAN_BE_HAPPY_SUPABASE_ANON_KEY &&
  !window.CAN_BE_HAPPY_SUPABASE_URL.includes("YOUR_");

const supabaseClient = isConfigured
  ? window.supabase.createClient(
      window.CAN_BE_HAPPY_SUPABASE_URL,
      window.CAN_BE_HAPPY_SUPABASE_ANON_KEY
    )
  : null;

let currentUser = null;
let entriesByDate = {};
let settings = {
  bedtime: "22:30",
  bed_reminder: true,
  morning_reminder: true,
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function showAuth(message = "") {
  appScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
  authMessage.textContent =
    message ||
    (isConfigured
      ? "注册后，你的记录会私密保存到云端。"
      : "请先在 config.js 填入 Supabase 项目信息。");
}

function showApp() {
  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
}

function setMessage(element, text) {
  element.textContent = text;
}

function friendlyAuthError(error) {
  const message = error?.message || "";
  if (message.includes("Email address not authorized")) {
    return "这个邮箱暂时不能收到 Supabase 的验证邮件。请先在 Supabase 关闭邮箱确认，或配置自定义 SMTP 邮件服务。";
  }
  if (message.includes("Signup is disabled")) {
    return "当前 Supabase 项目关闭了新用户注册，请在 Auth 设置里打开 Allow new users to sign up。";
  }
  if (message.includes("rate limit") || message.includes("For security purposes")) {
    return "验证邮件发送太频繁了，请稍等一会儿再试，或配置自定义 SMTP 邮件服务。";
  }
  if (message.includes("Invalid login credentials")) {
    return "登录失败，请确认邮箱、密码，或先完成邮箱验证。";
  }
  return message || "操作失败，请稍后再试。";
}

function greetingForDate(date) {
  return date === todayKey() ? "今天也收集一点点好" : "给这一天补上一点光";
}

function emptyItems() {
  return [
    { id: crypto.randomUUID(), text: "", image_path: "", image_url: "" },
    { id: crypto.randomUUID(), text: "", image_path: "", image_url: "" },
    { id: crypto.randomUUID(), text: "", image_path: "", image_url: "" },
  ];
}

function getItemsForDate(date) {
  if (!entriesByDate[date]) {
    entriesByDate[date] = emptyItems();
  }
  while (entriesByDate[date].length < 3) {
    entriesByDate[date].push({ id: crypto.randomUUID(), text: "", image_path: "", image_url: "" });
  }
  return entriesByDate[date];
}

async function loadAppData() {
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("bedtime, bed_reminder, morning_reminder")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (profile) settings = profile;

  const { data: entries, error: entriesError } = await supabaseClient
    .from("gratitude_entries")
    .select("id, entry_date, position, text, image_path")
    .eq("user_id", currentUser.id)
    .order("entry_date", { ascending: false })
    .order("position", { ascending: true });

  if (entriesError) throw entriesError;

  entriesByDate = {};
  for (const entry of entries || []) {
    const date = entry.entry_date;
    if (!entriesByDate[date]) entriesByDate[date] = [];
    entriesByDate[date].push({
      id: entry.id,
      text: entry.text || "",
      image_path: entry.image_path || "",
      image_url: await signedImageUrl(entry.image_path),
    });
  }
}

async function signedImageUrl(path) {
  if (!path) return "";
  const { data, error } = await supabaseClient.storage
    .from("gratitude-images")
    .createSignedUrl(path, 60 * 60);
  if (error) return "";
  return data.signedUrl;
}

async function renderAll() {
  greeting.textContent = greetingForDate(dateInput.value || todayKey());
  renderSettings();
  renderGratitudeList();
  renderHistory();
  renderRandomMemory();
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
    textarea.value = item.text || "";
    removeButton.hidden = items.length <= 3;

    if (item.image_url) {
      preview.src = item.image_url;
      preview.classList.remove("hidden");
    }

    textarea.addEventListener("input", () => {
      item.text = textarea.value;
      updateCompletion();
      renderHistory();
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      item.pendingFile = file;
      item.image_url = URL.createObjectURL(file);
      preview.src = item.image_url;
      preview.classList.remove("hidden");
    });

    removeButton.addEventListener("click", () => {
      items.splice(index, 1);
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
  const dates = Object.keys(entriesByDate)
    .filter((date) => entriesByDate[date].some((item) => item.text.trim() || item.image_url))
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

    entriesByDate[date]
      .filter((item) => item.text.trim() || item.image_url)
      .forEach((item) => {
        const li = document.createElement("li");
        if (item.text.trim()) {
          const text = document.createElement("span");
          text.textContent = item.text;
          li.appendChild(text);
        }
        if (item.image_url) {
          const image = document.createElement("img");
          image.src = item.image_url;
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
  return Object.entries(entriesByDate).flatMap(([date, items]) =>
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
  bedtimeInput.value = settings.bedtime?.slice(0, 5) || "22:30";
  bedReminderInput.checked = Boolean(settings.bed_reminder);
  morningReminderInput.checked = Boolean(settings.morning_reminder);
}

async function uploadImageIfNeeded(item, date, index) {
  if (!item.pendingFile) return item.image_path || "";

  const extension = item.pendingFile.name.split(".").pop() || "jpg";
  const path = `${currentUser.id}/${date}/${item.id}-${index}.${extension}`;
  const { error } = await supabaseClient.storage
    .from("gratitude-images")
    .upload(path, item.pendingFile, { upsert: true });

  if (error) throw error;
  item.image_path = path;
  item.image_url = await signedImageUrl(path);
  delete item.pendingFile;
  return path;
}

async function saveCurrentDateEntries() {
  const date = dateInput.value || todayKey();
  const items = getItemsForDate(date);
  saveEntriesButton.textContent = "保存中...";
  saveEntriesButton.disabled = true;

  try {
    const rows = [];
    for (const [index, item] of items.entries()) {
      const hasContent = item.text.trim() || item.image_path || item.pendingFile;
      if (!hasContent) continue;

      rows.push({
        id: item.id,
        user_id: currentUser.id,
        entry_date: date,
        position: index + 1,
        text: item.text.trim(),
        image_path: await uploadImageIfNeeded(item, date, index + 1),
      });
    }

    const existingIds = items.filter((item) => item.id).map((item) => item.id);
    if (existingIds.length) {
      await supabaseClient
        .from("gratitude_entries")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("entry_date", date)
        .not("id", "in", `(${existingIds.join(",")})`);
    }

    if (rows.length) {
      const { error } = await supabaseClient.from("gratitude_entries").upsert(rows);
      if (error) throw error;
    }

    await loadAppData();
    await renderAll();
    saveEntriesButton.textContent = "已保存";
  } catch (error) {
    saveEntriesButton.textContent = "保存失败，请重试";
    console.error(error);
  } finally {
    setTimeout(() => {
      saveEntriesButton.textContent = "保存到云端";
      saveEntriesButton.disabled = false;
    }, 1200);
  }
}

async function saveSettings() {
  settings = {
    user_id: currentUser.id,
    bedtime: bedtimeInput.value || "22:30",
    bed_reminder: bedReminderInput.checked,
    morning_reminder: morningReminderInput.checked,
  };

  const { error } = await supabaseClient.from("profiles").upsert(settings);
  if (error) {
    setMessage(settingsMessage, "保存失败，请稍后再试。");
    return;
  }

  setMessage(settingsMessage, "已保存。提醒推送会在下一步接入。");
}

async function startApp() {
  if (!isConfigured) {
    showAuth();
    return;
  }

  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;

  if (!currentUser) {
    showAuth();
    return;
  }

  dateInput.value = dateInput.value || todayKey();
  showApp();

  try {
    await loadAppData();
    await renderAll();
  } catch (error) {
    console.error(error);
    randomMemory.textContent = "云端资料读取失败，请检查 Supabase 设置。";
  }
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isConfigured) return showAuth();

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: emailInput.value.trim(),
    password: passwordInput.value,
  });

  if (error) {
    setMessage(authMessage, friendlyAuthError(error));
    return;
  }

  currentUser = data.user;
  await startApp();
});

signupButton.addEventListener("click", async () => {
  if (!isConfigured) return showAuth();
  if (passwordInput.value.length < 6) {
    setMessage(authMessage, "密码至少需要 6 位。");
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email: emailInput.value.trim(),
    password: passwordInput.value,
    options: {
      emailRedirectTo: window.location.origin + window.location.pathname,
    },
  });

  if (error) {
    setMessage(authMessage, friendlyAuthError(error));
    return;
  }

  if (!data.session) {
    setMessage(authMessage, "注册邮件已发送，请先去邮箱确认。");
    return;
  }

  currentUser = data.user;
  await startApp();
});

logoutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  currentUser = null;
  entriesByDate = {};
  showAuth("已退出登录。");
});

dateInput.addEventListener("change", renderAll);
addItemButton.addEventListener("click", () => {
  getItemsForDate(dateInput.value || todayKey()).push({
    id: crypto.randomUUID(),
    text: "",
    image_path: "",
    image_url: "",
  });
  renderGratitudeList();
});
shuffleButton.addEventListener("click", renderRandomMemory);
saveEntriesButton.addEventListener("click", saveCurrentDateEntries);
saveSettingsButton.addEventListener("click", saveSettings);

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((button) => button.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.view}`).classList.add("active");
  });
});

dateInput.value = todayKey();
startApp();
