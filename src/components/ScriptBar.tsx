import { languageName } from '../data/languages';
import type { ScriptReport } from '../lib/script';
import type { LanguageCode } from '../lib/types';

const COLORS = ['bg-maroon-600', 'bg-gold-400', 'bg-maroon-400', 'bg-gold-600', 'bg-ink-700'];

/** Visualises the script distribution from `detectScript` as a stacked bar. */
export function ScriptBar({ report }: { report: ScriptReport }) {
  if (!report.dominant) return <p className="text-sm muted">Type or paste text to detect its script.</p>;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-paper-100 dark:bg-ink-700">
        {report.distribution.map((d, i) => (
          <div key={d.script} className={COLORS[i % COLORS.length]} style={{ width: `${d.share * 100}%` }} title={`${d.script} ${(d.share * 100).toFixed(1)}%`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs muted">
        {report.distribution.map((d, i) => (
          <span key={d.script} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${COLORS[i % COLORS.length]}`} />
            {d.script} {(d.share * 100).toFixed(0)}%
          </span>
        ))}
        {report.language && (
          <span className="ml-auto font-medium text-maroon-600 dark:text-gold-300">
            Detected: {report.language === 'en' ? 'English' : languageName(report.language as LanguageCode)} · confidence {Math.round(report.confidence * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
