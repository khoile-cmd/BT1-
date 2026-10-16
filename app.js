/* Giai đoạn 1: khởi tạo cấu trúc và điều khiển sidebar trên màn hình nhỏ. */
const sidebar = document.querySelector("#sidebar");
const menuToggle = document.querySelector("#menu-toggle");
const sidebarScrim = document.querySelector("#sidebar-scrim");
const profileTrigger = document.querySelector("#profile-trigger");
const profileDialog = document.querySelector("#profile-dialog");
const profileForm = document.querySelector("#profile-form");
const profileNameInput = document.querySelector("#profile-input-name");
const profileBirthdayInput = document.querySelector("#profile-input-birthday");
const profileContactInput = document.querySelector("#profile-input-contact");
const profileRoleInput = document.querySelector("#profile-input-role");
const profileToast = document.querySelector("#profile-toast");
const PROFILE_STORAGE_KEY = "todo-board-profile";
const defaultProfile = { name: "Phúc", birthday: "", contact: "", role: "" };
let profile = loadProfile();
let toastTimeout;

function updateProfileDisplay() {
  document.querySelector("#greeting-name").textContent = profile.name;
  document.querySelector("#profile-name").textContent = profile.name;
  document.querySelector("#profile-avatar").textContent = [...profile.name.trim()][0]?.toLocaleUpperCase("vi") || "P";
  document.querySelector("#profile-role").textContent = profile.role || "Không gian cá nhân";
}

function populateProfileForm() {
  profileNameInput.value = profile.name;
  profileBirthdayInput.value = profile.birthday;
  profileContactInput.value = profile.contact;
  profileRoleInput.value = profile.role;
}

function showProfileToast(message) {
  profileToast.textContent = message;
  profileToast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => profileToast.classList.remove("is-visible"), 3200);
}

profileTrigger.addEventListener("click", () => {
  populateProfileForm();
  profileDialog.showModal();
  profileNameInput.focus();
});

document.querySelector("#profile-close").addEventListener("click", () => profileDialog.close());
document.querySelector("#profile-cancel").addEventListener("click", () => profileDialog.close());
profileDialog.addEventListener("click", (event) => {
  if (event.target === profileDialog) profileDialog.close();
});

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = profileNameInput.value.trim();
  if (!name) {
    profileNameInput.setCustomValidity("Hãy nhập họ và tên.");
    profileNameInput.reportValidity();
    return;
  }

  profileNameInput.setCustomValidity("");
  const updatedProfile = {
    name,
    birthday: profileBirthdayInput.value,
    contact: profileContactInput.value.trim(),
    role: profileRoleInput.value.trim()
  };

  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
  } catch (error) {
    console.error("Không thể lưu thông tin cá nhân vào LocalStorage:", error);
    showProfileToast("Không thể lưu thay đổi. Kiểm tra quyền lưu trữ của trình duyệt.");
    return;
  }

  profile = updatedProfile;
  updateProfileDisplay();
  profileDialog.close();
  showProfileToast("Cập nhật thành công!");
});

updateProfileDisplay();

function setSidebarOpen(isOpen) {
  sidebar.classList.toggle("is-open", isOpen);
  sidebarScrim.classList.toggle("is-visible", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Đóng thanh điều hướng" : "Mở thanh điều hướng");
}

menuToggle.addEventListener("click", () => setSidebarOpen(!sidebar.classList.contains("is-open")));
sidebarScrim.addEventListener("click", () => setSidebarOpen(false));
sidebar.addEventListener("click", (event) => {
  if (event.target.closest(".nav-item") && window.matchMedia("(max-width: 700px)").matches) {
    setSidebarOpen(false);
  }
});
window.addEventListener("resize", () => {
  if (!window.matchMedia("(max-width: 700px)").matches) setSidebarOpen(false);
});

/* Đồng hồ và ngày hiện tại ở phần header. */
const clock = document.querySelector("#clock");
const todayDate = document.querySelector("#today-date");
const todayLabel = document.querySelector("#today-label");
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
});

