export type ATSRuleType = 'penalty' | 'reward' | 'info';

export type ATSRuleResult = {
  rule_name: string;
  rule_type: ATSRuleType;
  adjustment: number;
  reason: string;
  affected_keywords?: string[] | null;
  meta?: Record<string, unknown> | null;
};

export type ATSRuleEngineSummary = {
  adjustment: number;
  results: ATSRuleResult[];
} | null;

