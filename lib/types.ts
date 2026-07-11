export type UserRole = "admin" | "supervisor";
export type AttendanceType = "entrada" | "salida";

export interface Project {
  id: string;
  code: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  project_id: string | null;
  created_at: string;
}

export interface Worker {
  id: string;
  full_name: string;
  document_id: string;
  qr_token: string;
  active: boolean;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  worker_id: string;
  project_id: string;
  supervisor_id: string;
  type: AttendanceType;
  recorded_at: string;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
  observations: string | null;
}

export interface AttendanceRecordWithRelations extends AttendanceRecord {
  worker: Pick<Worker, "id" | "full_name" | "document_id">;
  project: Pick<Project, "id" | "code" | "name">;
  supervisor: Pick<Profile, "id" | "full_name">;
}