function updateClock() {
  const now = new Date();
  clock.dateTime = now.toISOString();
  clock.textContent = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(now);
  todayDate.textContent = dateFormatter.format(now);
  todayLabel.textContent = dateFormatter.format(now).toLocaleUpperCase("vi-VN");
}

updateClock();
window.setInterval(updateClock, 1000);

/* Giai đoạn 2: render, thêm, hoàn thành và xóa các công việc. */
const STORAGE_KEY = "todo-board-tasks";
const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskStartTimeInput = document.querySelector("#task-start-time");
const taskEndTimeInput = document.querySelector("#task-end-time");
const searchInput = document.querySelector("#search-input");
const sortSelect = document.querySelector("#sort-select");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = document.querySelector("#empty-title");
const emptyDescription = document.querySelector("#empty-description");
const formMessage = document.querySelector("#form-message");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const pageSize = 9;
let tasks = loadTasks();
let activeFilter = "all";
let searchTerm = "";
let sortMode = "newest";
let completedExpanded = false;
const taskPages = { active: 1, completed: 1, archived: 1 };
const expandedSubtasks = new Set();
const openSubtaskForms = new Set();

function formatTaskDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "short" }).format(date);
}

function formatTaskDateTime(dateTime) {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function isTaskOverdue(task, now = Date.now()) {
  return !task.completed && !task.archived && task.endTime && new Date(task.endTime).getTime() <= now;
}

function createTaskElement(task, isArchived = false) {
    const item = document.createElement("li");
    const overdue = isTaskOverdue(task);
    item.className = `task-item${task.completed ? " is-completed" : ""}${overdue ? " overdue" : ""}`;
    item.dataset.taskId = task.id;

    const mainRow = document.createElement("div");
    mainRow.className = "task-main-row";

    const completeButton = document.createElement("button");
    completeButton.className = "task-check";
    completeButton.type = "button";
    completeButton.setAttribute("aria-label", task.completed ? `Đánh dấu chưa hoàn thành: ${task.text}` : `Đánh dấu hoàn thành: ${task.text}`);
    completeButton.setAttribute("aria-pressed", String(task.completed));
    completeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>';
    completeButton.addEventListener("click", () => toggleTask(task.id));

    const titleButton = document.createElement("button");
    titleButton.className = `task-title${task.completed ? " completed" : ""}`;
    titleButton.type = "button";
    titleButton.textContent = task.text;
    titleButton.setAttribute("aria-pressed", String(task.completed));
    titleButton.addEventListener("click", () => toggleTask(task.id));

    const schedule = document.createElement("div");
    schedule.className = "task-schedule";
    if (task.startTime) {
      const startTime = document.createElement("time");
      startTime.className = "task-schedule-time";
      startTime.dateTime = task.startTime;
      startTime.textContent = `Bắt đầu: ${formatTaskDateTime(task.startTime)}`;
      schedule.append(startTime);
    }
    if (task.endTime) {
      const endTime = document.createElement("time");
      endTime.className = "task-schedule-time task-deadline";
      endTime.dateTime = task.endTime;
      endTime.textContent = `Hạn: ${formatTaskDateTime(task.endTime)}`;
      schedule.append(endTime);
    }
    if (overdue) {
      const warning = document.createElement("span");
      warning.className = "overdue-badge";
      warning.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/></svg><span>Quá hạn</span>';
      schedule.append(warning);
    }

    const date = document.createElement("time");
    date.className = "task-date";
    date.dateTime = task.createdAt;
    date.textContent = formatTaskDate(task.createdAt);

    const actions = document.createElement("div");
    actions.className = "task-actions";
    if (isArchived) {
      const restoreButton = document.createElement("button");
      restoreButton.className = "restore-button";
      restoreButton.type = "button";
      restoreButton.setAttribute("aria-label", `Khôi phục công việc: ${task.text}`);
      restoreButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5M4 4v4.5h4.5M12 8v4l2.5 1.5"/></svg>';
      restoreButton.addEventListener("click", () => restoreTask(task.id));
      actions.append(restoreButton);
    }

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Xóa công việc: ${task.text}`);
    deleteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3"/></svg>';
    deleteButton.addEventListener("click", () => deleteTask(task.id, item));
    actions.append(deleteButton);

    mainRow.append(completeButton, titleButton, schedule, date, actions);
    item.append(mainRow);

    item.append(createSubtaskSection(task));
    return item;
}

function createSubtaskSection(task) {
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const completedCount = subtasks.filter((subtask) => subtask.completed).length;
  const isExpanded = expandedSubtasks.has(task.id);
  const isFormOpen = openSubtaskForms.has(task.id);
  const section = document.createElement("div");
  section.className = "subtask-section";

  const controls = document.createElement("div");
  controls.className = "subtask-controls";
  if (subtasks.length > 0) {
    const progress = document.createElement("span");
    progress.className = "subtask-progress";
    progress.textContent = `${completedCount}/${subtasks.length} nhánh phụ đã xong`;
    controls.append(progress);
  }

  const toggleButton = document.createElement("button");
  toggleButton.className = "subtask-toggle";
  toggleButton.type = "button";
  toggleButton.setAttribute("aria-expanded", String(isExpanded));
  toggleButton.textContent = isExpanded
    ? `Thu gọn nhánh phụ (${subtasks.length})`
    : `+ Thêm nhánh phụ${subtasks.length ? ` · ${subtasks.length}` : ""}`;
  toggleButton.addEventListener("click", () => {
    if (!isExpanded) {
      expandedSubtasks.add(task.id);
      openSubtaskForms.add(task.id);
    } else {
      expandedSubtasks.delete(task.id);
      openSubtaskForms.delete(task.id);
    }
    renderTasks();
    if (!isExpanded) {
      document.querySelector(`[data-task-id="${CSS.escape(task.id)}"] .subtask-input`)?.focus();
    }
  });
  controls.append(toggleButton);
  section.append(controls);

  if (isExpanded) {
    const content = document.createElement("div");
    content.className = "subtask-content";
    const subtaskList = document.createElement("ul");
    subtaskList.className = "subtask-list";
    subtaskList.setAttribute("aria-label", `Nhánh phụ của ${task.text}`);
    subtasks.forEach((subtask) => subtaskList.append(createSubtaskElement(task, subtask)));
    content.append(subtaskList);

    if (isFormOpen) {
      const form = document.createElement("form");
      form.className = "subtask-form";
      const input = document.createElement("input");
      input.className = "subtask-input";
      input.type = "text";
      input.maxLength = 160;
      input.placeholder = "Tên nhánh phụ...";
      input.setAttribute("aria-label", `Tên nhánh phụ cho ${task.text}`);
      input.required = true;
      const addButton = document.createElement("button");
      addButton.className = "subtask-add-button";
      addButton.type = "submit";
      addButton.textContent = "Thêm";
      form.append(input, addButton);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        addSubtask(task.id, input.value);
      });
      content.append(form);
    }
    section.append(content);
  }
  return section;
}

function createSubtaskElement(parentTask, subtask) {
  const item = document.createElement("li");
  item.className = `subtask-item${subtask.completed ? " is-completed" : ""}`;
  const completeButton = document.createElement("button");
  completeButton.className = "subtask-check";
  completeButton.type = "button";
  completeButton.setAttribute("aria-label", subtask.completed ? `Đánh dấu nhánh phụ chưa hoàn thành: ${subtask.text}` : `Đánh dấu nhánh phụ hoàn thành: ${subtask.text}`);
  completeButton.setAttribute("aria-pressed", String(subtask.completed));
  completeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>';
  completeButton.addEventListener("click", () => toggleSubtask(parentTask.id, subtask.id));

  const titleButton = document.createElement("button");
  titleButton.className = "subtask-title";
  titleButton.type = "button";
  titleButton.textContent = subtask.text;
  titleButton.setAttribute("aria-pressed", String(subtask.completed));
  titleButton.addEventListener("click", () => toggleSubtask(parentTask.id, subtask.id));

  const deleteButton = document.createElement("button");
  deleteButton.className = "subtask-delete";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Xóa nhánh phụ: ${subtask.text}`);
  deleteButton.textContent = "×";
  deleteButton.addEventListener("click", () => deleteSubtask(parentTask.id, subtask.id));
  item.append(completeButton, titleButton, deleteButton);
  return item;
}

