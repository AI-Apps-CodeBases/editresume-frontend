// Version Control Service for Frontend
export interface ResumeVersion {
  id: number;
  version_number: number;
  change_summary: string | null;
  is_auto_save: boolean;
  created_at: string;
}

export interface ResumeVersionData extends ResumeVersion {
  resume_data: any;
}

export interface VersionComparison {
  version1: {
    id: number;
    version_number: number;
    created_at: string;
    change_summary: string | null;
  };
  version2: {
    id: number;
    version_number: number;
    created_at: string;
    change_summary: string | null;
  };
  differences: {
    personal_info: Record<string, { old: any; new: any }>;
    sections: Record<string, any>;
    summary: { old: any; new: any } | null;
  };
}

class VersionControlService {
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

  async saveResume(resumeData: any): Promise<{ resume_id: number; version_id: number }> {
    const payload = {
      name: resumeData.personalInfo?.name || '',
      title: resumeData.personalInfo?.title || '',
      email: resumeData.personalInfo?.email || '',
      phone: resumeData.personalInfo?.phone || '',
      location: resumeData.personalInfo?.location || '',
      summary: resumeData.summary || '',
      sections: resumeData.sections || [],
      template: resumeData.template || 'tech'
    };

    const result = await this.makeRequest('/api/resume/save', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      resume_id: result.resume_id,
      version_id: result.version_id
    };
  }

  async createVersion(resumeId: number, resumeData: any, changeSummary?: string, isAutoSave: boolean = false): Promise<ResumeVersion> {
    const payload = {
      resume_id: resumeId,
      resume_data: resumeData,
      change_summary: changeSummary,
      is_auto_save: isAutoSave
    };

    const result = await this.makeRequest('/api/resume/version/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      id: result.version_id,
      version_number: result.version_number,
      change_summary: changeSummary || null,
      is_auto_save: isAutoSave,
      created_at: new Date().toISOString()
    };
  }

  async getResumeVersions(resumeId: number): Promise<ResumeVersion[]> {
    const result = await this.makeRequest(`/api/resume/${resumeId}/versions`);
    return result.versions;
  }

  async getVersion(versionId: number): Promise<ResumeVersionData> {
    const result = await this.makeRequest(`/api/resume/version/${versionId}`);
    return result.version;
  }

  async rollbackToVersion(versionId: number): Promise<ResumeVersion> {
    const payload = { version_id: versionId };
    
    const result = await this.makeRequest('/api/resume/version/rollback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      id: result.new_version_id,
      version_number: result.version_number,
      change_summary: `Rollback to version ${versionId}`,
      is_auto_save: false,
      created_at: new Date().toISOString()
    };
  }

  async compareVersions(version1Id: number, version2Id: number): Promise<VersionComparison> {
    const payload = {
      version1_id: version1Id,
      version2_id: version2Id
    };

    const result = await this.makeRequest('/api/resume/version/compare', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return result.comparison;
  }

  async deleteVersion(versionId: number): Promise<void> {
    await this.makeRequest(`/api/resume/version/${versionId}`, {
      method: 'DELETE',
    });
  }
}

export const versionControlService = new VersionControlService();

