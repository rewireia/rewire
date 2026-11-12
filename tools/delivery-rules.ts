import path from 'node:path';

/** Something in a file that must not ship. */
export interface Finding {
  /** Path from the repository root, with `/` separators. */
  readonly file: string;
  /** One-based line number, or `undefined` when the finding concerns the file as a whole. */
  readonly line: number | undefined;
  readonly rule: RuleName;
  readonly message: string;
}

export type RuleName =
  'no-local-paths' | 'no-secrets' | 'no-pending-notes' | 'readme-per-folder' | 'max-line-length';

/** A rule that reads one file at a time. */
export type FileRule = (file: string, content: string) => Finding[];

/** Home folders, mounted volumes and drive letters only exist on one machine. */
const LOCAL_PATH = /(?<![\w.-])(?:\/(?:Users|home)\/[^/\s'"`]+|\/Volumes\/)|\b[A-Z]:\\/;

/** Flags any line that names a folder of a particular machine. */
export const noLocalPaths: FileRule = (file, content) =>
  matchLines(file, content, LOCAL_PATH, 'no-local-paths', (match) => `machine path "${match}"`);

const CREDENTIAL = new RegExp(
  [
    String.raw`\bsk-[A-Za-z0-9_-]{20,}`,
    String.raw`\bAKIA[0-9A-Z]{16}\b`,
    String.raw`-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----`,
  ].join('|'),
);

/** An assignment such as `PAYMENT_SECRET=value`, read from an environment template. */
const FILLED_SECRET_VARIABLE =
  /^\s*(?:export\s+)?([A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD))\s*=\s*(?!(?:""|'')?\s*(?:#|$))/;

/** Flags credential-shaped values, and filled-in secrets in the environment template. */
export const noSecrets: FileRule = (file, content) => {
  const findings = matchLines(
    file,
    content,
    CREDENTIAL,
    'no-secrets',
    () => 'credential-shaped value',
  );
  if (path.posix.basename(file) !== '.env.example') {
    return findings;
  }
  const variables = matchLines(
    file,
    content,
    FILLED_SECRET_VARIABLE,
    'no-secrets',
    (_, variable) => `${variable ?? 'variable'} has a value; leave it empty in the template`,
  );
  return [...findings, ...variables];
};

/**
 * The words are assembled from halves so that this file, which ships too, does not
 * contain the markers it looks for.
 */
const PENDING_MARKERS = ['TO' + 'DO', 'FIX' + 'ME', 'X' + 'XX', 'HA' + 'CK'];
const PENDING_NOTE = new RegExp(String.raw`\b(?:${PENDING_MARKERS.join('|')})\b`);

/** Flags notes about unfinished work: what ships is finished. */
export const noPendingNotes: FileRule = (file, content) =>
  matchLines(file, content, PENDING_NOTE, 'no-pending-notes', (match) => `pending note "${match}"`);

const MAX_LINE_LENGTH = 120;
const CODE_EXTENSIONS = new Set(['.ts', '.tsx']);
/** A string literal holding a URL, which cannot be broken without breaking the link. */
const QUOTED_URL = /(['"`])https?:\/\/[^'"`\s]*\1/g;
/**
 * A line that is one message: a single string, alone or as the value of a property, as in
 * a catalogue of interface texts. Splitting a sentence to fit the limit would make it
 * harder to read.
 */
const MESSAGE_LINE = /^\s*(?:[\w$]+: )?(['"`]).*\1,$/;

/**
 * Flags code lines over the limit. URLs quoted in a line are not counted, and a line that
 * holds one message is left alone.
 */
export const maxLineLength: FileRule = (file, content) => {
  if (!CODE_EXTENSIONS.has(path.posix.extname(file))) {
    return [];
  }
  return content.split('\n').flatMap((text, index) => {
    const length = text.replace(QUOTED_URL, '').length;
    if (length <= MAX_LINE_LENGTH || MESSAGE_LINE.test(text)) {
      return [];
    }
    const finding: Finding = {
      file,
      line: index + 1,
      rule: 'max-line-length',
      message: `${length} characters, over the limit of ${MAX_LINE_LENGTH}`,
    };
    return [finding];
  });
};

/** The rules that read file contents, in the order their findings are reported. */
export const FILE_RULES: readonly FileRule[] = [
  noLocalPaths,
  noSecrets,
  noPendingNotes,
  maxLineLength,
];

/**
 * Folders that must not hold a README of their own, each with its reason. Every other
 * folder of the repository needs one, however deep it is.
 */
const WITHOUT_README: ReadonlyMap<string, string> = new Map([
  ['.github', 'GitHub shows a README found here in place of the one at the root'],
  ['apps/web/public', 'the build publishes every file of this folder with the site'],
]);

/**
 * Flags every folder that holds delivered files, at any depth, but no `README.md`.
 *
 * It reads the list of files rather than their contents, so it runs once for the whole
 * repository. Only folders that appear in the list are considered.
 */
export function readmePerFolder(files: readonly string[]): Finding[] {
  const present = new Set(files);
  const folders = new Set(files.flatMap((file) => ancestors(path.posix.dirname(file))));
  return [...folders]
    .filter((folder) => !WITHOUT_README.has(folder) && !present.has(`${folder}/README.md`))
    .sort()
    .map((folder): Finding => ({
      file: `${folder}/README.md`,
      line: undefined,
      rule: 'readme-per-folder',
      message: `${folder} has no README.md explaining its contents`,
    }));
}

function ancestors(folder: string): string[] {
  if (folder === '.' || folder === '') {
    return [];
  }
  return [folder, ...ancestors(path.posix.dirname(folder))];
}

function matchLines(
  file: string,
  content: string,
  pattern: RegExp,
  rule: RuleName,
  describe: (match: string, group: string | undefined) => string,
): Finding[] {
  return content.split('\n').flatMap((text, index) => {
    const match = pattern.exec(text);
    if (match === null) {
      return [];
    }
    return [{ file, line: index + 1, rule, message: describe(match[0], match[1]) }];
  });
}