function matchesSearch(task) {
  return task.text.toLocaleLowerCase("vi").includes(searchTerm);
}

function sortTasks(taskList) {
  return taskList.sort((first, second) => {
    if (sortMode === "name") {
      return first.text.localeCompare(second.text, "vi", { sensitivity: "base" });
    }
    if (sortMode === "deadline") {
      const firstDeadline = first.endTime ? new Date(first.endTime).getTime() : Number.POSITIVE_INFINITY;
      const secondDeadline = second.endTime ? new Date(second.endTime).getTime() : Number.POSITIVE_INFINITY;
      return firstDeadline - secondDeadline || new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    }
    const createdDifference = new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    return sortMode === "oldest" ? -createdDifference : createdDifference;
  });
}

function renderTaskGroup(groupName, groupTasks, listId, paginationId) {
  const list = document.querySelector(`#${listId}`);
  const pagination = document.querySelector(`#${paginationId}`);
  const pageCount = Math.ceil(groupTasks.length / pageSize);
  const currentPage = Math.min(taskPages[groupName], Math.max(1, pageCount));
  taskPages[groupName] = currentPage;
  const startIndex = (currentPage - 1) * pageSize;
  const visibleTasks = groupTasks.slice(startIndex, startIndex + pageSize);

  list.replaceChildren(...visibleTasks.map((task) => createTaskElement(task, groupName === "archived")));
  renderPagination(pagination, groupName, groupTasks.length, currentPage);
}

