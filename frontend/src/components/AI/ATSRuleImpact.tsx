import type { ATSRuleEngineSummary, ATSRuleResult } from '@/lib/atsRuleTypes';

type Props = {
  ruleEngine: ATSRuleEngineSummary;
  className?: string;
};

function formatAdjustment(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `+${rounded}`;
  return `${rounded}`;
}

function groupResults(results: ATSRuleResult[]) {
  const penalties = results.filter((r) => r.rule_type === 'penalty');
  const rewards = results.filter((r) => r.rule_type === 'reward');
  const info = results.filter((r) => r.rule_type === 'info');
  return { penalties, rewards, info };
}

export default function ATSRuleImpact({ ruleEngine, className }: Props) {
  if (!ruleEngine || !Array.isArray(ruleEngine.results) || ruleEngine.results.length === 0) {
    return null;
  }

  const { penalties, rewards, info } = groupResults(ruleEngine.results);
  const adj = ruleEngine.adjustment ?? 0;
  const adjClass =
    adj < 0 ? 'text-red-700' : adj > 0 ? 'text-emerald-700' : 'text-gray-700';

  return (
    <div className={className ?? ''}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-600 uppercase">Rule engine</div>
        <div className={`text-xs font-semibold ${adjClass}`}>Net: {formatAdjustment(adj)}</div>
      </div>

      <div className="mt-2 space-y-2">
        {penalties.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-red-700 mb-1">Penalties</div>
            <ul className="space-y-1">
              {penalties.slice(0, 6).map((r, idx) => (
                <li key={`pen-${idx}`} className="text-xs text-gray-700">
                  <span className="font-semibold text-red-700">{formatAdjustment(r.adjustment)}</span>{' '}
                  <span>{r.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {rewards.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-emerald-700 mb-1">Rewards</div>
            <ul className="space-y-1">
              {rewards.slice(0, 6).map((r, idx) => (
                <li key={`rew-${idx}`} className="text-xs text-gray-700">
                  <span className="font-semibold text-emerald-700">{formatAdjustment(r.adjustment)}</span>{' '}
                  <span>{r.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {info.length > 0 && (
          <div className="text-xs text-gray-600">
            {info.slice(0, 2).map((r, idx) => (
              <div key={`info-${idx}`}>{r.reason}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

