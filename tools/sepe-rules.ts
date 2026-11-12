import type { CatalogueSnapshot, CourseLevel, TopicId } from '@rewire/content';
import { fold } from '@rewire/engine';
import { z } from 'zod';

const SEPE_PROVIDER = 'SEPE · Catálogo de Especialidades Formativas';

const MAX_TOPICS = 3;

/** A pattern that matches any of the given alternatives as whole words. */
function anyOf(alternatives: readonly string[]): RegExp {
  return new RegExp(`\\b(${alternatives.join('|')})\\b`);
}

/** The families of the catalogue that are kept, with how a summary names them. */
const FAMILIES: Readonly<Record<string, { en: string; es: string; topic: TopicId }>> = {
  'INFORMÁTICA Y COMUNICACIONES': {
    en: 'Computing and communications',
    es: 'Informática y comunicaciones',
    topic: 'software-development',
  },
  'ADMINISTRACIÓN Y GESTIÓN': {
    en: 'Administration and management',
    es: 'Administración y gestión',
    topic: 'business-management',
  },
  'COMERCIO Y MARKETING': {
    en: 'Commerce and marketing',
    es: 'Comercio y marketing',
    topic: 'marketing-sales',
  },
};

/** The ways of taking a specialty that can be followed online, as the summary says them. */
const ONLINE_MODES: Readonly<Record<string, { en: string; es: string }>> = {
  'Solo Teleformación': { en: 'online only', es: 'solo en teleformación' },
  'Presencial y teleformación': { en: 'in person or online', es: 'presencial o en teleformación' },
};

/**
 * The official levels of the catalogue as levels of this marketplace: level 1 asks for no
 * previous training, levels 2 and 3 build on some, and levels 4 and 5 are the highest.
 */
const LEVELS: Readonly<Record<string, CourseLevel>> = {
  '1': 'introductory',
  '2': 'intermediate',
  '3': 'intermediate',
  '4': 'advanced',
  '5': 'advanced',
};

const specialtySchema = z.object({
  nombre: z.string().min(1),
  nivel: z.string(),
  horas: z.string(),
  familia: z.string(),
  modalidad: z.string(),
  ficha: z.url(),
});

type Specialty = z.infer<typeof specialtySchema>;

/** The part of the export the import reads: every specialty by its code. */
const sepeExportSchema = z.object({
  especialidades: z.record(z.string().min(1), specialtySchema),
});

/** Abbreviations kept in capitals, as they are written in Spanish. */
const ACRONYMS: ReadonlySet<string> = new Set(
  (
    'IA AI TIC TICS SQL ERP CRM SEO SEM IVA PYME PYMES RGPD LOPDGDD HTML CSS CAD BIM UE ISO AWS ' +
    'PHP XML JSON API APIS UML ITIL IP TCP HTTP HTTPS PL RRSS PMI JSP JPA AJAX RIA GNU AIX QGIS ' +
    'SCORM SPSS NET EE IT CMS RPA IOT VPN LAN WAN PC CNC SAP SAAS GDPR NIIF PGC ODS RSC TPV ' +
    'ECDL ICDL CCNA MS IBM ASP POO BD SGBD SIG GIS KPI UX UI VR BI ML NFT DLP SOC SIEM ' +
    'GRC ADR CSV PDF USB DNS LPI MOS J2EE JDBC REST SOAP OCA OCP CCNP ISTQB PMP DAX MDX ETL DMS'
  ).split(' '),
);

/** Names of products and languages, written as their makers write them. */
const NAMES: Readonly<Record<string, string>> = Object.fromEntries(
  (
    'Microsoft Azure Java JavaScript TypeScript Python Linux Windows Excel Word Access ' +
    'PowerPoint Outlook Office Oracle Unity ChatGPT OpenAI Google Android Adobe Photoshop ' +
    'Illustrator InDesign WordPress Cisco Unix AutoCAD Instagram Facebook LinkedIn Salesforce ' +
    'MySQL PostgreSQL MongoDB Apache Tomcat Angular React Kotlin Swift Scrum Agile Kanban ' +
    'Moodle Joomla Drupal Magento PrestaShop Shopify Dynamics Navision SharePoint Teams Copilot ' +
    'Blockchain Docker Kubernetes Ubuntu Debian Red Hat VMware Revit Blender Maya Hadoop Spark ' +
    'Tableau Qlik Power BI Hibernate Spring Laravel Symfony Node Vue Django Flutter Ionic ' +
    'JBoss Struts Hyper-V'
  )
    .split(' ')
    .map((name) => [fold(name), name]),
);

