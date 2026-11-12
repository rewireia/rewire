import type { DemoCourse } from '../../schema/course.ts';

export const AI_FOR_TECHNICIANS_AND_TRADES = {
  id: 'ai-for-technicians-and-trades',
  title: 'AI for technical and trade work: information, paperwork and safety',
  summary:
    'For technical, trade, farm, machine and hands-on jobs. It shows how AI can help with ' +
    'technical information and paperwork, and why safety-critical facts must come from official sources.',
  stage: 'apply',
  majorGroups: ['3', '6', '7', '8', '9'],
  level: 'introductory',
  hours: 1.5,
  outcomes: [
    'Use AI to understand technical information, and confirm it in the official documentation.',
    'Prepare reports, quotes and checklists faster with AI, checking every figure.',
    'Keep safety decisions and signed-off work under your own professional judgement.',
  ],
  prices: { USD: 3900, GBP: 3200, EUR: 3600 },
  lessons: [
    {
      id: 'technical-information',
      title: 'Finding and understanding technical information',
      minutes: 30,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'An AI tool can explain a technical term, put a dense manual into plain words or',
            'suggest possible causes for a fault you describe. That can help you understand a new',
            'machine, a procedure or a regulation faster.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'The danger is in the specific values. A tool may give a torque setting, a cable size,',
            'a chemical dose, a pressure or a clearance that looks exact but is wrong for your',
            'equipment, or simply invented. It does not know the model in front of you, and it',
            'cannot see the site.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Take every value from the manufacturer’s documentation or the applicable standard.',
            'Treat suggested causes of a fault as ideas to test, not as a diagnosis.',
            'Check that a regulation the tool mentions exists and applies where you work.',
            'Ask a qualified colleague when the documentation and the tool disagree.',
          ],
        },
        {
          type: 'key-point',
          text: 'AI can explain; the manual and the standard decide. Never take a value from AI alone.',
        },
      ],
    },
    {
      id: 'paperwork',
      title: 'Reports, quotes and checklists',
      minutes: 30,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'Paperwork takes time in most practical jobs: job reports, quotes, inspection notes,',
            'handover sheets. AI can turn your rough notes into a clear report, lay out a quote or',
            'draft a checklist for a routine job. You provide the facts; the tool helps with the',
            'wording and the layout.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'Check the result as carefully as you would check your own work. Generated text can',
            'add a step you did not do, drop a measurement or round a figure. In a quote, a wrong',
            'quantity or price becomes a problem with the customer.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Recalculate every quantity, price and total in a quote.',
            'Make sure a job report records only what was actually done and found.',
            'Compare a generated checklist with the official procedure and add what is missing.',
          ],
        },
        {
          type: 'paragraph',
          text: [
            'Photos and notes from a job can show addresses, people or customer property. Remove',
            'such details unless the tool is approved for them.',
          ].join(' '),
        },
        {
          type: 'key-point',
          text: 'Paperwork with AI is fine when every figure and every recorded step has been checked.',
        },
      ],
    },
    {
      id: 'safety-first',
      title: 'Safety and signed-off work',
      minutes: 30,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'Some decisions can hurt people if they are wrong: isolating power, working at height,',
            'handling chemicals, lifting loads, operating machinery. For these, AI is at most a',
            'reminder of things to look up. The safe method comes from your training, the',
            'manufacturer, the site rules and the law.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Never skip a safety check because an AI answer said it was not needed.',
            'Follow the permit, the risk assessment and the site rules, even when a tool says otherwise.',
            'Stop and ask a supervisor when you are unsure.',
          ],
        },
        {
          type: 'paragraph',
          text: [
            'When you sign off a job, an inspection or a certificate, your signature means you',
            'checked the work. That stays true if an AI tool helped with the report. If you find',
            'an error later, report and correct it as you would any other mistake. Keep notes of',
            'what you checked, so that the record shows it.',
          ].join(' '),
        },
        {
          type: 'key-point',
          text: 'Safety comes from training, procedures and rules. Your signature means you checked.',
        },
      ],
    },
  ],
  practice: {
    title: 'Use AI on one practical task, safely',
    instructions: [
      'Take the task you chose and pick one piece of paperwork or information it needs, such as',
      'a job report, a quote or the meaning of a procedure. Ask an approved AI tool for help,',
      'leaving out addresses, names and photos of people. Check every value against the official',
      'documentation and every figure by hand, and compare any checklist with the procedure.',
      'Write down one thing the tool got wrong or left out, and how you caught it.',
    ].join(' '),
  },
  quiz: {
    passMark: 4,
    questions: [
      {
        id: 'torque-value',
        prompt: 'An AI tool gives you a torque setting for a bolt on a machine. What do you do?',
        options: [
          'Use it, since the number is precise.',
          'Round it down to be safe.',
          'Take the value from the manufacturer’s documentation instead.',
          'Ask the tool where it got the value and use it if it names a source.',
        ],
        correctOption: 2,
        explanation:
          'Specific values can be wrong or invented, and a named source may not exist. The ' +
          'manufacturer’s documentation decides.',
      },
      {
        id: 'fault-causes',
        prompt: 'The tool lists five possible causes of a fault. How should you treat them?',
        options: [
          'As ideas to test against the documentation and what you observe.',
          'As a diagnosis, starting with the first one on the list.',
          'As proof that the machine needs replacing.',
          'As useless, because AI cannot help with faults.',
        ],
        correctOption: 0,
        explanation:
          'Suggestions can help you think, but only testing on the real equipment shows which ' +
          'cause is the right one.',
      },
      {
        id: 'quote-check',
        prompt:
          'An AI tool laid out your quote from your notes. What must you check before sending it?',
        options: [
          'Only the spelling.',
          'That it looks professional.',
          'Nothing, since the facts came from you.',
          'Every quantity, price and total.',
        ],
        correctOption: 3,
        explanation:
          'Generated text can drop, change or round figures even when you supplied them. Check ' +
          'the numbers yourself.',
      },
      {
        id: 'safety-check',
        prompt: 'An AI answer says a safety check is not needed for a quick job. What do you do?',
        options: [
          'Skip the check, since the job is quick.',
          'Follow the procedure and site rules, and do the check.',
          'Skip it only if a colleague agrees.',
          'Ask the tool to confirm before deciding.',
        ],
        correctOption: 1,
        explanation:
          'Safe methods come from training, procedures and rules. An AI answer never overrides ' +
          'them.',
      },
      {
        id: 'signature',
        prompt: 'What does your signature on an inspection report mean if AI helped write it?',
        options: [
          'That the tool checked the work.',
          'Nothing more than that you saw the report.',
          'That you checked the work and stand behind the report.',
          'That the report is a draft until the tool’s maker approves it.',
        ],
        correctOption: 2,
        explanation:
          'A signature means you checked. Using AI for the wording does not change that.',
      },
    ],
  },
} satisfies DemoCourse;
