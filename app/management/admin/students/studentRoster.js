export const studentRosterStorageKey = "adminStudentRoster";
export const studentRosterEventName = "admin-student-roster-updated";

export const initialTeachers = [
  {
    id: 1,
    name: "Fatima Ahmed",
    subject: "Quran & Tajweed",
    assignedStudents: [
      "Aisha Ahmed",
      "Maryam Ali",
      "Hana Yusuf",
      "Samira Mohammed",
      "Bilal Hassan",
      "Noor Ibrahim",
      "Yusuf Ali",
      "Layla Omar",
      "Zahra Musa",
      "Omar Ahmed",
      "Safiya Yusuf",
      "Hamza Hassan",
    ],
    status: "present",
  },
  {
    id: 2,
    name: "Musa Ibrahim",
    subject: "Quran Recitation",
    assignedStudents: [
      "Yusuf Mohammed",
      "Omar Hassan",
      "Bilal Musa",
      "Amina Ali",
      "Hana Ibrahim",
      "Abdullah Yusuf",
      "Maryam Ahmed",
      "Ismail Omar",
      "Ruqayya Hassan",
    ],
    status: "present",
  },
  {
    id: 3,
    name: "Khadija Hassan",
    subject: "Hifz",
    assignedStudents: [
      "Fatima Hassan",
      "Safiya Ali",
      "Zahra Ahmed",
      "Adam Ibrahim",
      "Hafsa Mohammed",
      "Khalid Musa",
      "Sumaya Omar",
      "Idris Ahmed",
    ],
    status: "late",
  },
  {
    id: 4,
    name: "Ibrahim Yusuf",
    subject: "Quran & Tajweed",
    assignedStudents: [
      "Abdullah Omar",
      "Hamza Ibrahim",
      "Noor Musa",
      "Aisha Yusuf",
      "Mariam Ali",
      "Yahya Hassan",
      "Amal Mohammed",
    ],
    status: "present",
  },
  {
    id: 5,
    name: "Amina Mohammed",
    subject: "Quran Recitation",
    assignedStudents: [
      "Khadija Omar",
      "Maryam Yusuf",
      "Layla Ahmed",
      "Ibrahim Ali",
      "Nadia Hassan",
      "Zayd Mohammed",
    ],
    status: "absent",
  },
];

export function subscribeToStudentRoster(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(studentRosterEventName, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(studentRosterEventName, callback);
  };
}

export function getStudentRosterSnapshot() {
  return window.localStorage.getItem(studentRosterStorageKey);
}

export function getServerStudentRosterSnapshot() {
  return null;
}

export function getStudentRoster(snapshot) {
  if (!snapshot) {
    return initialTeachers;
  }

  try {
    const roster = JSON.parse(snapshot);
    if (
      !Array.isArray(roster) ||
      roster.some(
        (teacher) =>
          !teacher ||
          !Array.isArray(teacher.assignedStudents) ||
          typeof teacher.id !== "number"
      )
    ) {
      throw new Error("Saved student roster has an invalid format.");
    }

    return roster;
  } catch (error) {
    console.error("Unable to read saved student roster.", error);
    return initialTeachers;
  }
}

export function saveStudentRoster(roster) {
  window.localStorage.setItem(studentRosterStorageKey, JSON.stringify(roster));
  window.dispatchEvent(new Event(studentRosterEventName));
}
