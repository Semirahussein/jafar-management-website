  "use client";

import { useSyncExternalStore } from "react";
import {
  getStudentProfile,
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
    teacher.assignedStudents.map((name, index) => {
      const profile = getStudentProfile(teacher, index);

      return {
        id: profile?.id ?? `${teacher.id}-${index}`,
        name,
        age: profile?.age ?? null,
        level: profile?.level ?? "Not recorded",
        teacher: teacher.name,
        subject: teacher.subject,
      };
    })
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
