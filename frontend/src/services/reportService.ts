import api from "../api/client";
import type { Report } from "../types";

export async function generateReport(periodStart: string, periodEnd: string): Promise<Report> {
  const { data } = await api.post<Report>("/reports", {
    period_start: periodStart,
    period_end: periodEnd,
  });
  return data;
}
