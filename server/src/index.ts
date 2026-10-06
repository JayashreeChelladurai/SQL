import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Server as SocketIOServer } from "socket.io";
import { setupSocketService } from "./services/socketService.js";
import { assessmentRouter } from "./routes/assessment.js";
import { studentRouter } from "./routes/student.js";
import { executionRouter } from "./routes/execution.js";
import { resultsRouter } from "./routes/results.js";
import { authRouter } from "./routes/auth.js";
import { initDatabaseOptimizations } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite WAL Mode
initDatabaseOptimizations();

const clientDist = path.resolve(__dirname, "../../client/dist");

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(express.json({ limit: "10mb" }));

// Initialize Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

setupSocketService(io);

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/assessments", assessmentRouter);
app.use("/api/student", studentRouter);
app.use("/api/execution", executionRouter);
app.use("/api/results", resultsRouter);

// Safe Exam Browser Exit Handler Route
app.get(["/quit", "/api/student/quit", "/seb-quit"], (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Exiting Assessment</title>
        <style>
          body {
            background-color: #020617;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            max-width: 480px;
            text-align: center;
            padding: 2.5rem;
            background: #0f172a;
            border: 1px solid #1e293b;
            border-radius: 1.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
          h2 { color: #38bdf8; margin-top: 0; font-size: 1.5rem; }
          p { color: #94a3b8; font-size: 0.875rem; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Assessment Completed!</h2>
          <p>Your SQL responses and queries have been safely evaluated and submitted.</p>
        </div>
        <script>
          try { window.close(); } catch(e) {}
        </script>
      </body>
    </html>
  `);
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "SQL Query Assessment Engine",
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static assets from client/dist if built
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const PORT = process.env.PORT || 5001;
server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 SQL Assessment Server running on http://0.0.0.0:${PORT}`);
});
