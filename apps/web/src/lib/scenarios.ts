import { fmt as efmt, type SimResult, type Lang } from '@b2bsim/engine';

// Ported from index.html localiseScenarios + SCEN_LABELS_EN. The engine always
// emits PT scenario names/descs; this rewrites only the labels when the locale is EN.
const SCEN_LABELS_EN: Record<string, { name: string; desc: string | null }> = {
	A: { name: 'Simplified ENI, Year 1', desc: 'First year of activity. Reduced coefficient in the first year. SS exempt for the first 12 months.' },
	B: { name: 'Simplified ENI, Year 2', desc: 'Second year. Partially reduced coefficient. Full SS.' },
	C: { name: 'Simplified ENI, Year 3+', desc: 'Steady state. Standard coefficient on gross service income.' },
	D: { name: 'ENI, organised accounts', desc: 'No coefficient. Real-expense deduction. Accountant required.' },
	E: { name: 'Lda. salary €1,500', desc: 'Low salary, maximum dividends' },
	F: { name: 'Lda. salary €2,500', desc: 'Medium salary, balanced dividends' },
	G: { name: 'Lda. salary €3,400', desc: 'High salary (pension protection)' },
	H: { name: 'Lda. custom salary', desc: null }
};

export function localiseScenarios(result: SimResult, lang: Lang, salary: number): SimResult {
	if (lang !== 'en') return result;
	for (const k in result.scenarios) {
		const lab = SCEN_LABELS_EN[k];
		if (!lab) continue;
		result.scenarios[k].name = lab.name;
		if (k === 'H') result.scenarios[k].desc = 'Your chosen salary from the panel (€' + efmt(salary, 'en') + '/mo × 14).';
		else if (lab.desc) result.scenarios[k].desc = lab.desc;
	}
	return result;
}
