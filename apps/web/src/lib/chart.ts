// Inline SVG line chart, ported verbatim from index.html svgLineChart(). Self-generated
// markup (no user input) so it is safe to render with {@html}. The y-axis formatter is
// injected so the caller can use the locale-bound fmtEur.
export interface ChartSeries {
	name: string;
	color: string;
	values: number[];
}
export interface ChartOpts {
	xfmt?: (x: number) => string;
	yfmt?: (v: number) => string;
}

export function svgLineChart(xs: number[], series: ChartSeries[], opts: ChartOpts = {}): string {
	const yfmt = opts.yfmt ?? ((v: number) => String(Math.round(v)));
	const W = 720, H = 280, padL = 70, padR = 14, padT = 16, padB = 56;
	const plotW = W - padL - padR, plotH = H - padT - padB;
	const all = series.flatMap((s) => s.values);
	let minV = Math.min(...all), maxV = Math.max(...all);
	const span = maxV - minV || 1;
	minV -= span * 0.08;
	maxV += span * 0.08;
	const X = (i: number) => padL + (xs.length < 2 ? plotW / 2 : (i / (xs.length - 1)) * plotW);
	const Y = (v: number) => padT + plotH - ((v - minV) / (maxV - minV || 1)) * plotH;
	let grid = '';
	for (let g = 0; g <= 4; g++) {
		const v = minV + ((maxV - minV) * g) / 4;
		const y = Y(v);
		grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="svg-grid"></line>`;
		grid += `<text x="${padL - 8}" y="${y}" dominant-baseline="middle" text-anchor="end" class="svg-axis">${yfmt(v)}</text>`;
	}
	const xlab = xs
		.map((x, i) => `<text x="${X(i)}" y="${H - padB + 18}" text-anchor="middle" class="svg-axis">${opts.xfmt ? opts.xfmt(x) : x}</text>`)
		.join('');
	const lines = series
		.map((s) => {
			const pts = s.values.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
			const dots = s.values.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="3" fill="${s.color}"></circle>`).join('');
			return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round"></polyline>${dots}`;
		})
		.join('');
	const legend = series
		.map((s, i) => `<g transform="translate(${padL + i * 165}, ${H - 14})"><rect width="11" height="11" rx="2" fill="${s.color}"></rect><text x="16" y="9.5" class="svg-axis">${s.name}</text></g>`)
		.join('');
	return `<svg viewBox="0 0 ${W} ${H}" class="svg-chart" role="img" preserveAspectRatio="xMinYMin meet">${grid}${xlab}${lines}${legend}</svg>`;
}
