// Shared Resume Service for Frontend
import config from '../config';

export interface SharedResumeInfo {
  share_token: string;
  share_url: string;
  expires_at: string | null;
  password_protected: boolean;
}

export interface SharedResumeData {
  resume: {
    id: number;
    name: string;
    title: string;
    template: string;
    created_at: string;
    updated_at: string;
  };
  resume_data: any;
  shared_info: {
    created_at: string;
    expires_at: string | null;
  };
}

export interface SharedResumeAnalytics {
  total_views: number;
  unique_visitors: number;
  views_by_date: Record<string, number>;
  recent_views: Array<{
    ip: string;
    user_agent: string;
    referrer: string;
    created_at: string;
  }>;
}

class SharedResumeService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.apiBase;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const url = new URL(endpoint, this.baseUrl);
    
    // Add user email to query params for authenticated endpoints
    if (options.method === 'POST' || options.method === 'DELETE' || endpoint.includes('/analytics')) {
      if (!user.email) {
        throw new Error('User must be authenticated to perform this action');
      }
      url.searchParams.set('user_email', user.email);
    }
    
    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async createSharedResume(resumeId: number, password?: string, expiresDays?: number): Promise<SharedResumeInfo> {
    const url = new URL('/api/resume/share', this.baseUrl);
    url.searchParams.set('resume_id', resumeId.toString());
    if (password) url.searchParams.set('password', password);
    if (expiresDays) url.searchParams.set('expires_days', expiresDays.toString());

    const result = await this.makeRequest(url.toString(), {
      method: 'POST',
    });

    return {
      share_token: result.share_token,
      share_url: result.share_url,
      expires_at: result.expires_at,
      password_protected: result.password_protected
    };
  }

  async getSharedResume(shareToken: string, password?: string): Promise<SharedResumeData> {
    const url = new URL(`/api/resume/shared/${shareToken}`, this.baseUrl);
    if (password) url.searchParams.set('password', password);

    const result = await this.makeRequest(url.toString());
    return result;
  }

  async trackView(shareToken: string): Promise<void> {
    await this.makeRequest(`/api/resume/shared/${shareToken}/view`, {
      method: 'POST',
    });
  }

  async getAnalytics(shareToken: string): Promise<SharedResumeAnalytics> {
    const result = await this.makeRequest(`/api/resume/shared/${shareToken}/analytics`);
    return result.analytics;
  }

  async deactivateSharedResume(shareToken: string): Promise<void> {
    await this.makeRequest(`/api/resume/shared/${shareToken}`, {
      method: 'DELETE',
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  formatDateShort(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}

export const sharedResumeService = new SharedResumeService();

