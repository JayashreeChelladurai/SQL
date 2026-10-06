export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface ColumnInfo {
  name: string;
  type: string;
  isPk?: boolean;
  nullable?: boolean;
}

export interface TableSchemaInfo {
  tableName: string;
  columns: ColumnInfo[];
  sampleRows: Record<string, any>[];
}

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
  diff: {
    status: "PASSED" | "FAILED";
    reason?: string;
    columnMismatch?: { expected: string[]; actual: string[] };
    rowCountMismatch?: { expected: number; actual: number };
    cellMismatches?: {
      rowIdx: number;
      colIdx: number;
      columnName: string;
      expected: any;
      actual: any;
    }[];
  };
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
  submissionId?: string;
  submittedAt?: string;
}

export interface PublicTestCase {
  id: string;
  title: string;
  seedData: string;
  expectedOutput: {
    columns: string[];
    rows: any[][];
    rowCount: number;
  } | null;
}

export interface StudentQuestion {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  marks: number;
  schemaDdl: string;
  schemaOverview: TableSchemaInfo[];
  starterCode: string;
  orderSensitive: boolean;
  publicTestCases: PublicTestCase[];
  submission: {
    id: string;
    code: string;
    score: number;
    maxScore: number;
    status: string;
    passedTestCases: number;
    totalTestCases: number;
  } | null;
}

export interface StudentAttemptSession {
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  rollNo: string;
  studentName: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "TIME_EXPIRED";
  remainingSeconds: number;
  drafts: Record<string, string>;
  flaggedQuestions: string[];
  questions: StudentQuestion[];
}

export interface AdminAssessmentSummary {
  id: string;
  title: string;
  description: string;
  code: string;
  durationMinutes: number;
  shuffleQuestions: boolean;
  requireSeb: boolean;
  sebQuitPassword: string;
  isReviewUnlocked: boolean;
  createdAt: string;
  _count: {
    questions: number;
    attempts: number;
  };
}

export interface FullAdminAssessment extends AdminAssessmentSummary {
  questions: {
    id: string;
    title: string;
    description: string;
    difficulty: Difficulty;
    marks: number;
    schemaDdl: string;
    starterCode: string;
    solutionSql: string;
    orderSensitive: boolean;
    explanation: string;
    testCases: {
      id: string;
      title: string;
      seedData: string;
      expectedOutput: string;
      isPublic: boolean;
      orderSensitive: boolean | null;
      weight: number;
      order: number;
    }[];
  }[];
}
