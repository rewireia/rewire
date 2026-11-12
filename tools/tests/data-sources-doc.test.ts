import { bundleManifestSchema, type BundleManifest } from '@rewire/data';
import { describe, expect, it } from 'vitest';

import { renderDataSources } from '../data-sources-doc.ts';

const DIGEST = 'a'.repeat(64);

const manifest: BundleManifest = bundleManifestSchema.parse({
  formatVersion: 1,
  files: [
    { file: 'exposure.json', sha256: DIGEST, bytes: 10, sources: ['exposure-index'] },
    { file: 'classification.eu.json', sha256: DIGEST, bytes: 20, sources: ['occupations'] },
    {
      file: 'classification.us.json',
      sha256: DIGEST,
      bytes: 30,
      sources: ['occupations', 'exposure-index'],
    },
  ],
  sources: [
    {
      id: 'occupations',
      title: 'Example occupations',
      publisher: 'Example Office',
      version: 'v1.2',
      url: 'https://example.org/occupations',
      licence: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
      attribution: 'Contains data from the Example Office | used under CC BY 4.0.',
      adaptationNotice: 'Titles were cleaned and grouped.',
      retrievedOn: '2026-11-01',
      sha256: 'b'.repeat(64),
    },
    {
      id: 'exposure-index',
      title: 'Example exposure index',
      publisher: 'Example Institute',
      version: '2025',
      url: 'https://example.org/exposure',
      licence: { name: 'CC BY 3.0 IGO', url: 'https://creativecommons.org/licenses/by/3.0/igo/' },
      attribution: 'Source: Example Institute, *exposure index*.',
      retrievedOn: '2026-11-02',
      sha256: 'c'.repeat(64),
    },
  ],
});

const page = renderDataSources(manifest);

function section(title: string): string {
  const start = page.indexOf(`## ${title}`);
  const end = page.indexOf('\n## ', start + 1);
  return page.slice(start, end === -1 ? undefined : end);
}

describe('renderDataSources', () => {
  it('opens with a title and a three-line introduction', () => {
    const [title, blank, ...rest] = page.split('\n');
    expect(title).toBe('# Data sources');
    expect(blank).toBe('');
    expect(rest.indexOf('')).toBe(3);
  });

  it('summarises every source in one table row', () => {
    expect(page).toContain(
      '| Example occupations | Example Office | v1.2 | CC BY 4.0 | 2026-11-01 |',
    );
    expect(page).toContain(
      '| Example exposure index | Example Institute | 2025 | CC BY 3.0 IGO | 2026-11-02 |',
    );
  });

  it('quotes the attribution as written, escaping only Markdown syntax', () => {
    expect(section('Example occupations')).toContain(
      '> Contains data from the Example Office \\| used under CC BY 4.0.',
    );
    expect(section('Example exposure index')).toContain(
      '> Source: Example Institute, \\*exposure index\\*.',
    );
  });

  it('includes the adaptation notice only when the source has one', () => {
    expect(section('Example occupations')).toContain('> Titles were cleaned and grouped.');
    expect(section('Example exposure index')).not.toContain('Adaptation notice');
  });

  it('gives the link, licence and digest of each source', () => {
    const occupations = section('Example occupations');
    expect(occupations).toContain('- Link: <https://example.org/occupations>');
    expect(occupations).toContain('[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)');
    expect(occupations).toContain(`- SHA-256: \`${'b'.repeat(64)}\``);
  });

  it('lists the bundle files derived from each source, sorted', () => {
    expect(section('Example occupations')).toContain(
      '- `classification.eu.json`\n- `classification.us.json`',
    );
    expect(section('Example exposure index')).toContain(
      '- `classification.us.json`\n- `exposure.json`',
    );
  });
});
