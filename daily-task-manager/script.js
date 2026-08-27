(function () {
  "use strict";

  /* =====================================================
     Storage keys & defaults
  ===================================================== */
  const LS_TASKS = "dtm_tasks_v1";
  const LS_HISTORY = "dtm_history_v1";
  const LS_META = "dtm_meta_v1";

  const DEFAULT_SETTINGS = {
    morningStart: "09:00",
    morningEnd: "13:00",
    afternoonStart: "13:00",
    afternoonEnd: "17:00",
  };

  const PERIOD_LABELS = { morning: "الفترة الأولى", afternoon: "الفترة الثانية" };

  /* =====================================================
     Date helpers (local time, no timezone surprises)
  ===================================================== */
  function pad(n) { return String(n).padStart(2, "0"); }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function addDaysStr(dateStr, n) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + n);
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  }

  function formatDisplayDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }

  function shortDay(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "numeric" });
  }

  function timeToMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  function nowMinutes() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* =====================================================
     Persistence
  ===================================================== */
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn("تعذرت قراءة", key, e);
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("تعذر حفظ", key, e);
    }
  }

  let tasks = loadJSON(LS_TASKS, []);
  let history = loadJSON(LS_HISTORY, []); // [{date, total, completed, postponed, percent}]
  let meta = loadJSON(LS_META, {
    lastActiveDate: todayStr(),
    settings: { ...DEFAULT_SETTINGS },
    notifiedDates: { morning: null, afternoon: null },
    manualPostponeLog: {}, // { 'YYYY-MM-DD': count }
  });
  // backfill in case of older/partial saved meta
  meta.settings = { ...DEFAULT_SETTINGS, ...(meta.settings || {}) };
  meta.notifiedDates = meta.notifiedDates || { morning: null, afternoon: null };
  meta.manualPostponeLog = meta.manualPostponeLog || {};

  function persistAll() {
    saveJSON(LS_TASKS, tasks);
    saveJSON(LS_HISTORY, history);
    saveJSON(LS_META, meta);
  }

  /* =====================================================
     Day rollover: incomplete tasks move to the next day,
     and a history snapshot is recorded for each closed day.
  ===================================================== */
  function finalizeDay(dateStr) {
    const tasksForDay = tasks.filter((t) => t.date === dateStr);
    const completed = tasksForDay.filter((t) => t.done);
    const incomplete = tasksForDay.filter((t) => !t.done);
    const manualPostponed = meta.manualPostponeLog[dateStr] || 0;
    const total = tasksForDay.length + manualPostponed;
    const postponed = incomplete.length + manualPostponed;
    const percent = total ? Math.round((completed.length / total) * 100) : 0;

    if (!history.find((h) => h.date === dateStr)) {
      history.push({ date: dateStr, total, completed: completed.length, postponed, percent });
    }

    const nextDate = addDaysStr(dateStr, 1);
    incomplete.forEach((t) => {
      t.date = nextDate;
      t.postponedCount = (t.postponedCount || 0) + 1;
    });

    // keep history from growing forever
    history = history
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(-120);
  }

  function rollover() {
    const today = todayStr();
    let cursor = meta.lastActiveDate;
    let guard = 0;
    while (cursor < today && guard < 60) {
      finalizeDay(cursor);
      cursor = addDaysStr(cursor, 1);
      guard++;
    }
    meta.lastActiveDate = today;
    if (guard > 0) {
      // a new day started: reset the "already notified" markers
      meta.notifiedDates = { morning: null, afternoon: null };
      persistAll();
    }
  }

  /* =====================================================
     Task CRUD
  ===================================================== */
  function addTask(period, title, minutes) {
    tasks.push({
      id: uid(),
      title: title.trim(),
      expectedMinutes: Math.max(1, parseInt(minutes, 10) || 1),
      period,
      done: false,
      date: todayStr(),
      postponedCount: 0,
    });
    persistAll();
    render();
  }

  function toggleDone(id) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    persistAll();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter((x) => x.id !== id);
    persistAll();
    render();
  }

  function postponeTask(id) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const today = todayStr();
    if (t.date === today) {
      meta.manualPostponeLog[today] = (meta.manualPostponeLog[today] || 0) + 1;
    }
    t.date = addDaysStr(t.date, 1);
    t.postponedCount = (t.postponedCount || 0) + 1;
    persistAll();
    render();
  }

  /* =====================================================
     Rendering
  ===================================================== */
  function taskItemHTML(t) {
    return `
      <li class="task-item ${t.done ? "done" : ""}" data-id="${t.id}">
        <input type="checkbox" class="chk-done" ${t.done ? "checked" : ""} title="تم الانتهاء">
        <span class="task-title">${escapeHTML(t.title)}</span>
        <span class="task-time-badge">${t.expectedMinutes} د</span>
        <span class="task-actions">
          <button class="btn-postpone" title="تأجيل لليوم التالي">⏭️</button>
          <button class="btn-delete" title="حذف">🗑️</button>
        </span>
      </li>`;
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderPeriod(period) {
    const today = todayStr();
    const listEl = document.getElementById(`${period}TaskList`);
    const capacityEl = document.getElementById(`${period}Capacity`);
    const labelEl = document.getElementById(`${period}TimeLabel`);

    const start = meta.settings[`${period}Start`];
    const end = meta.settings[`${period}End`];
    labelEl.textContent = `(${start} - ${end})`;

    const periodTasks = tasks
      .filter((t) => t.date === today && t.period === period)
      .sort((a, b) => Number(a.done) - Number(b.done));

    listEl.innerHTML = periodTasks.length
      ? periodTasks.map(taskItemHTML).join("")
      : `<li class="empty-hint">لا مهام في هذه الفترة بعد</li>`;

    const durationMin = Math.max(0, timeToMinutes(end) - timeToMinutes(start));
    const usedMin = periodTasks.reduce((sum, t) => sum + t.expectedMinutes, 0);
    const remaining = durationMin - usedMin;

    if (remaining < 0) {
      capacityEl.textContent = `⚠️ الجدول مزدحم بمقدار ${Math.abs(remaining)} دقيقة`;
      capacityEl.classList.add("warning");
    } else {
      capacityEl.textContent = `المتبقي في الفترة: ${remaining} دقيقة`;
      capacityEl.classList.remove("warning");
    }
  }

  function renderProgressBadge() {
    const today = todayStr();
    const todaysTasks = tasks.filter((t) => t.date === today);
    const completed = todaysTasks.filter((t) => t.done).length;
    const manualPostponed = meta.manualPostponeLog[today] || 0;
    const total = todaysTasks.length + manualPostponed;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    document.getElementById("progressText").textContent = `${completed}/${total}`;
    document.getElementById("progressPercent").textContent = `${percent}%`;
    document.getElementById("todayDate").textContent = formatDisplayDate(today);
  }

  function todayLiveHistoryRow() {
    const today = todayStr();
    const todaysTasks = tasks.filter((t) => t.date === today);
    const completed = todaysTasks.filter((t) => t.done).length;
    const manualPostponed = meta.manualPostponeLog[today] || 0;
    const incompleteSoFar = todaysTasks.filter((t) => !t.done).length;
    const total = todaysTasks.length + manualPostponed;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { date: today, total, completed, postponed: incompleteSoFar + manualPostponed, percent, live: true };
  }

  function renderReports() {
    const today = todayStr();
    const rows = [...history.filter((h) => h.date !== today)];
    rows.push(todayLiveHistoryRow());
    rows.sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
    const last7 = rows.slice(0, 7);

    const tbody = document.getElementById("reportTableBody");
    tbody.innerHTML = last7
      .map(
        (r) => `
      <tr class="${r.date === today ? "is-today" : ""}">
        <td>${shortDay(r.date)}${r.date === today ? " (اليوم)" : ""}</td>
        <td>${r.completed}</td>
        <td>${r.postponed}</td>
        <td>${r.total}</td>
        <td>${r.percent}%</td>
      </tr>`
      )
      .join("");

    const weekCompleted = last7.reduce((s, r) => s + r.completed, 0);
    const weekPostponed = last7.reduce((s, r) => s + r.postponed, 0);
    const weekTotal = last7.reduce((s, r) => s + r.total, 0);
    const weekPercent = weekTotal ? Math.round((weekCompleted / weekTotal) * 100) : 0;

    document.getElementById("weeklySummary").innerHTML = `
      <div><span class="stat-num">${weekCompleted}</span><span class="stat-label">مهام منجزة (٧ أيام)</span></div>
      <div><span class="stat-num">${weekPostponed}</span><span class="stat-label">مهام مؤجلة (٧ أيام)</span></div>
      <div><span class="stat-num">${weekPercent}%</span><span class="stat-label">متوسط الإنجاز الأسبوعي</span></div>
    `;
  }

  function renderSettingsForm() {
    const form = document.getElementById("settingsForm");
    form.morningStart.value = meta.settings.morningStart;
    form.morningEnd.value = meta.settings.morningEnd;
    form.afternoonStart.value = meta.settings.afternoonStart;
    form.afternoonEnd.value = meta.settings.afternoonEnd;
  }

  function render() {
    renderProgressBadge();
    renderPeriod("morning");
    renderPeriod("afternoon");
    renderReports();
  }

  /* =====================================================
     Reminders: popup at the start of each period
  ===================================================== */
  function checkReminders() {
    const today = todayStr();
    const now = nowMinutes();

    ["morning", "afternoon"].forEach((period) => {
      const startStr = meta.settings[`${period}Start`];
      const startMin = timeToMinutes(startStr);
      const alreadyNotified = meta.notifiedDates[period] === today;
      // fire within a 2-minute window after the period start, once per day
      if (!alreadyNotified && now >= startMin && now < startMin + 2) {
        fireReminder(period);
        meta.notifiedDates[period] = today;
        persistAll();
      }
    });
  }

  function fireReminder(period) {
    const today = todayStr();
    const periodTasks = tasks.filter((t) => t.date === today && t.period === period && !t.done);

    // in-page popup (always works)
    showReminderModal(period, periodTasks);

    // best-effort browser notification
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        const body = periodTasks.length
          ? periodTasks.map((t) => `• ${t.title} (${t.expectedMinutes} د)`).join("\n")
          : "لا توجد مهام مسجلة لهذه الفترة.";
        new Notification(`بدأت ${PERIOD_LABELS[period]}`, { body });
      }
    } catch (e) {
      console.warn("Notification failed", e);
    }
  }

  function showReminderModal(period, periodTasks) {
    const modal = document.getElementById("reminderModal");
    document.getElementById("reminderTitle").textContent = `⏰ بدأت ${PERIOD_LABELS[period]} — مهامك الآن:`;
    const list = document.getElementById("reminderList");
    list.innerHTML = periodTasks.length
      ? periodTasks.map((t) => `<li class="task-item"><span class="task-title">${escapeHTML(t.title)}</span><span class="task-time-badge">${t.expectedMinutes} د</span></li>`).join("")
      : `<li class="empty-hint">لا توجد مهام مسجلة لهذه الفترة.</li>`;
    modal.classList.remove("hidden");
  }

  /* =====================================================
     Wiring up the UI
  ===================================================== */
  function initTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
      });
    });
  }

  function initAddForms() {
    document.querySelectorAll(".add-task-form").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const period = form.dataset.period;
        const title = form.title.value;
        const minutes = form.minutes.value;
        if (!title.trim()) return;
        addTask(period, title, minutes);
        form.reset();
      });
    });
  }

  function initTaskListEvents() {
    document.getElementById("tab-tasks").addEventListener("click", (e) => {
      const li = e.target.closest(".task-item");
      if (!li) return;
      const id = li.dataset.id;
      if (e.target.classList.contains("btn-delete")) {
        deleteTask(id);
      } else if (e.target.classList.contains("btn-postpone")) {
        postponeTask(id);
      }
    });
    document.getElementById("tab-tasks").addEventListener("change", (e) => {
      if (e.target.classList.contains("chk-done")) {
        const li = e.target.closest(".task-item");
        toggleDone(li.dataset.id);
      }
    });
  }

  function initSettingsForm() {
    renderSettingsForm();
    document.getElementById("settingsForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target;
      meta.settings = {
        morningStart: form.morningStart.value,
        morningEnd: form.morningEnd.value,
        afternoonStart: form.afternoonStart.value,
        afternoonEnd: form.afternoonEnd.value,
      };
      persistAll();
      render();
    });
  }

  function initNotificationButton() {
    const btn = document.getElementById("enableNotifBtn");
    const status = document.getElementById("notifStatus");

    function refreshStatus() {
      if (!("Notification" in window)) {
        status.textContent = "المتصفح لا يدعم الإشعارات — سيستمر عمل النافذة المنبثقة داخل الصفحة.";
        btn.disabled = true;
        return;
      }
      if (Notification.permission === "granted") status.textContent = "الإشعارات مفعّلة ✅";
      else if (Notification.permission === "denied") status.textContent = "تم رفض الإذن من إعدادات المتصفح.";
      else status.textContent = "غير مفعّلة بعد.";
    }

    btn.addEventListener("click", () => {
      if (!("Notification" in window)) return;
      Notification.requestPermission().then(refreshStatus);
    });

    refreshStatus();
  }

  function initReminderModal() {
    document.getElementById("reminderClose").addEventListener("click", () => {
      document.getElementById("reminderModal").classList.add("hidden");
    });
  }

  /* =====================================================
     Boot
  ===================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    rollover();
    persistAll();

    initTabs();
    initAddForms();
    initTaskListEvents();
    initSettingsForm();
    initNotificationButton();
    initReminderModal();

    render();

    // periodic checks: date rollover + period reminders
    setInterval(() => {
      const before = meta.lastActiveDate;
      rollover();
      if (meta.lastActiveDate !== before) {
        persistAll();
        render();
      }
      checkReminders();
    }, 20 * 1000);
  });
})();
