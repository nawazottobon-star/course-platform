import express from "express";
import { Prisma } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../services/prisma";
import { requireAuth, type AuthenticatedRequest } from "../middleware/requireAuth";
import { requireTutor } from "../middleware/requireRole";
import { verifyPassword } from "../utils/password";
import { createSession } from "../services/sessionService";
import { buildTutorCourseSnapshot, formatTutorSnapshot } from "../services/tutorInsights";
import { generateTutorCopilotAnswer } from "../services/openAiClient";

const tutorsRouter = express.Router();

async function isTutorForCourse(userId: string, courseId: string): Promise<boolean> {
    const assignment = await prisma.courseTutor.findFirst({
        where: {
            courseId,
            isActive: true,
            tutor: { userId },
        },
        select: { courseTutorId: true },
    });
    return Boolean(assignment);
}

// ─── POST /login ────────────────────────────────────────────
tutorsRouter.post(
    "/login",
    asyncHandler(async (req, res) => {
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const password = typeof req.body?.password === "string" ? req.body.password : "";

        if (!email || !password) {
            res.status(400).json({ message: "Email and password are required" });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                userId: true,
                email: true,
                fullName: true,
                role: true,
                passwordHash: true,
                tutorProfile: {
                    select: {
                        tutorId: true,
                        displayName: true,
                    },
                },
            },
        });

        if (!user || (user.role !== "tutor" && user.role !== "admin")) {
            res.status(403).json({ message: "Tutor account required" });
            return;
        }

        const passwordValid = await verifyPassword(password, user.passwordHash);
        if (!passwordValid) {
            res.status(401).json({ message: "Wrong email or wrong password" });
            return;
        }

        const tokens = await createSession(user.userId, user.role);

        res.status(200).json({
            user: {
                id: user.userId,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                tutorId: user.tutorProfile?.tutorId,
                displayName: user.tutorProfile?.displayName ?? user.fullName,
            },
            session: {
                accessToken: tokens.accessToken,
                accessTokenExpiresAt: tokens.accessTokenExpiresAt.toISOString(),
                refreshToken: tokens.refreshToken,
                refreshTokenExpiresAt: tokens.refreshTokenExpiresAt.toISOString(),
                sessionId: tokens.sessionId,
            },
        });
    }),
);

// ─── POST /assistant/query ──────────────────────────────────
tutorsRouter.post(
    "/assistant/query",
    requireAuth,
    requireTutor,
    asyncHandler(async (req, res) => {
        const auth = (req as AuthenticatedRequest).auth;
        if (!auth) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const courseId = typeof req.body?.courseId === "string" ? req.body.courseId.trim() : "";
        const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";

        if (!courseId) {
            res.status(400).json({ message: "courseId is required" });
            return;
        }
        if (!question) {
            res.status(400).json({ message: "question is required" });
            return;
        }

        const allowed = await isTutorForCourse(auth.userId, courseId);
        if (!allowed) {
            res.status(403).json({ message: "Tutor is not assigned to this course" });
            return;
        }

        try {
            const snapshot = await buildTutorCourseSnapshot(courseId);
            const snapshotText = formatTutorSnapshot(snapshot);
            const prompt = [
                snapshotText,
                "",
                `Tutor question: ${question}`,
                "Answer:",
            ].join("\n");

            const answer = await generateTutorCopilotAnswer(prompt);
            res.status(200).json({ answer });
        } catch (error) {
            console.error("Tutor assistant query failed", error);
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : "Tutor assistant is unavailable right now. Please try again.";
            res.status(500).json({ message });
        }
    }),
);

