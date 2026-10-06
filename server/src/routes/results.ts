import { Router } from "express";
import { prisma } from "../db.js";
import { requireAdmin } from "../services/auth.js";

export const resultsRouter = Router();

// 1. Get Gradebook / Results for an Assessment
resultsRouter.get("/assessment/:id", requireAdmin, async (req, res) => {
  try {
    const assessment: any = await prisma.assessment.findUnique({
      where: { id: req.params.id as string },
      include: {
        questions: {
          select: { id: true, title: true, marks: true },
          orderBy: { order: "asc" },
        },
        attempts: {
          include: {
            submissions: {
              select: {
                questionId: true,
                score: true,
                maxScore: true,
                status: true,
                passedTestCases: true,
                totalTestCases: true,
                submittedAt: true,
              },
            },
          },
          orderBy: { startedAt: "desc" },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const totalMaxScore = (assessment.questions || []).reduce(
      (sum: number, q: any) => sum + q.marks,
      0
    );

    const studentRows = (assessment.attempts || []).map((att: any) => {
      const totalScore = (att.submissions || []).reduce(
        (sum: number, s: any) => sum + s.score,
        0
      );
      const percentage =
        totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 1000) / 10 : 0;

      return {
        attemptId: att.id,
        rollNo: att.rollNo,
        studentName: att.studentName,
        status: att.status,
        startedAt: att.startedAt,
        submittedAt: att.submittedAt,
        ipAddress: att.ipAddress,
        deviceInfo: att.deviceInfo,
        violationCount: att.violationCount,
        totalScore: Math.round(totalScore * 10) / 10,
        totalMaxScore,
        percentage,
        submissionCount: att.submissions.length,
        submissions: att.submissions,
      };
    });

    res.json({
      assessmentId: assessment.id,
      title: assessment.title,
      code: assessment.code,
      totalMaxScore,
      questions: assessment.questions,
      students: studentRows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Candidate SQL Inspector (detailed attempt view)
resultsRouter.get("/attempt/:id", requireAdmin, async (req, res) => {
  try {
    const attempt: any = await prisma.studentAttempt.findUnique({
      where: { id: req.params.id as string },
      include: {
        assessment: {
          include: {
            questions: {
              include: {
                testCases: {
                  orderBy: { order: "asc" },
                },
              },
              orderBy: { order: "asc" },
            },
          },
        },
        submissions: {
          orderBy: { submittedAt: "desc" },
        },
        queryLogs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    const drafts = JSON.parse(attempt.drafts || "{}");

    const questionsWithSubmissions = (attempt.assessment?.questions || []).map((q: any) => {
      const submission = (attempt.submissions || []).find((s: any) => s.questionId === q.id);
      const questionQueryLogs = (attempt.queryLogs || []).filter((l: any) => l.questionId === q.id);

      return {
        id: q.id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        marks: q.marks,
        schemaDdl: q.schemaDdl,
        solutionSql: q.solutionSql,
        draftCode: drafts[q.id] || "",
        queryHistory: questionQueryLogs,
        submission: submission
          ? {
              id: submission.id,
              code: submission.code,
              score: submission.score,
              maxScore: submission.maxScore,
              status: submission.status,
              passedTestCases: submission.passedTestCases,
              totalTestCases: submission.totalTestCases,
              testCaseResults: JSON.parse(submission.testCaseResults || "[]"),
              submittedAt: submission.submittedAt,
            }
          : null,
      };
    });

    res.json({
      attemptId: attempt.id,
      rollNo: attempt.rollNo,
      studentName: attempt.studentName,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      ipAddress: attempt.ipAddress,
      deviceInfo: attempt.deviceInfo,
      questions: questionsWithSubmissions,
      allQueryLogs: attempt.queryLogs || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Export CSV Gradebook
resultsRouter.get("/export-csv/:id", requireAdmin, async (req, res) => {
  try {
    const assessment: any = await prisma.assessment.findUnique({
      where: { id: req.params.id as string },
      include: {
        questions: {
          select: { id: true, title: true, marks: true },
          orderBy: { order: "asc" },
        },
        attempts: {
          include: { submissions: true },
          orderBy: { rollNo: "asc" },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const questions: any[] = assessment.questions || [];
    const attempts: any[] = assessment.attempts || [];

    const totalMaxScore = questions.reduce((sum: number, q: any) => sum + q.marks, 0);

    // Build CSV Header with both Score and Submitted Query
    const qHeaders = questions
      .map((q: any, idx: number) => `Q${idx + 1}_Score(${q.marks}m),Q${idx + 1}_SubmittedQuery`)
      .join(",");
    let csv = `Roll No,Name,Status,Total Score,Max Score,Percentage,${qHeaders},IP Address,Started At,Submitted At\n`;

    for (const att of attempts) {
      const submissions: any[] = att.submissions || [];
      const totalScore = submissions.reduce((sum: number, s: any) => sum + s.score, 0);
      const percentage =
        totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 1000) / 10 : 0;

      const qColumns = questions
        .map((q: any) => {
          const sub = submissions.find((s: any) => s.questionId === q.id);
          const score = sub ? sub.score : 0;
          const query = sub ? `"${(sub.code || "").replace(/"/g, '""').replace(/\r?\n/g, ' ')}"` : '""';
          return `${score},${query}`;
        })
        .join(",");

      const roll = `"${(att.rollNo || "").replace(/"/g, '""')}"`;
      const name = `"${(att.studentName || "").replace(/"/g, '""')}"`;
      const ip = `"${(att.ipAddress || "Unknown").replace(/"/g, '""')}"`;
      const started = att.startedAt ? new Date(att.startedAt).toISOString() : "";
      const submitted = att.submittedAt ? new Date(att.submittedAt).toISOString() : "";

      csv += `${roll},${name},${att.status},${totalScore},${totalMaxScore},${percentage}%,${qColumns},${ip},${started},${submitted}\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="assessment_${assessment.code}_grades.csv"`
    );
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
