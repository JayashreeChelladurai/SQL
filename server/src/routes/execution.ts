import { Router } from "express";
import { prisma } from "../db.js";
import { gradeCandidateQuery } from "../services/gradingService.js";
import { executeSqlSandbox } from "../services/sqlRunner.js";
import { notifyAdminStudentProgress } from "../services/socketService.js";

export const executionRouter = Router();

// 1. Run Query (Sample / Public Test Cases Only - Fast Feedback)
executionRouter.post("/run", async (req, res) => {
  try {
    const { attemptId, questionId, code } = req.body;

    if (!questionId) {
      return res.status(400).json({ error: "questionId is required." });
    }

    if (!code || code.trim() === "") {
      return res.status(400).json({ error: "SQL query code cannot be empty." });
    }

    // Run against only public/sample test cases
    const result = await gradeCandidateQuery(questionId, code, true);

    // Record candidate run query log if attemptId provided
    if (attemptId) {
      prisma.queryLog
        .create({
          data: {
            attemptId,
            questionId,
            query: code,
            actionType: "RUN",
            score: result.score,
            maxScore: result.maxScore,
            passedTestCases: result.passedTestCases,
            totalTestCases: result.totalTestCases,
            status: result.status,
            executionTimeMs: result.executionTimeMs,
          },
        })
        .catch(() => {});
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Submit Question (Grading against all test cases + Save Submission + Log Query)
executionRouter.post("/submit", async (req, res) => {
  try {
    const { attemptId, questionId, code } = req.body;

    if (!attemptId || !questionId) {
      return res.status(400).json({ error: "attemptId and questionId are required." });
    }

    if (!code || code.trim() === "") {
      return res.status(400).json({ error: "SQL query code cannot be empty." });
    }

    const attempt = await prisma.studentAttempt.findUnique({
      where: { id: attemptId },
      include: { assessment: true },
    });

    if (!attempt) {
      return res.status(404).json({ error: "Student attempt session not found." });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return res.status(400).json({ error: "Assessment already completed." });
    }

    // Grade candidate query against ALL test cases
    const grading = await gradeCandidateQuery(questionId, code, false);

    // Save or update primary question submission
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        attemptId,
        questionId,
      },
    });

    let submission;
    if (existingSubmission) {
      submission = await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          code,
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
      submission = await prisma.submission.create({
        data: {
          attemptId,
          questionId,
          code,
          score: grading.score,
          maxScore: grading.maxScore,
          passedTestCases: grading.passedTestCases,
          totalTestCases: grading.totalTestCases,
          status: grading.status,
          testCaseResults: JSON.stringify(grading.testCaseResults),
        },
      });
    }

    // Permanently record query in student QueryLog audit trail
    await prisma.queryLog.create({
      data: {
        attemptId,
        questionId,
        query: code,
        actionType: "SUBMIT",
        score: grading.score,
        maxScore: grading.maxScore,
        passedTestCases: grading.passedTestCases,
        totalTestCases: grading.totalTestCases,
        status: grading.status,
        executionTimeMs: grading.executionTimeMs,
      },
    });

    // Update draft in attempt
    const drafts = JSON.parse(attempt.drafts || "{}");
    drafts[questionId] = code;
    await prisma.studentAttempt.update({
      where: { id: attemptId },
      data: { drafts: JSON.stringify(drafts) },
    });

    // Notify live admin proctor
    notifyAdminStudentProgress(attempt.assessmentId, {
      attemptId,
      rollNo: attempt.rollNo,
      questionId,
      score: grading.score,
      status: grading.status,
      passedTestCases: grading.passedTestCases,
      totalTestCases: grading.totalTestCases,
    });

    res.json({
      ...grading,
      submissionId: submission.id,
      submittedAt: submission.submittedAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Test Canonical / Ad-hoc SQL execution (for Instructor question authoring)
executionRouter.post("/test-canonical", (req, res) => {
  try {
    const { schemaDdl, seedData, querySql } = req.body;
    if (!schemaDdl || !querySql) {
      return res.status(400).json({ error: "schemaDdl and querySql are required." });
    }

    const result = executeSqlSandbox(schemaDdl, seedData || "", querySql);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
