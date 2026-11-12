import type { DemoCourse } from '../../schema/course.ts';

export const AI_FOR_PROFESSIONALS = {
  id: 'ai-for-professionals',
  title: 'AI for professionals: research, analysis and advice',
  summary:
    'For professional jobs that rest on expert judgement. It covers using AI to research, ' +
    'analyse and write, while keeping to the standards of evidence and care your work requires.',
  stage: 'apply',
  majorGroups: ['2'],
  level: 'intermediate',
  hours: 3,
  outcomes: [
    'Use AI to explore a question while checking every source and claim it offers.',
    'Draft reports and advice with AI and keep your own professional judgement in charge.',
    'Meet your duties of confidentiality, fairness and accountability when you use AI.',
  ],
  prices: { USD: 7900, GBP: 6500, EUR: 7500 },
  lessons: [
    {
      id: 'research',
      title: 'Researching a question with AI',
      minutes: 50,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'An AI tool can help you map an unfamiliar topic quickly: it can list the main',
            'questions, suggest terms to search for and explain concepts at the level you need.',
            'This is useful at the start of a piece of work, when you are deciding where to look.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'It is not a source in itself. A tool may describe a study that does not exist, quote',
            'a standard incorrectly or present a disputed point as settled. Some tools search the',
            'web or your documents and show links; even then, the link may not say what the answer',
            'claims. In professional work, a claim is only as good as the source you have read.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Use AI to find leads, then read the primary sources yourself.',
            'Confirm that every cited paper, ruling or guideline exists and says what is claimed.',
            'Check whether the source is current, since rules and evidence change.',
            'Ask the tool for the strongest counter-argument, and check that too.',
          ],
        },
        {
          type: 'key-point',
          text: 'AI can point you towards evidence. Only the source you have read is evidence.',
        },
      ],
    },
    {
      id: 'reports-and-advice',
      title: 'Writing reports and advice',
      minutes: 55,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'Generative AI drafts well-structured text quickly, which makes it tempting for reports,',
            'briefings and letters of advice. The danger is that a fluent draft can carry reasoning',
            'you would not have chosen: an assumption left unstated, a risk left out, a conclusion',
            'stronger than the facts support.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'Decide the conclusion and the reasons yourself, then use the tool to help express them.',
            'This keeps the judgement with the person who is qualified to make it.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Write your own outline of the argument before asking for a draft.',
            'Check that every figure and reference in the draft comes from your verified sources.',
            'Look for what the draft leaves out: exceptions, risks and uncertainty.',
            'Edit the final text so that it says exactly what you are prepared to stand behind.',
          ],
        },
        {
          type: 'paragraph',
          text: [
            'Many professions and employers now have rules on disclosing AI use. Find out what',
            'yours require, and follow them.',
          ].join(' '),
        },
        {
          type: 'key-point',
          text: 'You decide the conclusion; the tool helps you say it. Never sign reasoning you did not check.',
        },
      ],
    },
    {
      id: 'professional-duties',
      title: 'Confidentiality, fairness and accountability',
      minutes: 50,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'Professionals hold information in trust: client files, patient notes, unpublished',
            'research, commercial plans. Entering such material into an AI tool can breach that',
            'trust if the tool is not approved for it. Check where the data goes, whether it is',
            'stored and who can access it, and use only tools your organisation has cleared for',
            'confidential work.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'Fairness matters whenever your work affects people. AI tools can carry biases from',
            'their training data, so analysis or advice about individuals or groups needs a',
            'deliberate check for unequal treatment.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Ask whether the output would change if a person’s gender, age or origin were different.',
            'Check that any data the analysis relies on represents the people it concerns.',
            'Record how AI was used, so that colleagues and reviewers can follow your work.',
          ],
        },
        {
          type: 'paragraph',
          text: [
            'Your professional responsibility does not pass to the tool. If the advice is wrong,',
            'it is your advice.',
          ].join(' '),
        },
        {
          type: 'key-point',
          text: 'Confidential material only in approved tools, a check for bias, and your name on the result.',
        },
      ],
    },
  ],
  practice: {
    title: 'Run one piece of professional work through a checked AI workflow',
    instructions: [
      'Take the task you chose and frame one real question it involves. Write your own outline',
      'of how you would answer it. Use an approved AI tool to find leads and to draft a short',
      'answer, sharing no confidential material. Then verify every source and figure in the',
      'draft, list what it left out, and check it for bias if it concerns people. Write a final',
      'version you would sign, and a two-line note of how AI was used.',
    ].join(' '),
  },
  quiz: {
    passMark: 4,
    questions: [
      {
        id: 'source-status',
        prompt:
          'An AI tool summarises a guideline and gives a link. When can you rely on the summary?',
        options: [
          'Once you have read the guideline and confirmed that it says this and is current.',
          'As soon as a link is shown.',
          'When the summary is detailed.',
          'When a second AI tool gives the same summary.',
        ],
        correctOption: 0,
        explanation:
          'A link does not prove that the source says what the summary claims. Only reading the ' +
          'current source does.',
      },
      {
        id: 'outline-first',
        prompt: 'Why write your own outline before asking AI for a draft report?',
        options: [
          'Because AI cannot write reports without one.',
          'So that the conclusion and reasoning are yours, not whatever the draft happens to say.',
          'To make the report longer.',
          'Because outlines are required by law.',
        ],
        correctOption: 1,
        explanation:
          'A fluent draft can carry reasoning you did not choose. Deciding the argument first ' +
          'keeps the judgement with you.',
      },
      {
        id: 'confidential-file',
        prompt:
          'A colleague suggests pasting a client file into a public AI tool to save time. Your answer?',
        options: [
          'Agree, if someone checks the result before it goes out.',
          'Agree, if the file is short.',
          'Paste only the first half.',
          'Decline unless the tool is approved for confidential client material.',
        ],
        correctOption: 3,
        explanation:
          'Checking the result does not undo a disclosure. Confidential material goes only into ' +
          'tools cleared for it.',
      },
      {
        id: 'bias-check',
        prompt: 'Which is a practical check for bias in an AI-assisted assessment of a person?',
        options: [
          'Asking the tool to promise it is unbiased.',
          'Using a longer prompt.',
          'Seeing whether the result changes when a protected characteristic changes.',
          'Removing all numbers from the assessment.',
        ],
        correctOption: 2,
        explanation:
          'If changing gender, age or origin changes the outcome, the assessment treats people ' +
          'unequally and needs correcting.',
      },
      {
        id: 'wrong-advice',
        prompt:
          'Advice you gave turns out to rest on an error in an AI draft. Whose advice was it?',
        options: [
          'The tool’s, since it wrote the draft.',
          'Yours, since you gave it.',
          'Your employer’s, since it approved the tool.',
          'No one’s, since errors in software are nobody’s fault.',
        ],
        correctOption: 1,
        explanation:
          'Professional responsibility stays with the person who gives the advice, whatever tool ' +
          'helped prepare it.',
      },
    ],
  },
} satisfies DemoCourse;
