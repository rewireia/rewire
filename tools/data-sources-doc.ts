import type { BundleManifest, SourceRecord } from '@rewire/data';

/**
 * The text of `docs/data-sources.md` for a bundle manifest.
 *
 * Every value is copied from the manifest, so the page states exactly what the pipeline
 * recorded: the credit lines are quoted as the licences require them, not rewritten.
 */
export function renderDataSources(manifest: BundleManifest): string {
  return [
    '# Data sources',
    '',
    'Every figure Rewire shows comes from the official sources below, downloaded from their',
    'publishers and pinned by digest. This page is generated from the bundle manifest by',
    '`tools/data-sources.ts`; change the data pipeline, not this file.',
    '',
    '## Summary',
    '',
    '| Source | Publisher | Version | Licence | Retrieved on |',
    '| --- | --- | --- | --- | --- |',
    ...manifest.sources.map(summaryRow),
    '',
    ...manifest.sources.flatMap((source) => sourceSection(source, filesFrom(manifest, source))),
  ].join('\n');
}

function summaryRow(source: SourceRecord): string {
  const cells = [
    source.title,
    source.publisher,
    source.version,
    source.licence.name,
    source.retrievedOn,
  ];
  return `| ${cells.map(escapeInline).join(' | ')} |`;
}

function sourceSection(source: SourceRecord, files: readonly string[]): string[] {
  return [
    `## ${escapeInline(source.title)}`,
    '',
    `- Publisher: ${escapeInline(source.publisher)}`,
    `- Version: ${escapeInline(source.version)}`,
    `- Licence: [${escapeInline(source.licence.name)}](${source.licence.url})`,
    `- Link: <${source.url}>`,
    `- Retrieved on: ${source.retrievedOn}`,
    `- SHA-256: \`${source.sha256}\``,
    '',
    'Attribution:',
    '',
    ...quote(source.attribution),
    '',
    ...(source.adaptationNotice === undefined
      ? []
      : ['Adaptation notice:', '', ...quote(source.adaptationNotice), '']),
    'Bundle files derived from it:',
    '',
    ...(files.length === 0 ? ['- none'] : files.map((file) => `- \`${file}\``)),
    '',
  ];
}

function filesFrom(manifest: BundleManifest, source: SourceRecord): string[] {
  return manifest.files
    .filter((entry) => entry.sources.includes(source.id))
    .map((entry) => entry.file)
    .sort();
}

function quote(text: string): string[] {
  return text.split('\n').map((line) => (line === '' ? '>' : `> ${escapeInline(line)}`));
}

/** Keeps characters that Markdown would read as formatting as the literal text they are. */
function escapeInline(text: string): string {
  return text.replace(/[\\`*_[\]<>|]/g, '\\$&');
}
