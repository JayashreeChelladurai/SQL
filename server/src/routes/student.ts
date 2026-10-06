import { Router } from "express";
import { prisma } from "../db.js";
import { extractSchemaOverview } from "../services/sqlRunner.js";
import { notifyAdminStudentProgress } from "../services/socketService.js";
import { isSebRequest } from "../services/sebService.js";
import { gradeCandidateQuery } from "../services/gradingService.js";

export const studentRouter = Router();

// Helper to extract clean IPv4
function getClientIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const raw = typeof forwarded === "string" ? forwarded : forwarded[0];
    const first = raw.split(",")[0].trim();
    return first.replace(/^::ffff:/, "");
  }
  return (req.socket?.remoteAddress || "127.0.0.1").replace(/^::ffff:/, "");
}

// 1. Student Login / Registration
studentRouter.post("/login", async (req, res) => {
  try {
    const { code, rollNo, studentName, deviceInfo } = req.body;

    if (!code || !rollNo || !studentName) {
      return res.status(400).json({
        error: "Access Code, Roll Number, and Full Name are all required.",
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanRollNo = rollNo.trim().toUpperCase();
    const cleanName = studentName.trim();

    const assessment = await prisma.assessment.findUnique({
      where: { code: cleanCode },
      include: {
        questions: {
          select: { id: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({ error: "Invalid access code. Assessment not found." });
    }

    // Enforce Safe Exam Browser (SEB) requirement
    if (assessment.requireSeb && !isSebRequest(req, assessment.code)) {
      return res.status(403).json({
        error: "Safe Exam Browser (SEB) is mandatory for this assessment.",
        requireSeb: true,
        assessment: {
          id: assessment.id,
          title: assessment.title,
          code: assessment.code,
          durationMinutes: assessment.durationMinutes,
          sebQuitPassword: assessment.sebQuitPassword,
        },
      });
    }

    const ipAddress = getClientIp(req);
    const deviceInfoStr = typeof deviceInfo === "object" ? JSON.stringify(deviceInfo) : deviceInfo || "";

    // Find existing attempt or create new one
    let attempt = await prisma.studentAttempt.findUnique({
      where: {
        assessmentId_rollNo: {
          assessmentId: assessment.id,
          rollNo: cleanRollNo,
        },
      },
    });

    const now = new Date();

    if (!attempt) {
      // Build question order (shuffle if enabled)
      let qIds = assessment.questions.map((q) => q.id);
      if (assessment.shuffleQuestions) {
        qIds = [...qIds].sort(() => Math.random() - 0.5);
      }

      attempt = await prisma.studentAttempt.create({
        data: {
          assessmentId: assessment.id,
          rollNo: cleanRollNo,
          studentName: cleanName,
          status: "IN_PROGRESS",
          startedAt: now,
          remainingSeconds: assessment.durationMinutes * 60,
          questionOrder: JSON.stringify(qIds),
          ipAddress,
          deviceInfo: deviceInfoStr,
          drafts: "{}",
        },
      });
    } else {
      // Update IP and device info on reconnect
      await prisma.studentAttempt.update({
        where: { id: attempt.id },
        data: {
          ipAddress,
          deviceInfo: deviceInfoStr,
          lastHeartbeat: now,
        },
      });
    }

    // Immutable Timer Calculation: Time elapsed cannot be reset by page reload
    const elapsedSeconds = Math.floor((now.getTime() - new Date(attempt.startedAt).getTime()) / 1000);
    const totalAllowedSeconds = assessment.durationMinutes * 60;
    const remainingSeconds = Math.max(0, totalAllowedSeconds - elapsedSeconds);

    if (remainingSeconds <= 0 && attempt.status === "IN_PROGRESS") {
      await prisma.studentAttempt.update({
        where: { id: attempt.id },
        data: { status: "TIME_EXPIRED", remainingSeconds: 0 },
      });
      attempt.status = "TIME_EXPIRED";
    }

    res.json({
      attemptId: attempt.id,
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      rollNo: attempt.rollNo,
      studentName: attempt.studentName,
      status: attempt.status,
      startedAt: attempt.startedAt,
      remainingSeconds,
      drafts: JSON.parse(attempt.drafts || "{}"),
      flaggedQuestions: JSON.parse(attempt.flaggedQuestions || "[]"),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Load Assessment Questions for Student
studentRouter.get("/assessment/:attemptId", async (req, res) => {
  try {
    const attempt = await prisma.studentAttempt.findUnique({
      where: { id: req.params.attemptId },
      include: {
        assessment: {
          include: {
            questions: {
              include: {
                testCases: {
                  where: { isPublic: true },
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
        submissions: true,
      },
    });

    if (!attempt) {
      return res.status(404).json({ error: "Student attempt session not found." });
    }

    // Calculate remaining seconds
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - new Date(attempt.startedAt).getTime()) / 1000);
    const totalAllowedSeconds = attempt.assessment.durationMinutes * 60;
    const remainingSeconds = Math.max(0, totalAllowedSeconds - elapsedSeconds);

    // Map questions with extracted table schemas
    const questionOrder: string[] = JSON.parse(attempt.questionOrder || "[]");
    const rawQuestions = attempt.assessment.questions;

    // Sort by randomized student order if available
    const questions = rawQuestions
      .map((q) => {
        // Parse schema tables and columns
        const sampleSeed = q.testCases.length > 0 ? q.testCases[0].seedData : "";
        const schemaOverview = extractSchemaOverview(q.schemaDdl, sampleSeed);

        // Find existing submission for this question
        const submission = attempt.submissions.find((s) => s.questionId === q.id);

        return {
          id: q.id,
          title: q.title,
          description: q.description,
          difficulty: q.difficulty,
          marks: q.marks,
          schemaDdl: q.schemaDdl,
          schemaOverview,
          starterCode: q.starterCode,
          orderSensitive: q.orderSensitive,
          publicTestCases: q.testCases.map((tc) => ({
            id: tc.id,
            title: tc.title,
            seedData: tc.seedData,
            expectedOutput: tc.expectedOutput ? JSON.parse(tc.expectedOutput) : null,
          })),
          submission: submission
            ? {
                id: submission.id,
                code: submission.code,
                score: submission.score,
                maxScore: submission.maxScore,
                status: submission.status,
                passedTestCases: submission.passedTestCases,
                totalTestCases: submission.totalTestCases,
              }
            : null,
        };
      })
      .sort((a, b) => {
        const idxA = questionOrder.indexOf(a.id);
        const idxB = questionOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return 0;
      });

    res.json({
      attemptId: attempt.id,
      assessmentId: attempt.assessment.id,
      assessmentTitle: attempt.assessment.title,
      rollNo: attempt.rollNo,
      studentName: attempt.studentName,
      status: attempt.status,
      remainingSeconds,
      drafts: JSON.parse(attempt.drafts || "{}"),
      flaggedQuestions: JSON.parse(attempt.flaggedQuestions || "[]"),
      questions,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Save Draft SQL Query
studentRouter.post("/save-draft", async (req, res) => {
  try {
    const { attemptId, questionId, code } = req.body;
    if (!attemptId || !questionId) {
      return res.status(400).json({ error: "attemptId and questionId are required." });
    }

    const attempt = await prisma.studentAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return res.status(400).json({ error: "Assessment already completed or submitted." });
    }

    const drafts = JSON.parse(attempt.drafts || "{}");
    drafts[questionId] = code || "";

    await prisma.studentAttempt.update({
      where: { id: attemptId },
      data: {
        drafts: JSON.stringify(drafts),
        lastHeartbeat: new Date(),
      },
    });

    res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Toggle Flagged Question
studentRouter.post("/flag", async (req, res) => {
  try {
    const { attemptId, questionId } = req.body;
    const attempt = await prisma.studentAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    let flagged: string[] = JSON.parse(attempt.flaggedQuestions || "[]");
    if (flagged.includes(questionId)) {
      flagged = flagged.filter((id) => id !== questionId);
    } else {
      flagged.push(questionId);
    }

    await prisma.studentAttempt.update({
      where: { id: attemptId },
      data: { flaggedQuestions: JSON.stringify(flagged) },
    });

    res.json({ flaggedQuestions: flagged });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Heartbeat & Anti-Cheat Sync
studentRouter.post("/heartbeat", async (req, res) => {
  try {
    const { attemptId, remainingSeconds } = req.body;
    if (!attemptId) return res.status(400).json({ error: "attemptId required" });

    const attempt = await prisma.studentAttempt.findUnique({
      where: { id: attemptId },
      include: { assessment: true },
    });

    if (!attempt) return res.status(404).json({ error: "Attempt not found" });

    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - new Date(attempt.startedAt).getTime()) / 1000);
    const totalAllowedSeconds = attempt.assessment.durationMinutes * 60;
    const calculatedRemaining = Math.max(0, totalAllowedSeconds - elapsedSeconds);

    let status = attempt.status;
    if (calculatedRemaining <= 0 && status === "IN_PROGRESS") {
      status = "TIME_EXPIRED";
    }

    await prisma.studentAttempt.update({
      where: { id: attemptId },
      data: {
        remainingSeconds: calculatedRemaining,
        lastHeartbeat: now,
        status,
      },
    });

    // Notify live instructor dashboard
    notifyAdminStudentProgress(attempt.assessmentId, {
      attemptId: attempt.id,
      rollNo: attempt.rollNo,
      status,
      remainingSeconds: calculatedRemaining,
    });

    res.json({ status, remainingSeconds: calculatedRemaining });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Finish Assessment - Auto-evaluate any remaining unsubmitted drafts and record final queries & scores
studentRouter.post("/finish", async (req, res) => {
  try {
    const { attemptId } = req.body;
    if (!attemptId) return res.status(400).json({ error: "attemptId required" });

    const attempt = await prisma.studentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: {
          include: {
            questions: true,
          },
        },
        submissions: true,
      },
    });

    if (!attempt) return res.status(404).json({ error: "Attempt not found" });

    const drafts: Record<string, string> = JSON.parse(attempt.drafts || "{}");
    const questions = attempt.assessment.questions;

    // For each question, ensure the student's latest query is evaluated and recorded
    for (const q of questions) {
      const draftCode = (drafts[q.id] || "").trim();
      const existingSubmission = attempt.submissions.find((s) => s.questionId === q.id);

      // If student wrote draft code that wasn't submitted yet or was updated
      if (draftCode && (!existingSubmission || existingSubmission.code !== draftCode)) {
        try {
          const grading = await gradeCandidateQuery(q.id, draftCode, false);

          if (existingSubmission) {
            await prisma.submission.update({
              where: { id: existingSubmission.id },
              data: {
                code: draftCode,
                score: grading.score,
                maxScore: grading.maxScore,
                passedTestCases: grading.passedTestCases,
                totalTestCases: grading.totalTestCases,
                status: grading.status,
                testCaseResults: JSON.stringify(grading.testCaseResults),
                submittedAt: new Date(),
              },
            });
          } else {
            await prisma.submission.create({
              data: {
                attemptId: attempt.id,
                questionId: q.id,
                code: draftCode,
                score: grading.score,
                maxScore: grading.maxScore,
                passedTestCases: grading.passedTestCases,
                totalTestCases: grading.totalTestCases,
                status: grading.status,
                testCaseResults: JSON.stringify(grading.testCaseResults),
              },
            });
          }

          // Record QueryLog
          await prisma.queryLog.create({
            data: {
              attemptId: attempt.id,
              questionId: q.id,
              query: draftCode,
              actionType: "SUBMIT",
              score: grading.score,
              maxScore: grading.maxScore,
              passedTestCases: grading.passedTestCases,
              totalTestCases: grading.totalTestCases,
              status: grading.status,
              executionTimeMs: grading.executionTimeMs,
            },
          });
        } catch (evalErr) {
          console.warn(`Could not auto-grade question ${q.id} on finish:`, evalErr);
        }
      }
    }

    const updated = await prisma.studentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        remainingSeconds: 0,
      },
      include: {
        submissions: true,
      },
    });

    const totalScore = updated.submissions.reduce((sum, s) => sum + s.score, 0);

    notifyAdminStudentProgress(attempt.assessmentId, {
      attemptId: attempt.id,
      rollNo: attempt.rollNo,
      status: "SUBMITTED",
      submittedAt: updated.submittedAt,
      totalScore,
    });

    res.json({
      success: true,
      status: "SUBMITTED",
      totalScore,
      submittedQuestions: updated.submissions.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
