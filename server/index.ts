import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import filesRouter from "./routes/files";
import foldersRouter from "./routes/folders";
import documentEditorsRouter from "./routes/document-editors";
import createDocumentsRouter from "./routes/create-documents";
import authRouter from "./routes/auth";
import settingsRouter from "./routes/settings";
import reviewsRouter from "./routes/reviews";
import realtimeRouter from "./routes/realtime";
import path from "path";
import fs from "fs-extra";
import AuthService from "./services/auth";

export function createServer() {
  const app = express();

  // Initialize authentication service
  AuthService.initializeDefaultAdmin().catch(console.error);

  // Middleware
  app.use(cors());
  // Increase JSON and urlencoded limits to avoid 413 errors for large metadata payloads
  // Configurable via UPLOAD_JSON_LIMIT_MB (default: 200 MB)
  const jsonLimitMb = Number(process.env.UPLOAD_JSON_LIMIT_MB || 200);
  app.use(express.json({ limit: `${jsonLimitMb}mb` }));
  app.use(express.urlencoded({ extended: true, limit: `${jsonLimitMb}mb` }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // File management routes
  app.use("/api/files", filesRouter);

  // Folder management routes
  app.use("/api/folders", foldersRouter);

  // Web document editor routes
  app.use("/api/documents", documentEditorsRouter);


  // Document creation routes
  app.use("/api/create", createDocumentsRouter);

  // Authentication routes
  app.use("/api/auth", authRouter);

  // Reviews/approvals routes
  app.use('/api/reviews', reviewsRouter);

  // Realtime SSE route
  app.use('/api/realtime', realtimeRouter);

  // Settings routes (e.g., logo upload)
  app.use("/api/settings", settingsRouter);

  // Serve /logo.gif with graceful fallback to other logo assets
  app.get('/logo.gif', (_req, res) => {
    const candidates = [
      path.join(process.cwd(), 'public', 'logo.gif'),
      path.join(process.cwd(), 'uploads', 'logo.gif'),
      path.join(process.cwd(), 'logo.gif'),
      // fallbacks to PNG/SVG if GIF not present
      path.join(process.cwd(), 'logo.png'),
      path.join(process.cwd(), 'public', 'logo.png'),
      path.join(process.cwd(), 'public', 'logo.svg'),
      path.join(process.cwd(), 'public', 'placeholder.png'),
      path.join(process.cwd(), 'public', 'favicon.svg'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return res.sendFile(p);
      }
    }
    res.status(404).end();
  });

  // Serve site logo with fallback from public or uploads
  app.get('/site-logo', (req, res) => {
    const candidates = [
  // explicit root-level logo file provided in workspace
  path.join(process.cwd(), 'logo.png'),
      path.join(process.cwd(), 'public', 'logo.png'),
      path.join(process.cwd(), 'public', 'logo.jpg'),
      path.join(process.cwd(), 'public', 'logo.jpeg'),
      path.join(process.cwd(), 'public', 'logo.svg'),
      path.join(process.cwd(), 'uploads', 'logo.png'),
      path.join(process.cwd(), 'uploads', 'logo.jpg'),
      path.join(process.cwd(), 'uploads', 'logo.jpeg'),
      path.join(process.cwd(), 'uploads', 'logo.svg'),
  path.join(process.cwd(), 'public', 'placeholder.png'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return res.sendFile(p);
      }
    }
    res.status(404).json({ error: 'Logo não encontrada' });
  });

  // Basic JSON error handler fallback
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || 500;
    const message = err.message || 'Erro interno do servidor';
    res.status(status).json({ error: message });
  });

  return app;
}