function renderPagination(container, groupName, total, currentPage) {
  container.replaceChildren();
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount <= 1) return;

  const range = document.createElement("span");
  range.className = "pagination-range";
  range.textContent = `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, total)} / ${total}`;

  const controls = document.createElement("div");
  controls.className = "pagination-controls";
  const addButton = (label, page, { disabled = false, current = false, ariaLabel = label } = {}) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `page-button${current ? " is-current" : ""}`;
    button.textContent = label;
    button.disabled = disabled;
    button.setAttribute("aria-label", ariaLabel);
    if (current) button.setAttribute("aria-current", "page");
    button.addEventListener("click", () => {
      taskPages[groupName] = page;
      renderTasks();
    });
    controls.append(button);
  };

  addButton("‹", currentPage - 1, { disabled: currentPage === 1, ariaLabel: "Trang trước" });
  const pageNumbers = pageCount <= 5
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount]
      .filter((page) => page >= 1 && page <= pageCount))];
  let previousPage = 0;
  pageNumbers.forEach((page) => {
    if (page - previousPage > 1) {
      const ellipsis = document.createElement("span");
      ellipsis.className = "pagination-ellipsis";
      ellipsis.textContent = "…";
      ellipsis.setAttribute("aria-hidden", "true");
      controls.append(ellipsis);
    }
    addButton(String(page), page, { current: page === currentPage, ariaLabel: `Trang ${page}` });
    previousPage = page;
  });
  addButton("›", currentPage + 1, { disabled: currentPage === pageCount, ariaLabel: "Trang sau" });
  container.append(range, controls);
}

