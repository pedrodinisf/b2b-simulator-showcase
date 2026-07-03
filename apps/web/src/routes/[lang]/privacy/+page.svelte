<script lang="ts">
	import { pick } from '$lib/i18n';
</script>

<div class="tab-content active">
	<h2 class="section-h2 section-h2--first">{pick('Política de privacidade', 'Privacy notice')}</h2>

	<div class="alert info">
		<span class="icon">🔒</span>
		<div class="content">
			{pick(
				'Este simulador foi desenhado para funcionar sem cookies de rastreamento e sem recolher dados que te identifiquem.',
				'This simulator is designed to work without tracking cookies and without collecting data that identifies you.'
			)}
		</div>
	</div>

	<div class="card text-content">
		<h3 class="section-h3">{pick('O que guardamos', 'What we store')}</h3>
		<p>
			{pick(
				'Quando fazes uma simulação, podemos guardar de forma anónima os valores introduzidos e o resultado (taxa, despesas, município, líquido por cenário), associados a um identificador de sessão aleatório, sem nome nem email. Usamos estes dados agregados apenas para perceber como a ferramenta é usada e melhorá-la.',
				'When you run a simulation we may anonymously store the values you entered and the result (rate, expenses, municipality, net per scenario), tied to a random session identifier, with no name or email. We use this aggregate data only to understand how the tool is used and to improve it.'
			)}
		</p>

		<h3 class="section-h3">{pick('Cookies', 'Cookies')}</h3>
		<p>
			{pick(
				'Usamos apenas armazenamento estritamente necessário ou funcional (a tua escolha de idioma e preferências locais). Não usamos cookies de publicidade nem de rastreamento entre sites. As estatísticas de utilização, quando ativas, são recolhidas por uma ferramenta sem cookies e sem identificadores pessoais.',
				'We use only strictly necessary or functional storage (your language choice and local preferences). We do not use advertising or cross-site tracking cookies. Usage statistics, when enabled, are collected with a cookieless tool that uses no personal identifiers.'
			)}
		</p>

		<h3 class="section-h3">{pick('Email', 'Email')}</h3>
		<p>
			{pick(
				'Só guardamos o teu email se o forneceres voluntariamente, por exemplo para receber o relatório por email ou avisos de alterações fiscais. Nesse caso pedimos confirmação dupla (double opt-in) e podes cancelar a qualquer momento. O envio de email pode ser feito por um fornecedor terceiro de email transacional, que atua como subcontratante.',
				'We only store your email if you provide it voluntarily, for example to receive the report by email or law-change alerts. In that case we ask for double opt-in confirmation and you can unsubscribe at any time. Email delivery may use a third-party transactional email provider acting as a processor.'
			)}
		</p>

		<h3 class="section-h3">{pick('Base legal e os teus direitos', 'Legal basis and your rights')}</h3>
		<p>
			{pick(
				'Tratamos estatísticas anónimas ao abrigo do interesse legítimo; a lista de avisos por email assenta no teu consentimento. Tens direito de acesso, retificação e apagamento dos teus dados. Para exercer estes direitos, contacta-nos.',
				'We process anonymous statistics under legitimate interest; the email alerts list relies on your consent. You have the right to access, rectify and erase your data. To exercise these rights, contact us.'
			)}
		</p>

		<p class="text-dim" style="margin-top: 16px; font-size: 13px;">
			{pick(
				'Esta ferramenta é informativa e não constitui aconselhamento fiscal. Confirma sempre com o teu contabilista ou com a Autoridade Tributária.',
				'This tool is informational and is not tax advice. Always confirm with your accountant or the tax authority.'
			)}
		</p>
	</div>
</div>
