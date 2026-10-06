import {
  StudentAttemptSession,
  QuestionGradingResult,
  AdminAssessmentSummary,
  FullAdminAssessment,
} from "../types";

const API_BASE = "/api";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("sql_admin_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  // Student endpoints
  async studentLogin(payload: {
    code: string;
    rollNo: string;
    studentName: string;
    deviceInfo?: any;
    bypassSeb?: boolean;
  }) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (payload.bypassSeb) {
      headers["x-seb-verified"] = "true";
    }

    const res = await fetch(`${API_BASE}/student/login`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      if (res.status === 403 && err.requireSeb) {
        const sebError: any = new Error(err.error || "Safe Exam Browser (SEB) is mandatory.");
        sebError.requireSeb = true;
        sebError.assessment = err.assessment;
        throw sebError;
      }
      throw new Error(err.error || "Login failed");
    }
    return res.json();
  },

  getSebConfigUrl(assessmentId: string) {
    return `${API_BASE}/assessments/${assessmentId}/seb-config`;
  },

  async getStudentAssessment(attemptId: string): Promise<StudentAttemptSession> {
    const res = await fetch(`${API_BASE}/student/assessment/${attemptId}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to load assessment");
    }
    return res.json();
  },

  async saveDraft(attemptId: string, questionId: string, code: string) {
    const res = await fetch(`${API_BASE}/student/save-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, questionId, code }),
    });
    return res.json();
  },

  async toggleFlag(attemptId: string, questionId: string) {
    const res = await fetch(`${API_BASE}/student/flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, questionId }),
    });
    return res.json();
  },

  async heartbeat(attemptId: string, remainingSeconds: number) {
    const res = await fetch(`${API_BASE}/student/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, remainingSeconds }),
    });
    return res.json();
  },

  async finishAssessment(attemptId: string) {
    const res = await fetch(`${API_BASE}/student/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to finish assessment");
    }
    return res.json();
  },

  // Execution endpoints
  async runQuery(questionId: string, code: string): Promise<QuestionGradingResult> {
    const res = await fetch(`${API_BASE}/execution/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, code }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Execution failed");
    }
    return res.json();
  },

  async submitQuery(
    attemptId: string,
    questionId: string,
    code: string
  ): Promise<QuestionGradingResult> {
    const res = await fetch(`${API_BASE}/execution/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, questionId, code }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Submission failed");
    }
    return res.json();
  },

  async testCanonical(schemaDdl: string, seedData: string, querySql: string) {
    const res = await fetch(`${API_BASE}/execution/test-canonical`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schemaDdl, seedData, querySql }),
    });
    return res.json();
  },

  // Admin Auth
  async adminLogin(passcode: string) {
    const res = await fetch(`${API_BASE}/auth/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Authentication failed");
    }
    const data = await res.json();
    localStorage.setItem("sql_admin_token", data.token);
    return data;
  },

  async verifyAdmin(): Promise<boolean> {
    const token = localStorage.getItem("sql_admin_token");
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return Boolean(data.valid);
    } catch {
      return false;
    }
  },

  // Admin Assessments
  async getAssessments(): Promise<AdminAssessmentSummary[]> {
    const res = await fetch(`${API_BASE}/assessments`);
    return res.json();
  },

  async getAssessment(id: string): Promise<FullAdminAssessment> {
    const res = await fetch(`${API_BASE}/assessments/${id}`);
    if (!res.ok) throw new Error("Assessment not found");
    return res.json();
  },

  async createAssessment(payload: any) {
    const res = await fetch(`${API_BASE}/assessments`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create assessment");
    }
    return res.json();
  },

  async updateAssessment(id: string, payload: any) {
    const res = await fetch(`${API_BASE}/assessments/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async deleteAssessment(id: string) {
    const res = await fetch(`${API_BASE}/assessments/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async saveQuestion(assessmentId: string, questionData: any, questionId?: string) {
    const url = questionId
      ? `${API_BASE}/assessments/${assessmentId}/questions/${questionId}`
      : `${API_BASE}/assessments/${assessmentId}/questions`;
    const method = questionId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(questionData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save question");
    }
    return res.json();
  },

  async deleteQuestion(assessmentId: string, questionId: string) {
    const res = await fetch(
      `${API_BASE}/assessments/${assessmentId}/questions/${questionId}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );
    return res.json();
  },

  // Results & Gradebook
  async getGradebook(assessmentId: string) {
    const res = await fetch(`${API_BASE}/results/assessment/${assessmentId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load results");
    return res.json();
  },

  async getAttemptInspector(attemptId: string) {
    const res = await fetch(`${API_BASE}/results/attempt/${attemptId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load student attempt details");
    return res.json();
  },

  getExportCsvUrl(assessmentId: string) {
    return `${API_BASE}/results/export-csv/${assessmentId}`;
  },
};