function renderTasks() {
  const unarchivedTasks = tasks.filter((task) => !task.archived);
  const activeTasks = sortTasks(unarchivedTasks.filter((task) => !task.completed && matchesSearch(task)));
  const completedTasks = sortTasks(unarchivedTasks.filter((task) => task.completed && matchesSearch(task)));
  const archivedTasks = sortTasks(tasks.filter((task) => task.archived && matchesSearch(task)));
  const showActive = activeFilter === "all" || activeFilter === "active";
  const showCompleted = activeFilter === "all" || activeFilter === "completed";
  const showArchived = activeFilter === "archived";

  document.querySelector("#active-group").hidden = !showActive;
  document.querySelector("#completed-group").hidden = !showCompleted;
  document.querySelector("#archived-group").hidden = !showArchived;
  document.querySelector("#completed-group-toggle").setAttribute("aria-expanded", String(completedExpanded));
  document.querySelector("#completed-group-content").hidden = !completedExpanded;

  renderTaskGroup("active", activeTasks, "active-task-list", "active-pagination");
  renderTaskGroup("completed", completedTasks, "completed-task-list", "completed-pagination");
  renderTaskGroup("archived", archivedTasks, "archived-task-list", "archived-pagination");

  const completedCount = unarchivedTasks.filter((task) => task.completed).length;
  const activeCount = unarchivedTasks.length - completedCount;
  document.querySelector("#active-group-count").textContent = `(${activeTasks.length})`;
  document.querySelector("#completed-group-count").textContent = `(${completedTasks.length})`;
  document.querySelector("#archived-group-count").textContent = `(${archivedTasks.length})`;
  document.querySelector("#all-count").textContent = unarchivedTasks.length;
  document.querySelector("#active-count").textContent = activeCount;
  document.querySelector("#archived-count").textContent = tasks.filter((task) => task.archived).length;
  document.querySelector("#total-stat").textContent = unarchivedTasks.length;
  document.querySelector("#active-stat").textContent = activeCount;
  document.querySelector("#completed-stat").textContent = completedCount;
  const visibleCount = showArchived
    ? archivedTasks.length
    : showActive && showCompleted
      ? activeTasks.length + completedTasks.length
      : showActive ? activeTasks.length : completedTasks.length;
  document.querySelector("#heading-count").textContent = visibleCount;
  document.querySelector("#footer-count").textContent = `Bạn hiện có ${unarchivedTasks.length} công việc`;
  document.querySelector("#progress-note").textContent = unarchivedTasks.length
    ? `${Math.round((completedCount / unarchivedTasks.length) * 100)}% công việc đã xong`
    : "Bạn làm được mà!";

  const filterLabels = {
    all: "Tất cả công việc",
    active: "Công việc cần làm",
    completed: "Công việc đã hoàn thành",
    archived: "Công việc đã lưu trữ"
  };
  document.querySelector("#list-description").textContent = filterLabels[activeFilter];
  document.querySelector("#archive-completed").hidden = completedCount === 0 || showArchived;
  const noTasks = visibleCount === 0;
  emptyState.classList.toggle("is-visible", noTasks);
  document.querySelector("#task-groups").hidden = noTasks;
  if (noTasks && searchTerm) {
    emptyTitle.textContent = "Không tìm thấy công việc phù hợp";
    emptyDescription.textContent = "Thử tìm bằng một từ khóa khác nhé.";
  } else if (noTasks && activeFilter === "active") {
    emptyTitle.textContent = "Bạn đã hoàn thành mọi việc!";
    emptyDescription.textContent = "Thật tuyệt, hãy thêm việc mới khi bạn sẵn sàng.";
  } else if (noTasks && activeFilter === "completed") {
    emptyTitle.textContent = "Chưa có công việc hoàn thành";
    emptyDescription.textContent = "Các việc bạn đánh dấu xong sẽ xuất hiện ở đây.";
  } else if (noTasks && activeFilter === "archived") {
    emptyTitle.textContent = "Chưa có công việc lưu trữ";
    emptyDescription.textContent = "Công việc đã thu dọn sẽ xuất hiện ở đây để bạn khôi phục khi cần.";
  } else {
    emptyTitle.textContent = "Bắt đầu với một việc nhỏ";
    emptyDescription.textContent = "Thêm công việc đầu tiên để sắp xếp ngày của bạn nhé.";
  }
}

function refreshOverdueState() {
  const now = Date.now();
  document.querySelectorAll(".task-item[data-task-id]").forEach((item) => {
    const task = tasks.find((candidate) => candidate.id === item.dataset.taskId);
    if (!task) return;
    const overdue = isTaskOverdue(task, now);
    item.classList.toggle("overdue", overdue);
    const existingBadge = item.querySelector(".overdue-badge");
    if (overdue && !existingBadge) {
      const warning = document.createElement("span");
      warning.className = "overdue-badge";
      warning.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/></svg><span>Quá hạn</span>';
      item.querySelector(".task-schedule").append(warning);
    } else if (!overdue && existingBadge) {
      existingBadge.remove();
    }
  });
}

