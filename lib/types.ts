export type AuthType = "apiKey" | "bearer";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface System {
  id: string;
  name: string;
  base_url: string;
  auth_type: AuthType;
  docs_url: string | null;
  created_at: string;
}

export interface Scenario {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  cta_system_id: string | null;
  cts_system_id: string | null;
  created_at: string;
}

export interface FieldMapping {
  id: string;
  scenario_id: string;
  source_path: string;
  target_path: string;
  transform_notes: string | null;
  created_at: string;
}

export interface Endpoint {
  id: string;
  system_id: string;
  method: string;
  path: string;
  summary: string | null;
  request_schema: unknown;
  response_schema: unknown;
  created_at: string;
}
