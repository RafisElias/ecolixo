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
  review_status: ReviewStatus;
  reviewed_at: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

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

export interface PickupServiceInput {
  name: string;
  provider_type: "individual" | "company";
  contact: string;
  service_area: string;
  description: string;
  pricing: "free" | "paid" | "on_request";
  category_ids: number[];
  reference_latitude?: number | null;
  reference_longitude?: number | null;
  radius_km?: number | null;
}

export interface PickupService extends Omit<PickupServiceInput, "category_ids"> {
  id: number;
  user_id: number;
  categories: Category[];
  created_at: string;
  updated_at: string;
}

export interface MissionOption {
  id: string;
  text: string;
}

export interface MissionQuestion {
  id: string;
  prompt: string;
  options: MissionOption[];
}

export interface Mission {
  key: string;
  title: string;
  summary: string;
  content: string[];
  questions: MissionQuestion[];
  points: number;
  completed: boolean;
}

export interface MissionResult {
  passed: boolean;
  already_completed: boolean;
  points_awarded: number;
  incorrect_question_ids: string[];
}

export interface Achievement {
  key: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  goal: number;
}

export interface ScoreEvent {
  id: number;
  reason: "mission_completed" | "contribution_approved";
  description: string;
  points: number;
  created_at: string;
  revoked_at: string | null;
}

export interface Journey {
  balance: number;
  missions_completed: number;
  missions_total: number;
  contributions: Record<ReviewStatus, number>;
  achievements: Achievement[];
  history: ScoreEvent[];
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