function addTask(text) {
  const trimmedText = text.trim();
  const startTime = taskStartTimeInput.value;
  const endTime = taskEndTimeInput.value;

  // Bắt buộc chọn đủ thời gian bắt đầu và hạn chót trước khi tạo công việc.
  if (!startTime && !endTime) {
    formMessage.textContent = "Hãy chọn thời gian yêu cầu";
    taskStartTimeInput.setAttribute("aria-invalid", "true");
    taskEndTimeInput.setAttribute("aria-invalid", "true");
    taskStartTimeInput.focus();
    return;
  } else if (!startTime) {
    formMessage.textContent = "Hãy chọn ngày bắt đầu";
    taskStartTimeInput.setAttribute("aria-invalid", "true");
    taskEndTimeInput.removeAttribute("aria-invalid");
    taskStartTimeInput.focus();
    return;
  } else if (!endTime) {
    formMessage.textContent = "Hãy chọn ngày kết thúc";
    taskStartTimeInput.removeAttribute("aria-invalid");
    taskEndTimeInput.setAttribute("aria-invalid", "true");
    taskEndTimeInput.focus();
    return;
  } else {
    taskStartTimeInput.removeAttribute("aria-invalid");
    taskEndTimeInput.removeAttribute("aria-invalid");
    formMessage.textContent = "";
  }

  if (!trimmedText) {
    formMessage.textContent = "Hãy nhập nội dung công việc trước khi thêm.";
    taskInput.focus();
    return;
  }

  if (startTime && endTime && new Date(endTime).getTime() < new Date(startTime).getTime()) {
    formMessage.textContent = "Hạn chót không thể sớm hơn thời gian bắt đầu.";
    taskEndTimeInput.setAttribute("aria-invalid", "true");
    taskEndTimeInput.focus();
    return;
  }

  tasks.unshift({
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: trimmedText,
    completed: false,
    archived: false,
    startTime,
    endTime,
    createdAt: new Date().toISOString()
  });
  taskInput.value = "";
  taskStartTimeInput.value = "";
  taskEndTimeInput.value = "";
  taskStartTimeInput.removeAttribute("aria-invalid");
  taskEndTimeInput.removeAttribute("aria-invalid");
  formMessage.textContent = "";
  activeFilter = "all";
  searchInput.value = "";
  searchTerm = "";
  updateActiveFilterButton();
  renderTasks();
  saveTasks();
  taskInput.focus();
}

function addSubtask(taskId, text) {
  const trimmedText = text.trim();
  if (!trimmedText) return;
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;
  if (!Array.isArray(task.subtasks)) task.subtasks = [];
  task.subtasks.push({
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: trimmedText,
    completed: false
  });
  expandedSubtasks.add(taskId);
  openSubtaskForms.add(taskId);
  renderTasks();
  saveTasks();
  document.querySelector(`[data-task-id="${CSS.escape(taskId)}"] .subtask-input`)?.focus();
}

function toggleSubtask(taskId, subtaskId) {
  const task = tasks.find((item) => item.id === taskId);
  const subtask = task?.subtasks?.find((item) => item.id === subtaskId);
  if (!subtask) return;
  subtask.completed = !subtask.completed;
  // Nhánh phụ chỉ cập nhật tiến độ; trạng thái hoàn thành của việc chính vẫn do người dùng quyết định.
  renderTasks();
  saveTasks();
}

function deleteSubtask(taskId, subtaskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task || !Array.isArray(task.subtasks)) return;
  task.subtasks = task.subtasks.filter((subtask) => subtask.id !== subtaskId);
  renderTasks();
  saveTasks();
}

function toggleTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.completed = !task.completed;
  if (!task.completed) task.archived = false;
  renderTasks();
  saveTasks();
}

function restoreTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.archived = false;
  taskPages.active = 1;
  activeFilter = "all";
  updateActiveFilterButton();
  renderTasks();
  window.setInterval(refreshOverdueState, 60_000);
  saveTasks();
}

