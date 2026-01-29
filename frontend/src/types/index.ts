export interface Product {
  id: string;
  name: string;
  usp: string | null;
  appeal_points: string[] | null;
  mechanism: string | null;
  features: string[] | null;
  english_name: string | null;
  shape: string | null;
  herb_keywords: string[] | null;
  default_utm_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCreate {
  name: string;
  usp?: string;
  appeal_points?: string[];
  mechanism?: string;
  features?: string[];
  english_name?: string;
  shape?: string;
  herb_keywords?: string[];
  default_utm_code?: string;
}

export interface ProductUpdate extends Partial<ProductCreate> {}

export interface CopyType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  core_concept: string | null;
  example_copy: string | null;
  prompt_template: string | null;
  parent_id: string | null;
  variant_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CopyTypeCreate {
  code: string;
  name: string;
  description?: string;
  core_concept?: string;
  example_copy?: string;
  prompt_template?: string;
  parent_id?: string;
  variant_name?: string;
}

export interface CopyTypeUpdate extends Partial<CopyTypeCreate> {}

export interface GeneratedCopy {
  id: string;
  product_id: string;
  copy_type_id: string;
  content: string;
  version: number;
  is_best: boolean;
  ad_spend: number | null;
  created_at: string;
  products?: Product;
  copy_types?: CopyType;
}

export interface CopyCreate {
  product_id: string;
  copy_type_id: string;
  content: string;
  version?: number;
}

export interface CopyUpdate {
  content?: string;
  is_best?: boolean;
  ad_spend?: number;
}

export interface Checklist {
  id: string;
  product_id: string;
  copy_type_id: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes: string | null;
  week: string;
  utm_code: string | null;
  updated_at: string;
  products?: Product;
  copy_types?: CopyType;
}

export interface ChecklistUpdate {
  status?: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  utm_code?: string;
}

export interface ChecklistStats {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  completion_rate: number;
}

export interface BestCopy {
  id: string;
  copy_id: string;
  month: string;
  ad_spend: number;
  created_at: string;
  generated_copies?: GeneratedCopy;
}

export interface BestCopyCreate {
  copy_id: string;
  month: string;
  ad_spend: number;
}

// Team
export interface Team {
  id: string;
  name: string;
  created_at: string;
}

export interface TeamCreate {
  name: string;
}

// User
export interface User {
  id: string;
  email: string;
  name: string;
  team_id: string;
  team?: Team;
  is_approved: boolean;
  role: 'user' | 'leader' | 'admin';
  created_at: string;
}

// Auth
export interface AuthRegister {
  email: string;
  password: string;
  name: string;
  team_id: string;
}

export interface AuthLogin {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
  };
}

// Team Product
export interface TeamProduct {
  id: string;
  team_id: string;
  product_id: string;
  created_at: string;
}
