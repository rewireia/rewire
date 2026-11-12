import type { TopicId } from '@rewire/content';

const MAX_TOPICS = 3;
const AI = '(ai|artificial intelligence|generative ai|machine learning)';

/** A pattern that matches any of the given alternatives as whole words. */
function anyOf(alternatives: readonly string[]): RegExp {
  return new RegExp(`\\b(${alternatives.join('|')})\\b`);
}

/** What the topic rules read of a catalogue entry. */
interface TopicInput {
  readonly title: string;
  readonly products: readonly string[];
  readonly roles: readonly string[];
}

interface TopicRule {
  readonly topic: TopicId;
  /** Product ids, or prefixes ending in `*`. */
  readonly products: readonly string[];
  readonly roles: readonly string[];
  readonly title: RegExp | null;
}

/**
 * How a Microsoft Learn course earns a subject: a word of its title weighs most, then a
 * product it teaches, then a role it is written for. The rules read only the catalogue.
 */
const TOPIC_RULES: readonly TopicRule[] = [
  {
    topic: 'ai-foundations',
    products: [],
    roles: [],
    title: new RegExp(
      `\\b${AI} (fundamentals|concepts|basics)\\b|` +
        `\\b(introduction to|get started with|fundamentals of|explore) ${AI}\\b`,
    ),
  },
  {
    topic: 'ai-at-work',
    products: ['microsoft-365-copilot', 'microsoft-365-copilot-chat', 'ms-copilot'],
    roles: [],
    title: /\bcopilot\b/,
  },
  {
    topic: 'prompting',
    products: [],
    roles: [],
    title: /\b(prompts?|prompting|prompt engineering)\b/,
  },
  {
    topic: 'responsible-ai',
    products: ['content-safety'],
    roles: [],
    title: /\b(responsible|ethic\w*|trustworthy|fairness)\b|\bai\b.*\bgovernance\b/,
  },
  {
    topic: 'machine-learning',
    products: [
      'azure-openai',
      'microsoft-foundry',
      'foundry-tools',
      'azure-machine-learning',
      'azure-machine-learning-designer',
      'language-service',
      'azure-translator-*',
      'azure-cognitive-search',
    ],
    roles: ['ai-engineer', 'ai-edge-engineer', 'data-scientist'],
    title: anyOf([
      'machine learning',
      'openai',
      'language models?',
      'llms?',
      'computer vision',
      'natural language',
      'speech',
      'generative ai',
      'ai (apps?|solutions?|models?)',
    ]),
  },
  {
    topic: 'automation-agents',
    products: [
      'power-automate',
      'power-apps',
      'power-pages',
      'power-platform',
      'microsoft-copilot-studio',
      'azure-logic-apps',
      'ai-builder',
      'agent-framework',
      'foundry-agent-service',
      'microsoft-agents',
      'm365-agents',
      'agent-365',
    ],
    roles: ['maker'],
    title: /\b(agents?|agentic|automat\w*|workflows?|low-code)\b/,
  },
  {
    topic: 'data-analytics',
    products: [
      'power-bi',
      'fabric',
      'azure-synapse-analytics',
      'azure-databricks',
      'azure-data-factory',
      'azure-stream-analytics',
      'azure-sql-*',
      'sql-server',
      'azure-cosmos-db',
      'azure-database-*',
      'dataverse',
    ],
    roles: ['data-analyst', 'data-engineer', 'database-administrator'],
    title: /\b(data|analytics|sql|databases?|power bi|reports?|dashboards?)\b/,
  },
  {
    topic: 'software-development',
    products: [
      'dotnet',
      'dotnet-maui',
      'aspnet',
      'aspnet-core',
      'blazor',
      'vs',
      'vs-code',
      'github',
      'github-copilot',
      'azure-devops',
      'azure-pipelines',
      'azure-repos',
      'azure-functions',
      'static-web-apps',
      'qdk',
    ],
    roles: ['developer', 'devops-engineer'],
    title:
      /\b(develop\w*|code|coding|program\w*|python|java|javascript|typescript|apis?|devops|github)\b/,
  },
  {
    topic: 'cloud',
    products: ['azure', 'azure-*', 'windows-server', 'windows-365'],
    roles: [
      'administrator',
      'solution-architect',
      'network-engineer',
      'platform-engineer',
      'support-engineer',
    ],
    title: anyOf([
      'azure',
      'cloud',
      'networks?',
      'networking',
      'infrastructure',
      'virtual machines?',
      'kubernetes',
      'containers?',
      'servers?',
      'storage',
      'migrat\\w*',
    ]),
  },
  {
    topic: 'cybersecurity',
    products: [
      'microsoft-defender',
      'defender-*',
      'microsoft-sentinel',
      'microsoft-purview',
      'entra',
      'entra-*',
      'intune',
      'security-copilot',
      'azure-key-vault',
      'azure-firewall',
      'azure-ddos-protection',
    ],
    roles: [
      'security-engineer',
      'security-operations-analyst',
      'identity-access-admin',
      'privacy-manager',
      'auditor',
      'risk-practitioner',
    ],
    title: /\b(secur\w*|identity|threats?|compliance|privacy|protect\w*|zero trust)\b/,
  },
  {
    topic: 'business-management',
    products: ['dynamics-*', 'customer-insights-*', 'industry-solutions', 'mscloud-*'],
    roles: [
      'business-owner',
      'business-leader',
      'technology-manager',
      'startup-founder',
      'business-analyst',
      'functional-consultant',
      'service-adoption-specialist',
    ],
    title: /\b(business|leaders?|leadership|strategy|finance|startups?|adoption)\b/,
  },
  {
    topic: 'marketing-sales',
    products: ['dynamics-sales', 'customer-insights-journeys', 'customer-voice'],
    roles: [],
    title: /\b(marketing|sales|sellers?|selling|advertis\w*|campaigns?|seo)\b/,
  },
  {
    topic: 'productivity-and-collaboration',
    products: [
      'm365',
      'm365-apps',
      'm365-business',
      'office',
      'office-*',
      'microsoft-teams-phone',
      'viva',
      'viva-*',
      'microsoft-whiteboard',
      'windows-11',
      'microsoft-edge',
    ],
    roles: ['business-user'],
    title: /\b(teams|outlook|word|excel|powerpoint|onenote|productiv\w*|collaborat\w*|meetings?)\b/,
  },
  {
    topic: 'education',
    products: ['m365-education', 'minecraft', 'makecode'],
    roles: ['k-12-educator', 'higher-ed-educator', 'school-leader', 'parent-guardian'],
    title: /\b(educat\w*|teach\w*|classrooms?|schools?)\b/,
  },
  {
    topic: 'health',
    products: ['mscloud-healthcare'],
    roles: [],
    title: /\b(health\w*|clinical|patients?|hospitals?|medical)\b/,
  },
];

const TITLE_WEIGHT = 4;
const PRODUCT_WEIGHT = 2;
const ROLE_WEIGHT = 1;

function matchesProduct(patterns: readonly string[], product: string): boolean {
  return patterns.some((pattern) =>
    pattern.endsWith('*') ? product.startsWith(pattern.slice(0, -1)) : product === pattern,
  );
}

/** Up to three subjects of a course, strongest first; ties keep the order of the rules. */
export function topicsOf(item: TopicInput): TopicId[] {
  const title = item.title.toLowerCase();
  const scored = TOPIC_RULES.map((rule, position) => ({
    topic: rule.topic,
    position,
    score:
      (rule.title?.test(title) === true ? TITLE_WEIGHT : 0) +
      (item.products.some((product) => matchesProduct(rule.products, product))
        ? PRODUCT_WEIGHT
        : 0) +
      (item.roles.some((role) => rule.roles.includes(role)) ? ROLE_WEIGHT : 0),
  }));
  const chosen = scored
    .filter((entry) => entry.score > 0)
    .toSorted((a, b) => b.score - a.score || a.position - b.position)
    .slice(0, MAX_TOPICS)
    .map((entry) => entry.topic);
  return chosen.length > 0 ? chosen : ['cloud'];
}
