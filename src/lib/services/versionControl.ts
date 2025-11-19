// Version Control Service for Frontend
import config from '../config';

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
    this.baseUrl = config.apiBase;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      throw new Error('User not authenticated. Please sign in.');
    }
    
    const user = JSON.parse(userStr);
    if (!user || !user.email) {
      throw new Error('User email not found. Please sign in again.');
    }
    
    const url = new URL(endpoint, this.baseUrl);
    url.searchParams.set('user_email', user.email);
    
    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  async saveResume(resumeData: any): Promise<{ resume_id: number; version_id: number }> {
    if (!resumeData.personalInfo?.name || !resumeData.personalInfo.name.trim()) {
      throw new Error('Resume name is required to save.');
    }

    const title = resumeData.personalInfo?.title || resumeData.title || 'Professional';

    const sections = (resumeData.sections || [])
      .filter((section: any) => section && (section.title || section.bullets?.length > 0))
      .map((section: any) => ({
        id: section.id || String(Date.now() + Math.random()),
        title: (section.title || 'Untitled Section').trim(),
        bullets: (section.bullets || [])
          .filter((bullet: any) => bullet && bullet.text && String(bullet.text).trim())
          .map((bullet: any) => ({
            id: bullet.id || String(Date.now() + Math.random()),
            text: String(bullet.text).trim(),
            params: bullet.params || {}
          }))
      }))
      .filter((section: any) => section.title.trim() !== '');

    const payload = {
      name: resumeData.personalInfo.name.trim(),
      title: title.trim() || 'Professional',
      email: resumeData.personalInfo?.email || '',
      phone: resumeData.personalInfo?.phone || '',
      location: resumeData.personalInfo?.location || '',
      summary: resumeData.summary || '',
      sections: sections,
      template: resumeData.template || 'tech'
    };

    console.log('Saving resume with payload:', { ...payload, sectionsCount: payload.sections.length });

    try {
      const result = await this.makeRequest('/api/resume/save', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!result.success) {
        throw new Error(result.message || 'Failed to save resume');
      }

      console.log('Resume saved successfully:', result);

      return {
        resume_id: result.resume_id,
        version_id: result.version_id
      };
    } catch (error) {
      console.error('Error saving resume:', error);
      throw error;
    }
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

