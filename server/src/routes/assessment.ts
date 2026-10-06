import { Router } from "express";
import { prisma } from "../db.js";
import { requireAdmin } from "../services/auth.js";
import {
  generateExpectedOutput,
  extractSchemaOverview,
  executeSqlSandbox,
} from "../services/sqlRunner.js";
import { generateSebConfig } from "../services/sebService.js";

export const assessmentRouter = Router();

// 1. List all assessments
assessmentRouter.get("/", async (_req, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
      include: {
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(assessments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Download SEB configuration file (.seb)
assessmentRouter.get("/:id/seb-config", async (req, res) => {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.id as string },
    });

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const host = req.headers.host || "127.0.0.1:5001";
    const protocol = req.protocol || "http";
    const startUrl = `${protocol}://${host}/?code=${encodeURIComponent(assessment.code)}`;

    const configXml = generateSebConfig({
      assessmentCode: assessment.code,
      startUrl,
      quitPassword: assessment.sebQuitPassword || "exit123",
      title: assessment.title,
    });

    res.setHeader("Content-Type", "application/seb");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="assessment_${assessment.code}.seb"`
    );
    res.send(configXml);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get single assessment with questions and sections
assessmentRouter.get("/:id", async (req, res) => {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.id as string },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
        questions: {
          orderBy: { order: "asc" },
          include: {
            testCases: {
              orderBy: { order: "asc" },
            },
          },
        },
        _count: {
          select: { attempts: true },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    res.json(assessment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create assessment
assessmentRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      code,
      durationMinutes,
      shuffleQuestions,
      requireSeb,
      sebQuitPassword,
    } = req.body;

    if (!title || !code) {
      return res.status(400).json({ error: "Title and Access Code are required." });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await prisma.assessment.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return res.status(400).json({ error: `Access code '${cleanCode}' already exists.` });
    }

    const assessment = await prisma.assessment.create({
      data: {
        title: title.trim(),
        description: description || "",
        code: cleanCode,
        durationMinutes: Number(durationMinutes) || 60,
        shuffleQuestions: shuffleQuestions ?? true,
        requireSeb: requireSeb ?? false,
        sebQuitPassword: sebQuitPassword || "exit123",
      },
    });

    res.status(201).json(assessment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update assessment
assessmentRouter.put("/:id", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      code,
      durationMinutes,
      shuffleQuestions,
      requireSeb,
      sebQuitPassword,
      isReviewUnlocked,
    } = req.body;

    const cleanCode = code ? code.trim().toUpperCase() : undefined;
    const assessment = await prisma.assessment.update({
      where: { id: req.params.id as string },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(cleanCode && { code: cleanCode }),
        ...(durationMinutes && { durationMinutes: Number(durationMinutes) }),
        ...(shuffleQuestions !== undefined && { shuffleQuestions }),
        ...(requireSeb !== undefined && { requireSeb }),
        ...(sebQuitPassword !== undefined && { sebQuitPassword }),
        ...(isReviewUnlocked !== undefined && { isReviewUnlocked }),
      },
    });

    res.json(assessment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete assessment
assessmentRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.assessment.delete({
      where: { id: req.params.id as string },
    });
    res.json({ message: "Assessment deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Save or update full question suite
assessmentRouter.post("/:id/questions", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      marks,
      schemaDdl,
      starterCode,
      solutionSql,
      orderSensitive,
      explanation,
      testCases,
    } = req.body;

    if (!title || !schemaDdl || !solutionSql) {
      return res.status(400).json({
        error: "Question title, Schema DDL, and Canonical Solution SQL are required.",
      });
    }

    // Auto-calculate expected outputs for test cases
    const processedTestCases = (testCases || []).map((tc: any, index: number) => {
      let expectedOutput = "{}";
      try {
        const generated = generateExpectedOutput(schemaDdl, tc.seedData || "", solutionSql);
        expectedOutput = JSON.stringify(generated);
      } catch (e: any) {
        console.warn(`Could not compute expected output for test case ${index}:`, e.message);
      }

      return {
        title: tc.title || `Test Case ${index + 1}`,
        seedData: tc.seedData || "",
        expectedOutput,
        isPublic: tc.isPublic ?? true,
        orderSensitive: tc.orderSensitive ?? null,
        weight: Number(tc.weight) || 1.0,
        order: index,
      };
    });

    const question = await prisma.question.create({
      data: {
        assessmentId: req.params.id as string,
        title: title.trim(),
        description: description || "",
        difficulty: difficulty || "MEDIUM",
        marks: Number(marks) || 10,
        schemaDdl: schemaDdl.trim(),
        starterCode: starterCode || "-- Write your SQL query below\nSELECT \nFROM \n",
        solutionSql: solutionSql.trim(),
        orderSensitive: Boolean(orderSensitive),
        explanation: explanation || "",
        testCases: {
          create: processedTestCases,
        },
      },
      include: {
        testCases: true,
      },
    });

    res.status(201).json(question);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Update existing question
assessmentRouter.put("/:id/questions/:questionId", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      marks,
      schemaDdl,
      starterCode,
      solutionSql,
      orderSensitive,
      explanation,
      testCases,
    } = req.body;

    // Delete existing test cases and re-create with fresh computed expected outputs
    await prisma.testCase.deleteMany({
      where: { questionId: req.params.questionId as string },
    });

    const processedTestCases = (testCases || []).map((tc: any, index: number) => {
      let expectedOutput = "{}";
      try {
        const generated = generateExpectedOutput(schemaDdl, tc.seedData || "", solutionSql);
        expectedOutput = JSON.stringify(generated);
      } catch (e: any) {
        console.warn(`Could not compute expected output for testcase ${index}:`, e.message);
      }

      return {
        title: tc.title || `Test Case ${index + 1}`,
        seedData: tc.seedData || "",
        expectedOutput,
        isPublic: tc.isPublic ?? true,
        orderSensitive: tc.orderSensitive ?? null,
        weight: Number(tc.weight) || 1.0,
        order: index,
      };
    });

    const updated = await prisma.question.update({
      where: { id: req.params.questionId as string },
      data: {
        title: title.trim(),
        description: description || "",
        difficulty: difficulty || "MEDIUM",
        marks: Number(marks) || 10,
        schemaDdl: schemaDdl.trim(),
        starterCode: starterCode || "-- Write your SQL query below\nSELECT \nFROM \n",
        solutionSql: solutionSql.trim(),
        orderSensitive: Boolean(orderSensitive),
        explanation: explanation || "",
        testCases: {
          create: processedTestCases,
        },
      },
      include: {
        testCases: true,
      },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Delete question
assessmentRouter.delete("/:id/questions/:questionId", requireAdmin, async (req, res) => {
  try {
    await prisma.question.delete({
      where: { id: req.params.questionId as string },
    });
    res.json({ message: "Question deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Inspect schema helper
assessmentRouter.post("/parse-schema", (req, res) => {
  const { schemaDdl, seedData } = req.body;
  if (!schemaDdl) {
    return res.status(400).json({ error: "schemaDdl is required" });
  }
  const overview = extractSchemaOverview(schemaDdl, seedData);
  res.json({ tables: overview });
});
