import { describe, it, expect } from 'vitest';
import * as C from '../src/index.ts';

// Content-quality checks: no PT leaking into EN, no EN leaking into PT, EN-UK
// spellings, and data-goto integrity. Scans the full content corpus: every I18N
// value plus all prose/data blocks per language.

const strip = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
type GlossEntry = { term: string; def: string };
type ConceptEntry = { title: string; content: string };
type NegSection = { section: string; desc: string; items: { strong: string; text: string; source?: string }[] };

const glossText = (a: GlossEntry[]) => a.map((g) => `${g.term} ${g.def}`).join(' ');
const conceptText = (a: ConceptEntry[]) => a.map((c) => `${c.title} ${c.content}`).join(' ');
const negText = (a: NegSection[]) =>
	a.map((s) => `${s.section} ${s.desc} ` + s.items.map((i) => `${i.strong} ${i.text} ${i.source ?? ''}`).join(' ')).join(' ');

const EN_TEXT = strip(
	[
		Object.values(C.I18N.en).join(' '),
		C.INTL_CONTENT_EN, C.RISKS_CONTENT_EN, C.SETUP_CONTENT_EN, C.OBLIGATIONS_CONTENT_EN, C.ENGLOBAMENTO_MATH_EN,
		glossText(C.GLOSSARY_EN as GlossEntry[]), conceptText(C.CONCEPTS_EN as ConceptEntry[]), negText(C.NEGOTIATION_EN as NegSection[])
	].join(' ')
);

const PT_TEXT = strip(
	[
		Object.values(C.I18N.pt).join(' '),
		C.INTL_CONTENT_PT, C.RISKS_CONTENT_PT, C.SETUP_CONTENT_PT, C.OBLIGATIONS_CONTENT_PT, C.ENGLOBAMENTO_MATH,
		glossText(C.GLOSSARY_PT as GlossEntry[]), conceptText(C.CONCEPTS_PT as ConceptEntry[]), negText(C.NEGOTIATION_PT as NegSection[])
	].join(' ')
);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('no Portuguese leaks in EN content', () => {
	const ptWords = [
		'Faturação', 'faturação', 'Despesas', 'despesas', 'líquido', 'Líquido', 'imposto',
		'lucro', 'salário', 'rendimento', 'isento', 'isenta', 'isenção', 'atividade', 'gerente',
		'você', ' teu ', ' tua ', 'também', 'apenas', 'cliente final', 'Cenário', 'Vencedor', 'Resumo',
		'Conclusões', 'escalão', 'escalões', 'coletável', 'devolução', 'poupança', 'tarifa',
		' não ', ' com ', ' sem ', ' para ', ' uma ', ' dos ', ' das ', ' que ', ' anos ', ' meses ',
		'reduzido', 'simplificado', 'obrigatório', 'mensal', 'anual ', 'recomenda'
	];
	const keep = [/Portal das Finanças/g, /Empresa na Hora/g, /Segurança Social( Direta)?/g, /e-fatura/g, /IRS Jovem/g, /Autoliquidação/g, /Diário da República/g, /Direta/g];

	it('is clean', () => {
		let scrubbed = EN_TEXT;
		for (const k of keep) scrubbed = scrubbed.replace(k, '·');
		const hits = ptWords.filter((w) => new RegExp(esc(w)).test(scrubbed));
		expect(hits).toEqual([]);
	});
});

describe('no English leaks in PT content', () => {
	const enWords = [
		'Revenue', 'revenue', 'aggregation', 'withholding', 'Net profit', 'tax burden',
		'Year 1', 'Year 2', 'Year 3', 'Settings tab', 'managing partner', 'Best in Year', 'Recommendation',
		'Summary', 'best route', 'best steady', 'Expenses tab', 'annual net', 'deductible portion',
		'Tax burden', 'Gross annual', 'Manager salary', 'Worker SS', 'exempt up to', 'Flat withholding',
		'Standard rate', 'simplified regime', 'Add-back', 'Distributable profit', 'Meal allowance on'
	];
	it('is clean', () => {
		const hits = enWords.filter((w) => new RegExp(esc(w)).test(PT_TEXT));
		expect(hits).toEqual([]);
	});
});

describe('EN copy uses EN-UK spellings', () => {
	const us = [
		'organize', 'organization', 'organized', 'color', 'center', 'centered', 'license', 'licensing',
		'analyze', 'analyzed', 'favor', 'favorite', 'defense', 'catalog', 'fulfill', 'enrollment',
		'labeled', 'modeling', 'canceled', 'advisor', 'recognize', 'optimize', 'prioritize', 'maximize',
		'minimize', 'specialize', 'utilize', 'gray', 'liter', 'traveler', 'modeled', 'signaling',
		'leveled', 'installment', 'aluminum', 'apologize', 'summarize'
	];
	it('has no US spellings', () => {
		const hits = us.filter((w) => new RegExp('\\b' + esc(w) + '\\w*', 'i').test(EN_TEXT));
		expect(hits).toEqual([]);
	});
	it('has no double-space runs in UI strings', () => {
		const dbl = (Object.values(C.I18N.en).join('\n').match(/[a-z]  +[a-z]/g) || []).length;
		expect(dbl).toBe(0);
	});
});

describe('glossary data-goto cross-references intact (PT<->EN)', () => {
	const raw = (b: unknown) => (typeof b === 'string' ? b : JSON.stringify(b));
	const ids = (s: string) => [...s.matchAll(/data-goto=\\?["']([^"'\\]+)/g)].map((m) => m[1]).sort();
	// Sample content in this public build carries no glossary cross-links, so every
	// expected count is 0. The check still proves PT/EN stay structurally balanced.
	const pairs: [string, unknown, unknown, number][] = [
		['GLOSSARY', C.GLOSSARY_PT, C.GLOSSARY_EN, 0],
		['NEGOTIATION', C.NEGOTIATION_PT, C.NEGOTIATION_EN, 0],
		['CONCEPTS', C.CONCEPTS_PT, C.CONCEPTS_EN, 0],
		['INTL_CONTENT', C.INTL_CONTENT_PT, C.INTL_CONTENT_EN, 0],
		['RISKS_CONTENT', C.RISKS_CONTENT_PT, C.RISKS_CONTENT_EN, 0],
		['SETUP_CONTENT', C.SETUP_CONTENT_PT, C.SETUP_CONTENT_EN, 0],
		['OBLIGATIONS_CONTENT', C.OBLIGATIONS_CONTENT_PT, C.OBLIGATIONS_CONTENT_EN, 0]
	];
	it.each(pairs)('%s: balanced PT/EN and matches expected count', (_name, pt, en, exp) => {
		const ptIds = ids(raw(pt));
		const enIds = ids(raw(en));
		expect(ptIds).toEqual(enIds);
		expect(ptIds.length).toBe(exp);
	});
});
