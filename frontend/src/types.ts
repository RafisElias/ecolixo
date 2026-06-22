// ---- Domain types ----

export interface User {
  id: number;
  name: string;
  email: string;
  type: "citizen" | "manager";
}

export interface Category {
  id: number;
  name: string;
  map_color: string;
}

export interface DisposalPoint {
  id: number;
  user_id: number;
  categories: Category[];
  description: string | null;
  photo_url: string | null;
  status: "pending" | "under_review" | "resolved";
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
}

export interface ReportData {
  by_status: Record<string, number>;
  by_category: Record<string, number>;
}

export interface Report {
  id: number;
  manager_id: number;
  period_start: string;
  period_end: string;
  total_records: number;
  data: ReportData;
  generated_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  point_id: number;
  message: string;
  read: boolean;
  created_at: string;
}

// ---- Auth context ----

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    type: string,
    registrationCode?: string,
  ) => Promise<void>;
  logout: () => void;
}

// ---- Form action return types ----

export interface LoginState {
  error: string | null;
}

export interface RegisterState {
  error: string | null;
  success: boolean;
}

export interface NewReportState {
  error: string | null;
  success: boolean;
}
