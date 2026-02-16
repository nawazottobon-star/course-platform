import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { tutorsRouter } from "./routes/tutors";
import { tutorApplicationsRouter } from "./routes/tutorApplications";

const app = express();

// ─── Middleware ──────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
    cors({
        origin: env.frontendAppUrls,
        credentials: true,
    }),
);

// ─── Health Check ───────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "tutor-backend", timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────────────────────
app.use("/tutors", tutorsRouter);
app.use("/tutor-applications", tutorApplicationsRouter);

export { app };
