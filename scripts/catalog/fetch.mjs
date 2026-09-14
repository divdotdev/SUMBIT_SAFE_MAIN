import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { sources } from './sources.mjs';
export function htmlText(html) {
  return html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(?:p|div|li|tr|h[1-6]|section)>|<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ').replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : +n))
    .replace(/&(nbsp|amp|lt|gt|quot|apos|rsquo|lsquo|ndash|mdash|deg|bull);/g, (_, n) => ({nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",rsquo:"'",lsquo:"'",ndash:'–',mdash:'—',deg:'°',bull:'•'}[n]))
    .replace(/[ \t\r]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
export async function collectSources(directory) {
  await fs.mkdir(directory, { recursive: true });
  const records = [];
  for (const source of sources) {
    const response = await fetch(source.url, { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'SubmitSafe-CatalogResearch/1.0', Accept: 'text/html,application/pdf' } });
    if (!response.ok) throw new Error(`${source.id}: HTTP ${response.status}; existing snapshot unchanged`);
    if (!sources.some(s => new URL(s.url).hostname === new URL(response.url).hostname)) throw new Error('Unexpected source redirect');
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.length > 8_000_000) throw new Error('Source exceeds size limit');
    let text;
    if (response.headers.get('content-type')?.includes('pdf')) {
      const task = getDocument({ data: buffer.slice(), isEvalSupported:false, verbosity:0 });
      try { const pdf=await task.promise; const pages=[]; for(let i=1;i<=Math.min(pdf.numPages,3);i++){const page=await pdf.getPage(i);const content=await page.getTextContent();pages.push(content.items.map(x=>(x.str||'')+(x.hasEOL?'\n':' ')).join(''));}text=pages.join('\n'); } finally { await task.destroy(); }
    } else text=htmlText(new TextDecoder().decode(buffer));
    if (!text.toLowerCase().includes(source.marker.toLowerCase()) || text.length < 500) throw new Error(`${source.id}: missing expected page content; review required`);
    const record={...source, finalUrl:response.url,retrievedAt:new Date().toISOString(),sha256:createHash('sha256').update(buffer).digest('hex')};
    await fs.writeFile(`${directory}/${source.id}.txt`,text);
    records.push(record); console.info(`Fetched ${source.id}: ${text.length} text characters`);
  }
  await fs.writeFile(`${directory}/manifest.json`,JSON.stringify(records,null,2)+'\n');
  return records;
}
