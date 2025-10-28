// Export Analytics Service for Frontend
export interface ExportAnalytics {
  total_exports: number;
  pdf_exports: number;
  docx_exports: number;
  recent_exports: number;
  template_usage: Record<string, number>;
  exports: ExportRecord[];
}

export interface ExportRecord {
  id: number;
  format: string;
  template: string;
  file_size: number;
  success: boolean;
  created_at: string;
  resume_name: string;
}

class ExportAnalyticsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const url = new URL(endpoint, this.baseUrl);
    url.searchParams.set('user_email', user.email);
    
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

  async getExportAnalytics(): Promise<ExportAnalytics> {
    const result = await this.makeRequest('/api/analytics/exports');
    return result.analytics;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
}

export const exportAnalyticsService = new ExportAnalyticsService();

