import express from "express";
import type { Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { cartRouter } from "./routes/cart";
import { lessonsRouter } from "./routes/lessons";
import { coursesRouter } from "./routes/courses";

import { pagesRouter } from "./routes/pages";
import { env } from "./config/env";
import { assistantRouter } from "./routes/assistant";
import { quizRouter } from "./routes/quiz";

import { adminRouter } from "./routes/admin";
import { coldCallRouter } from "./routes/coldCall";
import { activityRouter } from "./routes/activity";
import { personaProfilesRouter } from "./routes/personaProfiles";
import { cohortProjectsRouter } from "./routes/cohortProjects";
import { registrationsRouter } from "./routes/registrations";
import { landingAssistantRouter } from "./routes/landingAssistant";
import { dashboardRouter } from "./routes/dashboard";

export function createApp(): Express {
  const app = express();

  const allowedOrigins = env.frontendAppUrls;
  const corsOptions: cors.CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.some((allowed) => origin === allowed)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.get("/", (_req, res) => {
    res.status(200).json({ message: "Course Platform API" });
  });
  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/cart", cartRouter);
  app.use("/lessons", lessonsRouter);
  app.use("/courses", coursesRouter);

  app.use("/pages", pagesRouter);
  app.use("/assistant", assistantRouter);
  app.use("/quiz", quizRouter);

  app.use("/admin", adminRouter);
  app.use("/cold-call", coldCallRouter);
  app.use("/activity", activityRouter);
  app.use("/persona-profiles", personaProfilesRouter);
  app.use("/cohort-projects", cohortProjectsRouter);
  app.use("/registrations", registrationsRouter);
  app.use("/landing-assistant", landingAssistantRouter);
  app.use("/dashboard", dashboardRouter);

  // Mirror routes under /api/* so the frontend can call them with a consistent prefix.
  const apiRouter = express.Router();
  apiRouter.use("/health", healthRouter);
  apiRouter.use("/auth", authRouter);
  apiRouter.use("/users", usersRouter);
  apiRouter.use("/cart", cartRouter);
  apiRouter.use("/lessons", lessonsRouter);
  apiRouter.use("/courses", coursesRouter);

  apiRouter.use("/pages", pagesRouter);
  apiRouter.use("/assistant", assistantRouter);
  apiRouter.use("/quiz", quizRouter);

  apiRouter.use("/admin", adminRouter);
  apiRouter.use("/cold-call", coldCallRouter);
  apiRouter.use("/activity", activityRouter);
  apiRouter.use("/persona-profiles", personaProfilesRouter);
  apiRouter.use("/cohort-projects", cohortProjectsRouter);
  apiRouter.use("/registrations", registrationsRouter);
  apiRouter.use("/landing-assistant", landingAssistantRouter);
  apiRouter.use("/dashboard", dashboardRouter);
  app.use("/api", apiRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error", err);
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
}
