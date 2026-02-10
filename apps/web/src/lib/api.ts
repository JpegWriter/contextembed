const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchWithAuth(
  endpoint: string,
  { token, ...options }: FetchOptions = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    // Include validation details if available
    const message = error.details 
      ? `${error.error}: ${error.details.map((d: { path: string; message: string }) => `${d.path} - ${d.message}`).join(', ')}`
      : error.error || error.message || 'Request failed';
    throw new Error(message);
  }

  return response.json();
}

// Projects
export const projectsApi = {
  list: (token: string) => fetchWithAuth('/projects', { token }),
  
  get: (token: string, id: string) => 
    fetchWithAuth(`/projects/${id}`, { token }),
  
  create: (token: string, data: { name: string; goal?: string; [key: string]: unknown }) =>
    fetchWithAuth('/projects', {
      token,
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (token: string, id: string, data: Partial<{ name: string; description: string }>) =>
    fetchWithAuth(`/projects/${id}`, {
      token,
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  delete: (token: string, id: string) =>
    fetchWithAuth(`/projects/${id}`, {
      token,
      method: 'DELETE',
    }),
};

// Onboarding
export const onboardingApi = {
  initProfile: (token: string, projectId: string) =>
    fetchWithAuth(`/onboarding/${projectId}/init`, { token, method: 'POST' }),
  
  getProfile: (token: string, projectId: string) =>
    fetchWithAuth(`/onboarding/${projectId}`, { token }),
  
  auditUrl: (token: string, projectId: string, url: string) =>
    fetchWithAuth(`/onboarding/${projectId}/url-audit`, {
      token,
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  
  updateContext: (token: string, projectId: string, context: any) =>
    fetchWithAuth(`/onboarding/${projectId}/context`, {
      token,
      method: 'PATCH',
      body: JSON.stringify(context),
    }),
  
  updateRights: (token: string, projectId: string, rights: any) =>
    fetchWithAuth(`/onboarding/${projectId}/rights`, {
      token,
      method: 'PATCH',
      body: JSON.stringify(rights),
    }),
  
  updatePreferences: (token: string, projectId: string, preferences: any) =>
    fetchWithAuth(`/onboarding/${projectId}/preferences`, {
      token,
      method: 'PATCH',
      body: JSON.stringify(preferences),
    }),
  
  complete: (token: string, projectId: string) =>
    fetchWithAuth(`/onboarding/${projectId}/complete`, {
      token,
      method: 'POST',
    }),
};

// User Profile (global business defaults)
export const userProfileApi = {
  // Get user profile (creates if doesn't exist)
  get: (token: string) =>
    fetchWithAuth('/user-profile', { token }),
  
  // Check onboarding status
  getOnboardingStatus: (token: string) =>
    fetchWithAuth('/user-profile/onboarding-status', { token }),
  
  // Update profile fields
  update: (token: string, data: {
    // Business Identity
    businessName?: string;
    tagline?: string;
    industry?: string;
    niche?: string;
    services?: string[];
    targetAudience?: string;
    brandVoice?: string;
    
    // Location
    city?: string;
    state?: string;
    country?: string;
    serviceArea?: string;
    
    // Professional Authority
    yearsExperience?: number;
    credentials?: string;
    specializations?: string[];
    awardsRecognition?: string;
    clientTypes?: string;
    keyDifferentiator?: string;
    pricePoint?: string;
    brandStory?: string;
    
    // Rights & Contact
    creatorName?: string;
    copyrightTemplate?: string;
    creditTemplate?: string;
    usageTerms?: string;
    website?: string;
    contactEmail?: string;
    
    // Preferences
    primaryLanguage?: string;
    keywordStyle?: string;
    maxKeywords?: number;
    defaultEventType?: string;
    typicalDeliverables?: string[];
  }) =>
    fetchWithAuth('/user-profile', {
      token,
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  // Complete onboarding
  completeOnboarding: (token: string) =>
    fetchWithAuth('/user-profile/complete-onboarding', {
      token,
      method: 'POST',
    }),
  
  // Audit a URL to extract business context
  urlAudit: (token: string, url: string) =>
    fetchWithAuth('/user-profile/url-audit', {
      token,
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
};

// Assets
export const assetsApi = {
  list: (token: string, projectId: string, status?: string) =>
    fetchWithAuth(`/assets/project/${projectId}${status ? `?status=${status}` : ''}`, { token }),
  
  get: (token: string, id: string) =>
    fetchWithAuth(`/assets/${id}`, { token }),
  
  upload: async (token: string, projectId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const response = await fetch(`${API_URL}/assets/upload/${projectId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }
    
    return response.json();
  },
  
  update: (token: string, id: string, data: { userComment?: string; status?: 'approved' }) =>
    fetchWithAuth(`/assets/${id}`, {
      token,
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  delete: (token: string, id: string) =>
    fetchWithAuth(`/assets/${id}`, {
      token,
      method: 'DELETE',
    }),
  
  process: (token: string, projectId: string, assetIds: string[]) =>
    fetchWithAuth('/assets/process', {
      token,
      method: 'POST',
      body: JSON.stringify({ projectId, assetIds }),
    }),
  
  approve: (token: string, id: string) =>
    fetchWithAuth(`/assets/${id}`, {
      token,
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved' }),
    }),
  
  updateComment: (token: string, id: string, userComment: string) =>
    fetchWithAuth(`/assets/${id}`, {
      token,
      method: 'PATCH',
      body: JSON.stringify({ userComment }),
    }),
  
  getFileUrl: (id: string, type: 'original' | 'thumbnail' | 'preview') => {
    // Thumbnails use public endpoint (no auth needed)
    if (type === 'thumbnail') {
      return `${API_URL}/files/${id}/thumbnail`;
    }
    return `${API_URL}/assets/${id}/file/${type}`;
  },
};

// Jobs
export const jobsApi = {
  list: (token: string, projectId: string, status?: string) =>
    fetchWithAuth(`/jobs/project/${projectId}${status ? `?status=${status}` : ''}`, { token }),
  
  get: (token: string, id: string) =>
    fetchWithAuth(`/jobs/${id}`, { token }),
  
  cancel: (token: string, id: string) =>
    fetchWithAuth(`/jobs/${id}/cancel`, { token, method: 'POST' }),
  
  retry: (token: string, id: string) =>
    fetchWithAuth(`/jobs/${id}/retry`, { token, method: 'POST' }),
  
  stats: (token: string, projectId: string) =>
    fetchWithAuth(`/jobs/project/${projectId}/stats`, { token }),
};

// Exports
export const exportsApi = {
  list: (token: string, projectId: string) =>
    fetchWithAuth(`/exports/project/${projectId}`, { token }),
  
  create: (token: string, projectId: string, assetIds: string[]) =>
    fetchWithAuth('/exports', {
      token,
      method: 'POST',
      body: JSON.stringify({ projectId, assetIds }),
    }),
  
  // Advanced export with presets and options
  createAdvanced: (token: string, data: {
    projectId: string;
    assetIds: string[];
    preset: 'lightroom-ready' | 'web-optimized' | 'archive-quality' | 'social-media' | 'client-delivery' | 'custom';
    options?: {
      format?: 'original' | 'jpeg' | 'tiff' | 'png';
      colorProfile?: 'sRGB' | 'AdobeRGB' | 'ProPhotoRGB' | 'original';
      jpegQuality?: number;
      preserveResolution?: boolean;
      maxDimension?: number;
      metadataMethod?: 'embed' | 'sidecar' | 'both';
      includeXmpSidecars?: boolean;
      outputNaming?: 'original' | 'headline' | 'title' | 'date-title' | 'sequence';
      includeManifest?: boolean;
      zipOutput?: boolean;
    };
  }) =>
    fetchWithAuth('/exports/advanced', {
      token,
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // Get available presets
  getPresets: (token: string) =>
    fetchWithAuth('/exports/presets', { token }),
  
  // Include token in query param for direct browser download
  download: (id: string) =>
    `${API_URL}/exports/${id}/download?token=${id}`,
};

// Copilot
export const copilotApi = {
  analyze: (token: string, data: {
    fieldId: string;
    fieldDefinition: unknown;
    currentValue: string;
    formContext: Record<string, unknown>;
    businessContext?: Record<string, unknown>;
  }) =>
    fetchWithAuth('/copilot/analyze', {
      token,
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Growth Images
export const growthApi = {
  // List images for a project
  listImages: (token: string, projectId: string) =>
    fetchWithAuth(`/growth/projects/${projectId}/images`, { token }),
  
  // Get single image details
  getImage: (token: string, id: string) =>
    fetchWithAuth(`/growth/images/${id}`, { token }),
  
  // Update image role (retry flow)
  updateRole: (token: string, id: string, role: 'proof' | 'hero' | 'decorative' | 'stock', reason?: string) =>
    fetchWithAuth(`/growth/images/${id}/role`, {
      token,
      method: 'PATCH',
      body: JSON.stringify({ role, reason }),
    }),
  
  // Re-check governance without changing role
  recheckGovernance: (token: string, id: string) =>
    fetchWithAuth(`/growth/images/${id}/recheck-governance`, {
      token,
      method: 'POST',
    }),
  
  // Delete image
  deleteImage: (token: string, id: string) =>
    fetchWithAuth(`/growth/images/${id}`, {
      token,
      method: 'DELETE',
    }),
};

// Project governance
export const governanceApi = {
  // Update visual authenticity policy
  updatePolicy: (token: string, projectId: string, policy: 'conditional' | 'deny_ai_proof' | 'allow') =>
    fetchWithAuth(`/projects/${projectId}`, {
      token,
      method: 'PATCH',
      body: JSON.stringify({ visualAuthenticityPolicy: policy }),
    }),
  
  // Enable startup mode (locks policy to deny_ai_proof)
  enableStartupMode: (token: string, projectId: string) =>
    fetchWithAuth(`/projects/${projectId}/enable-startup-mode`, {
      token,
      method: 'POST',
    }),
};

// Authorship Integrity Engine
export const authorshipApi = {
  // Get authorship status for all assets in a project
  getProjectAuthorship: (token: string, projectId: string) =>
    fetchWithAuth(`/authorship/project/${projectId}`, { token }),
  
  // Get authorship status for a specific asset
  getAssetAuthorship: (token: string, assetId: string) =>
    fetchWithAuth(`/authorship/asset/${assetId}`, { token }),
  
  // User declaration (confirm/decline creator status)
  declare: (token: string, assetId: string, declared: boolean) =>
    fetchWithAuth(`/authorship/declare/${assetId}`, {
      token,
      method: 'POST',
      body: JSON.stringify({ declared }),
    }),
  
  // Get audit trail for a project
  getAuditTrail: (token: string, projectId: string, limit?: number) =>
    fetchWithAuth(`/authorship/audit/${projectId}?limit=${limit || 100}`, { token }),
  
  // Get audit trail for a specific image
  getImageAudit: (token: string, imageId: string) =>
    fetchWithAuth(`/authorship/audit/image/${imageId}`, { token }),
  
  // Validate export against authorship rules
  validateExport: (token: string, assetIds: string[], exportType: string, textContent?: string[]) =>
    fetchWithAuth('/authorship/validate-export', {
      token,
      method: 'POST',
      body: JSON.stringify({ assetIds, exportType, textContent }),
    }),
  
  // Get metadata permissions for an asset
  getPermissions: (token: string, assetId: string) =>
    fetchWithAuth(`/authorship/permissions/${assetId}`, { token }),
};