function deleteTask(taskId, itemElement) {
  if (itemElement && itemElement.classList.contains("is-removing")) return;
  if (itemElement) {
    itemElement.classList.add("is-removing");
    itemElement.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    window.setTimeout(() => finishDeletingTask(taskId), 220);
    return;
  }
  finishDeletingTask(taskId);
}

function finishDeletingTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  renderTasks();
  saveTasks();
}

function archiveCompletedTasks() {
  const completedTasks = tasks.filter((task) => task.completed && !task.archived);
  if (completedTasks.length === 0) return;
  completedTasks.forEach((task) => { task.archived = true; });
  taskPages.completed = 1;
  renderTasks();
  saveTasks();
  showProfileToast(`${completedTasks.length} công việc đã lưu trữ. Bạn có thể khôi phục từ mục “Đã lưu trữ”.`);
}

function updateActiveFilterButton() {
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === activeFilter;
    button.classList.toggle("is-active", isActive);
    if (isActive) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(taskInput.value);
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    updateActiveFilterButton();
    renderTasks();
  });
});

document.querySelector("#completed-group-toggle").addEventListener("click", () => {
  completedExpanded = !completedExpanded;
  renderTasks();
});

document.querySelector("#archive-completed").addEventListener("click", archiveCompletedTasks);

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim().toLocaleLowerCase("vi");
  taskPages.active = 1;
  taskPages.completed = 1;
  taskPages.archived = 1;
  renderTasks();
});

sortSelect.addEventListener("change", () => {
  sortMode = sortSelect.value;
  taskPages.active = 1;
  taskPages.completed = 1;
  taskPages.archived = 1;
  renderTasks();
});

/* Giai đoạn 3: tải và lưu mảng công việc trong LocalStorage. */
function loadTasks() {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return [];
    const parsedTasks = JSON.parse(storedValue);
    if (!Array.isArray(parsedTasks)) throw new TypeError("Dữ liệu công việc không đúng định dạng.");
    return parsedTasks.filter((task) =>
      task
      && typeof task.id === "string"
      && typeof task.text === "string"
      && typeof task.completed === "boolean"
      && typeof task.createdAt === "string"
    ).map((task) => ({
      ...task,
      archived: task.archived === true,
      startTime: typeof task.startTime === "string" ? task.startTime : "",
      endTime: typeof task.endTime === "string" ? task.endTime : "",
      subtasks: Array.isArray(task.subtasks)
        ? task.subtasks.filter((subtask) =>
          subtask
          && typeof subtask.id === "string"
          && typeof subtask.text === "string"
          && typeof subtask.completed === "boolean"
        )
        : []
    }));
  } catch (error) {
    console.error("Không thể tải danh sách công việc từ LocalStorage:", error);
    window.setTimeout(() => {
      formMessage.textContent = "Không thể đọc dữ liệu đã lưu. Danh sách mới sẽ được dùng thay thế.";
    }, 0);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    formMessage.textContent = "";
  } catch (error) {
    console.error("Không thể lưu danh sách công việc vào LocalStorage:", error);
    formMessage.textContent = "Không thể lưu dữ liệu trên thiết bị này. Kiểm tra quyền lưu trữ của trình duyệt.";
  }
}

function loadProfile() {
  try {
    const storedValue = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!storedValue) return { ...defaultProfile };
    const savedProfile = JSON.parse(storedValue);
    if (
      !savedProfile
      || typeof savedProfile.name !== "string"
      || typeof savedProfile.birthday !== "string"
      || typeof savedProfile.contact !== "string"
      || typeof savedProfile.role !== "string"
    ) {
      throw new TypeError("Dữ liệu thông tin cá nhân không đúng định dạng.");
    }
    return { ...defaultProfile, ...savedProfile, name: savedProfile.name.trim() || defaultProfile.name };
  } catch (error) {
    console.error("Không thể tải thông tin cá nhân từ LocalStorage:", error);
    return { ...defaultProfile };
  }
}

updateActiveFilterButton();
renderTasks();