const ROMAN = /^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/;

function wordInCase(word: string, first: boolean): string {
  if (/\d/.test(word) || ACRONYMS.has(word) || ROMAN.test(word) || /^[A-Z][+#]+$/.test(word))
    return word;
  const name = NAMES[fold(word)];
  if (name !== undefined) return name;
  const lower = word.toLocaleLowerCase('es');
  return first ? lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1) : lower;
}

/**
 * An official name written in capitals, in sentence case: lower case but for the first word of
 * each sentence, the usual abbreviations, product names, Roman numerals and anything with a digit.
 */
export function sentenceCase(name: string): string {
  let sentenceStart = true;
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\p{L}\p{N}+#]+|[^\p{L}\p{N}+#]+/gu, (part) => {
      if (!/[\p{L}\p{N}]/u.test(part)) {
        if (/[.!?]\s*$/.test(part)) sentenceStart = true;
        return part;
      }
      const cased = wordInCase(part, sentenceStart);
      sentenceStart = false;
      return cased;
    });
}

interface TopicRule {
  readonly topic: TopicId;
  readonly words: RegExp;
}

/** Words of the official name, folded, that place a specialty in a subject. */
const SEPE_TOPIC_RULES: readonly TopicRule[] = [
  { topic: 'ai-foundations', words: /\b(inteligencia artificial|ia|ai|generativ\w*)\b/ },
  { topic: 'ai-at-work', words: /\b(chatgpt|copilot|asistentes? de ia)\b/ },
  {
    topic: 'machine-learning',
    words:
      /\b(machine learning|aprendizaje automatico|deep learning|redes neuronales|openai|ciencia de datos)\b/,
  },
  { topic: 'automation-agents', words: /\b(automatiza\w*|rpa|robotica|bots?|agentes)\b/ },
  {
    topic: 'data-analytics',
    words: anyOf([
      '(?<!proteccion de )datos',
      'sql',
      'big data',
      'business intelligence',
      'power bi',
      'analitica',
      'estadistic\\w*',
      'spss',
      'hojas? de calculo',
    ]),
  },
  {
    topic: 'cybersecurity',
    words: /\b(seguridad|ciberseguridad|proteccion de datos|rgpd|lopdgdd|hacking|forense|27001)\b/,
  },
  {
    topic: 'cloud',
    words: anyOf([
      'cloud',
      'nube',
      'azure',
      'aws',
      'redes',
      'sistemas operativos',
      'servidor\\w*',
      'linux',
      'virtualizacion',
      'cisco',
      'ccna',
      'infraestructura\\w*',
    ]),
  },
  {
    topic: 'software-development',
    words: anyOf([
      'programacion',
      'desarrollo de (aplicaciones|software|videojuegos|sitios|paginas)',
      'java',
      'javascript',
      'python',
      'php',
      'html',
      'web',
      'apps?',
      'android',
      'software',
      'videojuegos',
    ]),
  },
  {
    topic: 'productivity-and-collaboration',
    words: /\b(ofimatica|office|word|excel|powerpoint|access|teletrabajo|colaborativ\w*)\b/,
  },
  {
    topic: 'marketing-sales',
    words: anyOf([
      'marketing',
      'ventas?',
      'vendedor\\w*',
      'comercial\\w*',
      'publicidad',
      'seo',
      'sem',
      'redes sociales',
      'rrss',
      'comercio electronico',
      'e-commerce',
      'clientela',
      'escaparat\\w*',
      'promocion\\w*',
    ]),
  },
  {
    topic: 'business-management',
    words: anyOf([
      'gestion',
      'administracion',
      'contab\\w*',
      'nominas?',
      'factura\\w*',
      'finanz\\w*',
      'empresa\\w*',
      'recursos humanos',
      'logistic\\w*',
      'stocks?',
      'almacen\\w*',
      'proyectos',
      'liderazgo',
      'emprend\\w*',
      'fiscal\\w*',
      'iva',
    ]),
  },
  { topic: 'education', words: /\b(docen\w*|e-learning|scorm|tutor\w*|formador\w*)\b/ },
  { topic: 'health', words: /\b(sanitari\w*|salud|clinic\w*|hospital\w*)\b/ },
];

