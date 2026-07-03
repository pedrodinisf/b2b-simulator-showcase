// Bilingual content blocks (glossary, concepts, guides) + config-tab metadata.
//
// ⚠️ Showcase build: the rich educational corpus of the production app has been
// reduced to a small illustrative sample here. The i18n *system* (parallel PT/EN
// structures, parity + content-quality tests, DB seeding) is what this repo
// demonstrates — the prose itself is placeholder text.

export const GLOSSARY_PT = [
  { id: "eni", term: "ENI", def: "Empresário em Nome Individual: trabalhador independente que fatura em nome próprio." },
  { id: "lda", term: "Unipessoal Lda.", def: "Sociedade por quotas de sócio único, com personalidade jurídica própria e responsabilidade limitada." },
  { id: "derrama", term: "Derrama", def: "Imposto municipal sobre o lucro das empresas. Os valores neste repositório são ilustrativos." },
];

export const GLOSSARY_EN = [
  { id: "eni", term: "ENI", def: "Sole trader: a self-employed person who invoices in their own name." },
  { id: "lda", term: "Unipessoal Lda.", def: "A single-member private limited company with its own legal personality and limited liability." },
  { id: "derrama", term: "Derrama", def: "A municipal surtax on company profit. The figures in this repository are illustrative." },
];

export const NEGOTIATION_PT = [
  { section: "Exemplo", desc: "Bloco de exemplo (conteúdo reduzido nesta versão pública).", items: [
    { strong: "Valor por hora", text: "Combina uma tarifa que cobre impostos, contribuições e períodos sem faturação." },
    { strong: "Âmbito", text: "Deixa claro o que está e o que não está incluído antes de começar." },
  ]},
];

export const NEGOTIATION_EN = [
  { section: "Example", desc: "Sample block (content is reduced in this public version).", items: [
    { strong: "Hourly rate", text: "Agree a rate that covers tax, contributions and non-billable time." },
    { strong: "Scope", text: "Make clear what is and is not included before you start." },
  ]},
];

export const CONCEPTS_PT = [
  { title: "ENI vs Unipessoal Lda.", content: "Duas formas de trabalhar por conta própria em Portugal, com regimes fiscais e contributivos diferentes. Este exemplo é ilustrativo." },
  { title: "Regime simplificado", content: "No regime simplificado, uma parte da faturação é considerada tributável através de um coeficiente. Valores ilustrativos." },
];

export const CONCEPTS_EN = [
  { title: "ENI vs Unipessoal Lda.", content: "Two ways to be self-employed in Portugal, with different tax and social-security regimes. This example is illustrative." },
  { title: "Simplified regime", content: "Under the simplified regime, part of the revenue is treated as taxable through a coefficient. Illustrative figures." },
];

export const INTL_CONTENT_PT = `<h3 class="section-h3">Faturação internacional</h3>
<p>Bloco de exemplo. Na versão pública o conteúdo detalhado foi reduzido; os valores são ilustrativos.</p>`;

export const INTL_CONTENT_EN = `<h3 class="section-h3">International invoicing</h3>
<p>Sample block. The detailed content is reduced in the public version; the figures are illustrative.</p>`;

export const RISKS_CONTENT_PT = `<h3 class="section-h3">Riscos</h3>
<p>Bloco de exemplo. Conteúdo reduzido nesta versão pública.</p>`;

export const RISKS_CONTENT_EN = `<h3 class="section-h3">Risks</h3>
<p>Sample block. Reduced content in this public version.</p>`;

export const SETUP_CONTENT_PT = `<h3 class="section-h3">Como começar</h3>
<p>Bloco de exemplo. Conteúdo reduzido nesta versão pública.</p>`;

export const SETUP_CONTENT_EN = `<h3 class="section-h3">Getting started</h3>
<p>Sample block. Reduced content in this public version.</p>`;

export const OBLIGATIONS_CONTENT_PT = `<h3 class="section-h3">Obrigações</h3>
<p>Bloco de exemplo. Conteúdo reduzido nesta versão pública.</p>`;

export const OBLIGATIONS_CONTENT_EN = `<h3 class="section-h3">Obligations</h3>
<p>Sample block. Reduced content in this public version.</p>`;

export const ENGLOBAMENTO_MATH = `<p>Bloco de exemplo com a lógica de englobamento. Valores ilustrativos.</p>`;

export const ENGLOBAMENTO_MATH_EN = `<p>Sample block describing the aggregation logic. Illustrative figures.</p>`;

// Config-tab metadata: which (public, illustrative) constants are editable, with a
// display label, an input kind, a source note and a one-line effect. Trimmed to a
// small sample; all paths resolve against the placeholder constants object.
export const CONFIG_GROUPS_PT = [
  { title: 'IAS e deduções', icon: '📏', rows: [
    ['ias', 'IAS (indexante)', 'eur', 'ilustrativo', 'base para vários limites'],
    ['irs_cat_a_deduction', 'Dedução específica Cat. A', 'eur', 'ilustrativo', 'reduz o salário tributável'],
  ]},
  { title: 'IRC', icon: '🏢', rows: [
    ['irc.standard', 'Taxa geral de IRC', 'pct', 'ilustrativo', 'imposto sobre o lucro da empresa'],
    ['irc.pme', 'Taxa reduzida (PME)', 'pct', 'ilustrativo', 'taxa sobre a primeira parte do lucro'],
  ]},
  { title: 'Regime simplificado', icon: '📊', rows: [
    ['simplified.services_coefficient', 'Coeficiente de serviços', 'num', 'ilustrativo', 'parte da faturação tributável'],
    ['meal.card_exempt', 'Subsídio de refeição isento (cartão)', 'eur', 'ilustrativo', 'valor isento por dia'],
  ]},
];

export const CONFIG_GROUPS_EN = [
  { title: 'IAS and deductions', icon: '📏', rows: [
    ['ias', 'IAS (index)', 'eur', 'illustrative', 'basis for several limits'],
    ['irs_cat_a_deduction', 'Cat. A specific deduction', 'eur', 'illustrative', 'reduces the taxable salary'],
  ]},
  { title: 'IRC', icon: '🏢', rows: [
    ['irc.standard', 'Standard IRC rate', 'pct', 'illustrative', 'tax on company profit'],
    ['irc.pme', 'Reduced rate (SME)', 'pct', 'illustrative', 'rate on the first slice of profit'],
  ]},
  { title: 'Simplified regime', icon: '📊', rows: [
    ['simplified.services_coefficient', 'Services coefficient', 'num', 'illustrative', 'share of revenue that is taxable'],
    ['meal.card_exempt', 'Meal allowance exempt (card)', 'eur', 'illustrative', 'tax-free amount per day'],
  ]},
];
