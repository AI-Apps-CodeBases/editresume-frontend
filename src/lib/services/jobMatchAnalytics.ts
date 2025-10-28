// Job Match Analytics Service for Frontend
export interface JobMatchAnalytics {
  total_matches: number;
  average_score: number;
  score_trend: Array<{
    date: string;
    score: number;
    resume_name: string;
  }>;
  top_missing_keywords: Array<{
    keyword: string;
    count: number;
  }>;
  improvement_areas: Array<{
    area: string;
    count: number;
  }>;
  matches: Array<{
    id: number;
    resume_name: string;
    match_score: number;
    keyword_matches: string[];
    missing_keywords: string[];
    created_at: string;
    job_description_preview: string;
  }>;
}

export interface JobMatchDetails {
  id: number;
  resume_name: string;
  match_score: number;
  keyword_matches: string[];
  missing_keywords: string[];
  improvement_suggestions: any[];
  job_description: string;
  created_at: string;
}

class JobMatchAnalyticsService {
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

  async getJobMatchAnalytics(): Promise<JobMatchAnalytics> {
    const result = await this.makeRequest('/api/analytics/job-matches');
    return result.analytics;
  }

  async getJobMatchDetails(matchId: number): Promise<JobMatchDetails> {
    const result = await this.makeRequest(`/api/analytics/job-matches/${matchId}`);
    return result.match;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  formatDateShort(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  }

  getScoreLabel(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  }
}

export const jobMatchAnalyticsService = new JobMatchAnalyticsService();

