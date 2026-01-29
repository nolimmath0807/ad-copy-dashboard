import type {
  Product,
  ProductCreate,
  ProductUpdate,
  CopyType,
  CopyTypeCreate,
  CopyTypeUpdate,
  GeneratedCopy,
  CopyCreate,
  CopyUpdate,
  Checklist,
  ChecklistUpdate,
  ChecklistStats,
  BestCopy,
  BestCopyCreate,
  Team,
  TeamCreate,
  TeamProduct,
  User,
  AuthRegister,
  AuthLogin,
  AuthResponse,
  AdPerformance,
  CopyTypePerformance,
  WeeklyTeamPerformance,
  AuditLog,
} from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  // 204 No Content 응답 처리
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

// Products API
export const productsApi = {
  list: () => fetchAPI<Product[]>('/api/products'),
  get: (id: string) => fetchAPI<Product>(`/api/products/${id}`),
  create: (data: ProductCreate) => fetchAPI<Product>('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: ProductUpdate) => fetchAPI<Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI<void>(`/api/products/${id}`, { method: 'DELETE' }),
};

// Copy Types API
export const copyTypesApi = {
  list: () => fetchAPI<CopyType[]>('/api/copy-types'),
  get: (id: string) => fetchAPI<CopyType>(`/api/copy-types/${id}`),
  create: (data: CopyTypeCreate) => fetchAPI<CopyType>('/api/copy-types', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: CopyTypeUpdate) => fetchAPI<CopyType>(`/api/copy-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI<void>(`/api/copy-types/${id}`, { method: 'DELETE' }),
};

// Copies API
export const copiesApi = {
  list: (productId?: string, copyTypeId?: string) => {
    const params = new URLSearchParams();
    if (productId) params.append('product_id', productId);
    if (copyTypeId) params.append('copy_type_id', copyTypeId);
    return fetchAPI<GeneratedCopy[]>(`/api/copies?${params}`);
  },
  get: (id: string) => fetchAPI<GeneratedCopy>(`/api/copies/${id}`),
  create: (data: CopyCreate) => fetchAPI<GeneratedCopy>('/api/copies', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: CopyUpdate) => fetchAPI<GeneratedCopy>(`/api/copies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI<void>(`/api/copies/${id}`, { method: 'DELETE' }),
};

// Checklists API
export const checklistsApi = {
  list: (teamId?: string, week?: string) => {
    const params = new URLSearchParams();
    if (teamId) params.append('team_id', teamId);
    if (week) params.append('week', week);
    const queryString = params.toString();
    return fetchAPI<Checklist[]>(`/api/checklists${queryString ? `?${queryString}` : ''}`);
  },
  stats: () => fetchAPI<ChecklistStats>('/api/checklists/stats'),
  update: (id: string, data: ChecklistUpdate) => fetchAPI<Checklist>(`/api/checklists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  initWeek: (week?: string) => fetchAPI<Checklist[]>(`/api/checklists/init-week${week ? `?week=${week}` : ''}`, { method: 'POST' }),
};

// Best Copies API
export const bestCopiesApi = {
  list: (month?: string) => fetchAPI<BestCopy[]>(`/api/best-copies${month ? `?month=${month}` : ''}`),
  create: (data: BestCopyCreate) => fetchAPI<BestCopy>('/api/best-copies', { method: 'POST', body: JSON.stringify(data) }),
};

// Teams API
export const teamsApi = {
  list: () => fetchAPI<Team[]>('/api/teams'),
  create: (data: TeamCreate) => fetchAPI<Team>('/api/teams', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI<void>(`/api/teams/${id}`, { method: 'DELETE' }),
};

// Team Products API
export const teamProductsApi = {
  list: (teamId?: string) => fetchAPI<TeamProduct[]>(`/api/team-products${teamId ? `?team_id=${teamId}` : ''}`),
  create: (teamId: string, productId: string) => fetchAPI<TeamProduct>('/api/team-products', { method: 'POST', body: JSON.stringify({ team_id: teamId, product_id: productId }) }),
  delete: (id: string) => fetchAPI<void>(`/api/team-products/${id}`, { method: 'DELETE' }),
};

// Auth API
export const authApi = {
  register: (data: AuthRegister) => fetchAPI<User>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: AuthLogin) => fetchAPI<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: (token: string) => fetchAPI<User>('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  }),
  listUsers: () => fetchAPI<User[]>('/api/auth/users'),
  approve: (id: string) => fetchAPI<User>(`/api/auth/approve/${id}`, { method: 'PUT' }),
  updateRole: (id: string, role: string) => fetchAPI<User>(`/api/auth/role/${id}`, { method: 'PUT', body: JSON.stringify({ role }) }),
  updateName: (id: string, name: string) => fetchAPI<User>(`/api/auth/users/${id}/name`, { method: 'PUT', body: JSON.stringify({ name }) }),
  resetPassword: (id: string, password: string) => fetchAPI<User>(`/api/auth/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
};

// AI API
export const aiApi = {
  generate: (productId: string, copyTypeId: string, customPrompt?: string) =>
    fetchAPI<GeneratedCopy>('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        copy_type_id: copyTypeId,
        custom_prompt: customPrompt || undefined
      })
    }),
  regenerate: (copyId: string) =>
    fetchAPI<GeneratedCopy>(`/api/ai/regenerate/${copyId}`, { method: 'POST' }),
};

// Ad Performance API
export const adPerformanceApi = {
  getByUtmCodes: (utmCodes: string[], month: string) =>
    fetchAPI<Record<string, AdPerformance>>('/api/ad-performance/by-utm', {
      method: 'POST',
      body: JSON.stringify({ utm_codes: utmCodes, month }),
    }),
  getCopyTypePerformance: (month: string, teamId?: string) =>
    fetchAPI<CopyTypePerformance[]>('/api/ad-performance/copy-type', {
      method: 'POST',
      body: JSON.stringify({ month, team_id: teamId }),
    }),
  getWeeklyReport: (startWeek: string, endWeek: string, teamIds: string[]) =>
    fetchAPI<WeeklyTeamPerformance>('/api/ad-performance/weekly-report', {
      method: 'POST',
      body: JSON.stringify({ start_week: startWeek, end_week: endWeek, team_ids: teamIds }),
    }),
};

// Audit Logs API
export const auditLogsApi = {
  list: (tableName?: string, limit = 100, offset = 0) => {
    const params = new URLSearchParams();
    if (tableName) params.append('table_name', tableName);
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    return fetchAPI<AuditLog[]>(`/api/audit-logs?${params}`);
  },
};