const WORD_WEIGHT = 2;
const FAMILY_WEIGHT = 1;

/** Up to three subjects: words of the name first, then the subject of the family. */
export function sepeTopicsOf(name: string, family: string): TopicId[] {
  const folded = fold(name);
  const familyTopic = FAMILIES[family]?.topic;
  return SEPE_TOPIC_RULES.map((rule, position) => ({
    topic: rule.topic,
    position,
    score:
      (rule.words.test(folded) ? WORD_WEIGHT : 0) +
      (rule.topic === familyTopic ? FAMILY_WEIGHT : 0),
  }))
    .filter((entry) => entry.score > 0)
    .toSorted((a, b) => b.score - a.score || a.position - b.position)
    .slice(0, MAX_TOPICS)
    .map((entry) => entry.topic);
}

/** Whether a specialty is kept: online, with an official level, stated hours and a kept family. */
export function isKept(specialty: Specialty): boolean {
  return (
    ONLINE_MODES[specialty.modalidad] !== undefined &&
    LEVELS[specialty.nivel] !== undefined &&
    /^\d+$/.test(specialty.horas) &&
    Number(specialty.horas) > 0 &&
    FAMILIES[specialty.familia] !== undefined
  );
}

/** A sentence made only of what the record says: family, way of taking it and official level. */
export function sepeSummaries(specialty: Specialty): { en: string; es: string } {
  const family = FAMILIES[specialty.familia];
  const mode = ONLINE_MODES[specialty.modalidad];
  if (family === undefined || mode === undefined) throw new Error('The specialty is not kept');
  return {
    en: `Official Spanish training specialty in ${family.en}, taken ${mode.en}, at official level ${specialty.nivel}.`,
    es: `Especialidad formativa oficial de la familia ${family.es}, ${mode.es}, de nivel oficial ${specialty.nivel}.`,
  };
}

/** The id of a specialty: its code, or codes, in lower case, as in `sepe-ifcd0110`. */
export function sepeIdOf(code: string): string {
  const slug = code
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `sepe-${slug}`;
}

/** The snapshot of the kept specialties of an export, in the order of their codes. */
export function sepeSnapshotOf(file: unknown, exportedOn: string): CatalogueSnapshot {
  const { especialidades } = sepeExportSchema.parse(file);
  const courses = Object.entries(especialidades)
    .filter(([, specialty]) => isKept(specialty))
    .toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([code, specialty]) => {
      const summaries = sepeSummaries(specialty);
      return {
        id: sepeIdOf(code),
        title: sentenceCase(specialty.nombre),
        url: specialty.ficha,
        summary: summaries.en,
        summaryEs: summaries.es,
        topics: sepeTopicsOf(specialty.nombre, specialty.familia),
        level: LEVELS[specialty.nivel] ?? 'introductory',
        hours: Number(specialty.horas),
        languages: ['es'],
      };
    });
  const [year, month, day] = exportedOn.split('-');
  return {
    provider: SEPE_PROVIDER,
    source: null,
    citation:
      'Origen de los datos: SEPE, Catálogo de Especialidades Formativas ' +
      `(exportado el ${day}/${month}/${year}).`,
    capturedOn: exportedOn,
    providerAccess: 'unknown',
    regions: ['eu'],
    courses,
  };
}
