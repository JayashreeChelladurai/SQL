import { prisma } from "../db.js";
import {
  executeSqlSandbox,
  compareSqlResults,
  generateExpectedOutput,
  ExpectedOutput,
  ComparisonDiff,
} from "./sqlRunner.js";

export interface TestCaseEvaluation {
  testCaseId: string;
  title: string;
  isPublic: boolean;
  order: number;
  status: "PASSED" | "FAILED" | "ERROR";
  errorMessage: string | null;
  executionTimeMs: number;
  actualColumns: string[];
  expectedColumns: string[];
  actualRows: any[][];
  expectedRows: any[][];
  actualRowCount: number;
  expectedRowCount: number;
  diff: ComparisonDiff;
}

export interface QuestionGradingResult {
  questionId: string;
  status: "ACCEPTED" | "WRONG_ANSWER" | "SQL_SYNTAX_ERROR";
  score: number;
  maxScore: number;
  passedTestCases: number;
  totalTestCases: number;
  executionTimeMs: number;
  testCaseResults: TestCaseEvaluation[];
}

export async function gradeCandidateQuery(
  questionId: string,
  candidateSql: string,
  onlyPublic: boolean = false
): Promise<QuestionGradingResult> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      testCases: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!question) {
    throw new Error(`Question with id ${questionId} not found.`);
  }

  const testCasesToRun = onlyPublic
    ? question.testCases.filter((tc) => tc.isPublic)
    : question.testCases;

  if (testCasesToRun.length === 0) {
    throw new Error(`No test cases configured for this question.`);
  }

  let totalScore = 0;
  let passedCount = 0;
  let hasSyntaxError = false;
  let totalExecutionTime = 0;
  const evaluations: TestCaseEvaluation[] = [];

  for (const tc of testCasesToRun) {
    // 1. Resolve Expected Output
    let expected: ExpectedOutput;
    try {
      if (tc.expectedOutput && tc.expectedOutput.trim().length > 2) {
        expected = JSON.parse(tc.expectedOutput);
      } else {
        expected = generateExpectedOutput(
          question.schemaDdl,
          tc.seedData,
          question.solutionSql
        );
        // Cache expected output back to database asynchronously
        prisma.testCase
          .update({
            where: { id: tc.id },
            data: { expectedOutput: JSON.stringify(expected) },
          })
          .catch(() => {});
      }
    } catch (err: any) {
      expected = {
        columns: [],
        rows: [],
        rowCount: 0,
      };
    }

    // 2. Execute Candidate Query in Sandbox
    const actual = executeSqlSandbox(question.schemaDdl, tc.seedData, candidateSql);
    totalExecutionTime += actual.executionTimeMs;

    if (!actual.success) {
      hasSyntaxError = true;
      evaluations.push({
        testCaseId: tc.id,
        title: tc.title,
        isPublic: tc.isPublic,
        order: tc.order,
        status: "ERROR",
        errorMessage: actual.error || "Query execution failed",
        executionTimeMs: actual.executionTimeMs,
        actualColumns: [],
        expectedColumns: expected.columns || [],
        actualRows: [],
        expectedRows: tc.isPublic ? expected.rows || [] : [],
        actualRowCount: 0,
        expectedRowCount: expected.rowCount || 0,
        diff: {
          status: "FAILED",
          reason: actual.error,
        },
      });
      continue;
    }

    // 3. Compare with Expected Output
    const orderSensitive =
      tc.orderSensitive !== null ? tc.orderSensitive : question.orderSensitive;
    const diff = compareSqlResults(actual, expected, orderSensitive);

    const isPassed = diff.status === "PASSED";
    if (isPassed) {
      passedCount++;
      totalScore += (tc.weight || 1.0);
    }

    evaluations.push({
      testCaseId: tc.id,
      title: tc.title,
      isPublic: tc.isPublic,
      order: tc.order,
      status: isPassed ? "PASSED" : "FAILED",
      errorMessage: isPassed ? null : diff.reason || "Output does not match expected result",
      executionTimeMs: actual.executionTimeMs,
      actualColumns: actual.columns,
      expectedColumns: expected.columns,
      actualRows: actual.rows,
      expectedRows: tc.isPublic ? expected.rows : (isPassed ? actual.rows : []),
      actualRowCount: actual.rowCount,
      expectedRowCount: expected.rowCount,
      diff,
    });
  }

  // Calculate proportional marks
  const totalWeight = testCasesToRun.reduce((sum, tc) => sum + (tc.weight || 1.0), 0);
  const normalizedScore =
    totalWeight > 0 ? (totalScore / totalWeight) * question.marks : 0;

  let overallStatus: QuestionGradingResult["status"] = "WRONG_ANSWER";
  if (passedCount === testCasesToRun.length) {
    overallStatus = "ACCEPTED";
  } else if (hasSyntaxError && passedCount === 0) {
    overallStatus = "SQL_SYNTAX_ERROR";
  }

  return {
    questionId: question.id,
    status: overallStatus,
    score: Math.round(normalizedScore * 10) / 10,
    maxScore: question.marks,
    passedTestCases: passedCount,
    totalTestCases: testCasesToRun.length,
    executionTimeMs: Math.round(totalExecutionTime * 100) / 100,
    testCaseResults: evaluations,
  };
}
