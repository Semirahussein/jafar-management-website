  "use client";

import { useSyncExternalStore } from "react";
import {
  getServerStudentRosterSnapshot,
  getStudentRoster,
  getStudentRosterSnapshot,
  subscribeToStudentRoster,
} from "../admin/students/studentRoster";

export const managerBranch = {
  id: "main",
  name: "Main Branch",
  location: "Jafar Madrasa",
  admin: "Branch Admin",
};

export function useManagerData() {
  const rosterSnapshot = useSyncExternalStore(
    subscribeToStudentRoster,
    getStudentRosterSnapshot,
    getServerStudentRosterSnapshot
  );
  const teachers = getStudentRoster(rosterSnapshot);
  const students = teachers.flatMap((teacher) =>
    teacher.assignedStudents.map((name, index) => ({
      id: `${teacher.id}-${index}`,
      name,
      teacher: teacher.name,
      subject: teacher.subject,
    }))
  );

  return {
    branch: managerBranch,
    branches: [
      {
        ...managerBranch,
        teacherCount: teachers.length,
        studentCount: students.length,
      },
    ],
    teachers,
    students,
  };
}