// ─── GET /me/courses ────────────────────────────────────────
tutorsRouter.get(
    "/me/courses",
    requireAuth,
    requireTutor,
    asyncHandler(async (req, res) => {
        const auth = (req as AuthenticatedRequest).auth;
        if (!auth) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const courses = await prisma.courseTutor.findMany({
            where: {
                isActive: true,
                tutor: { userId: auth.userId },
            },
            include: {
                course: {
                    select: {
                        courseId: true,
                        courseName: true,
                        slug: true,
                        description: true,
                    },
                },
            },
        });

        res.status(200).json({
            courses: courses.map((entry) => ({
                courseId: entry.course.courseId,
                slug: entry.course.slug,
                title: entry.course.courseName,
                description: entry.course.description,
                role: entry.role,
            })),
        });
    }),
);

// ─── GET /:courseId/enrollments ──────────────────────────────
tutorsRouter.get(
    "/:courseId/enrollments",
    requireAuth,
    requireTutor,
    asyncHandler(async (req, res) => {
        const auth = (req as AuthenticatedRequest).auth;
        const { courseId } = req.params;
        if (!auth) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const allowed = await isTutorForCourse(auth.userId, courseId);
        if (!allowed) {
            res.status(403).json({ message: "Tutor is not assigned to this course" });
            return;
        }

        const enrollments = await prisma.enrollment.findMany({
            where: { courseId },
            select: {
                enrollmentId: true,
                enrolledAt: true,
                status: true,
                user: {
                    select: {
                        userId: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
            orderBy: { enrolledAt: "desc" },
        });

        res.status(200).json({
            enrollments: enrollments.map((enrollment) => ({
                enrollmentId: enrollment.enrollmentId,
                enrolledAt: enrollment.enrolledAt,
                status: enrollment.status,
                userId: enrollment.user.userId,
                fullName: enrollment.user.fullName,
                email: enrollment.user.email,
            })),
        });
    }),
);

// ─── GET /:courseId/progress ────────────────────────────────
tutorsRouter.get(
    "/:courseId/progress",
    requireAuth,
    requireTutor,
    asyncHandler(async (req, res) => {
        const auth = (req as AuthenticatedRequest).auth;
        const { courseId } = req.params;
        if (!auth) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const allowed = await isTutorForCourse(auth.userId, courseId);
        if (!allowed) {
            res.status(403).json({ message: "Tutor is not assigned to this course" });
            return;
        }

        const moduleNumbers = await prisma.topic.findMany({
            where: { courseId, moduleNo: { gt: 0 } },
            select: { moduleNo: true },
            distinct: ["moduleNo"],
            orderBy: { moduleNo: "asc" },
        });
        const totalModules = moduleNumbers.length;

        const enrolledUsers = await prisma.enrollment.findMany({
            where: { courseId },
            select: {
                userId: true,
                enrolledAt: true,
                user: { select: { fullName: true, email: true } },
            },
        });

        const progressRows = await prisma.$queryRaw<{ user_id: string; module_no: number; quiz_passed: boolean }[]>(Prisma.sql`
      SELECT user_id, module_no, quiz_passed
      FROM module_progress
      WHERE course_id = ${courseId}::uuid
    `);

        const progressByUser = new Map<string, { passedModules: Set<number> }>();
        progressRows.forEach((row) => {
            if (!row.quiz_passed) {
                return;
            }
            const entry = progressByUser.get(row.user_id) ?? { passedModules: new Set<number>() };
            entry.passedModules.add(row.module_no);
            progressByUser.set(row.user_id, entry);
        });

        const learners = enrolledUsers.map((enrollment) => {
            const progress = progressByUser.get(enrollment.userId);
            const completedCount = progress ? progress.passedModules.size : 0;
            const percent = totalModules === 0 ? 0 : Math.min(100, Math.floor((completedCount / totalModules) * 100));
            return {
                userId: enrollment.userId,
                fullName: enrollment.user.fullName,
                email: enrollment.user.email,
                enrolledAt: enrollment.enrolledAt,
                completedModules: completedCount,
                totalModules,
                percent,
            };
        });

        res.status(200).json({ learners, totalModules });
    }),
);

export { tutorsRouter };
