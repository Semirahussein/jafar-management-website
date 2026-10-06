export const teacherAttendanceStorageKey = "adminTeacherAttendance";
export const teacherAttendanceEventName = "teacher-attendance-updated";

export function subscribeToTeacherAttendance(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(teacherAttendanceEventName, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(teacherAttendanceEventName, callback);
  };
}

export function getTeacherAttendanceSnapshot() {
  return window.localStorage.getItem(teacherAttendanceStorageKey);
}

export function getServerTeacherAttendanceSnapshot() {
  return null;
}

export function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayTeacherStatuses(snapshot) {
  if (!snapshot) {
    return {};
  }

  try {
    const saved = JSON.parse(snapshot);
    if (
      !saved ||
      typeof saved !== "object" ||
      saved.date !== getTodayKey() ||
      !saved.statuses ||
      typeof saved.statuses !== "object" ||
      Array.isArray(saved.statuses)
    ) {
      return {};
    }

    return saved.statuses;
  } catch (error) {
    console.error("Unable to read teacher attendance.", error);
    return {};
  }
}

export function saveTodayTeacherStatuses(statuses) {
  window.localStorage.setItem(
    teacherAttendanceStorageKey,
    JSON.stringify({
      date: getTodayKey(),
      statuses,
    })
  );
  window.dispatchEvent(new Event(teacherAttendanceEventName));
}
