"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/app/lib/api";
import { useAuth } from "../auth-provider";

export function useManagerData() {
  const router = useRouter();
  const { credentials, user } = useAuth();
  const [data, setData] = useState({
    branches: [],
    students: [],
    teachers: [],
    isLoading: true,
    error: "",
  });

  useEffect(() => {
    if (!credentials || !user) {
      router.replace("/management/login");
      return;
    }

    let active = true;
    async function loadManagerData() {
      try {
        const [branches, students] = await Promise.all([
          apiRequest("/api/branches", { auth: credentials }),
          apiRequest("/api/students", { auth: credentials }),
        ]);
        if (!Array.isArray(branches) || !Array.isArray(students)) {
          throw new Error("The backend returned an unexpected manager directory response.");
        }

        const teachersByBranch = await Promise.all(
          branches.map((branch) =>
            apiRequest(`/api/branches/${branch.id}/teachers`, { auth: credentials })
          )
        );
        if (teachersByBranch.some((branchTeachers) => !Array.isArray(branchTeachers))) {
          throw new Error("The backend returned an unexpected teacher directory response.");
        }
        if (!active) return;

        const teachers = teachersByBranch.flat();
        const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
        const branchById = new Map(branches.map((branch) => [branch.id, branch]));
        const managerBranches = new Set(user.branchIds || []);
        const directoryStudents = students.map((student) => {
          const teacher = teacherById.get(student.teacherId);
          const dateOfBirth = student.dateOfBirth
            ? new Date(`${student.dateOfBirth}T00:00:00`)
            : null;
          const age = dateOfBirth
            ? Math.max(
                0,
                Math.floor((Date.now() - dateOfBirth.getTime()) / 31_557_600_000)
              )
            : null;
          return {
            ...student,
            name: student.fullName,
            age,
            level: student.currentLevel || "Not recorded",
            teacher: teacher?.username || "Not assigned",
            branch: branchById.get(student.branchId)?.name || "Branch",
          };
        });

        const directoryTeachers = teachers.map((teacher) => ({
          ...teacher,
          name: teacher.username,
          subject: "Quran",
          assignedStudents: directoryStudents.filter(
            (student) => student.teacherId === teacher.id
          ),
          branch: branchById.get(teacher.branchId)?.name || "Branch",
        }));

        setData({
          branches: branches.map((branch) => ({
            ...branch,
            location: branch.address || "",
            admin: managerBranches.has(branch.id) ? user.username : "",
            teacherCount: directoryTeachers.filter(
              (teacher) => teacher.branchId === branch.id
            ).length,
            studentCount: directoryStudents.filter(
              (student) => student.branchId === branch.id
            ).length,
          })),
          students: directoryStudents,
          teachers: directoryTeachers,
          isLoading: false,
          error: "",
        });
      } catch (error) {
        if (active) {
          setData((current) => ({
            ...current,
            isLoading: false,
            error: error instanceof Error ? error.message : "Unable to load branch data.",
          }));
        }
      }
    }

    loadManagerData();
    return () => {
      active = false;
    };
  }, [credentials, router, user]);

  return useMemo(
    () => ({
      ...data,
      branch: data.branches[0] || null,
    }),
    [data]
  );
}
