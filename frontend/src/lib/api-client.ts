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
} from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
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
  list: (teamId?: string) => {
    const params = new URLSearchParams();
    if (teamId) params.append('team_id', teamId);
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
