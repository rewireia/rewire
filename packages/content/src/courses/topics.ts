/**
 * The subjects of the course catalogue. The list is short and stable on purpose: a course
 * belongs to one to three of them, and the catalogue can be filtered by any.
 */
export const COURSE_TOPIC_IDS = [
  'ai-foundations',
  'ai-at-work',
  'prompting',
  'responsible-ai',
  'machine-learning',
  'automation-agents',
  'data-analytics',
  'software-development',
  'cloud',
  'cybersecurity',
  'business-management',
  'marketing-sales',
  'productivity-and-collaboration',
  'education',
  'health',
] as const;

type TopicId = (typeof COURSE_TOPIC_IDS)[number];

/** The label of each subject, in the languages Rewire speaks. */
export const COURSE_TOPIC_LABELS: Readonly<Record<TopicId, { en: string; es: string }>> = {
  'ai-foundations': { en: 'AI foundations', es: 'Fundamentos de IA' },
  'ai-at-work': { en: 'AI in everyday work', es: 'IA en el trabajo diario' },
  prompting: { en: 'Prompting', es: 'Instrucciones para la IA' },
  'responsible-ai': { en: 'Responsible AI', es: 'IA responsable' },
  'machine-learning': { en: 'Machine learning', es: 'Aprendizaje automático' },
  'automation-agents': { en: 'Automation and agents', es: 'Automatización y agentes' },
  'data-analytics': { en: 'Data and analytics', es: 'Datos y analítica' },
  'software-development': { en: 'Software development', es: 'Desarrollo de software' },
  cloud: { en: 'Cloud and infrastructure', es: 'Nube e infraestructura' },
  cybersecurity: { en: 'Cybersecurity and privacy', es: 'Ciberseguridad y privacidad' },
  'business-management': { en: 'Business and management', es: 'Negocio y gestión' },
  'marketing-sales': { en: 'Marketing and sales', es: 'Marketing y ventas' },
  'productivity-and-collaboration': {
    en: 'Productivity and collaboration',
    es: 'Productividad y colaboración',
  },
  education: { en: 'Education', es: 'Educación' },
  health: { en: 'Health', es: 'Salud' },
};
