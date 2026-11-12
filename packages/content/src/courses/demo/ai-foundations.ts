import type { DemoCourse } from '../../schema/course.ts';

export const AI_FOUNDATIONS = {
  id: 'ai-foundations',
  title: 'AI foundations: what generative AI does and where it goes wrong',
  summary:
    'A first course for any job. It explains how generative AI produces its answers, why ' +
    'those answers can be wrong while sounding certain, and how to use it safely at work.',
  stage: 'understand',
  majorGroups: [],
  level: 'introductory',
  hours: 1.5,
  outcomes: [
    'Explain in plain words how a generative AI tool produces text and images.',
    'Recognise an invented fact, figure or reference and check it against a real source.',
    'Decide what information you can and cannot share with an AI tool at work.',
  ],
  prices: { USD: 1900, GBP: 1500, EUR: 1800 },
  lessons: [
    {
      id: 'how-it-works',
      title: 'How generative AI produces an answer',
      minutes: 25,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'Generative AI is software that writes text, creates images or produces other content',
            'when you describe what you want. It learned from very large collections of examples.',
            'A text model writes its answer piece by piece: at each step it predicts a word, or part',
            'of one, that fits what came before. That is why its answers read smoothly: fluent',
            'language is exactly what it was built to produce. An image model starts from random',
            'noise and refines it, step by step, towards a picture that matches your description.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'Predicting likely words is not the same as knowing facts. Unless the tool is connected',
            'to a search or to your documents, it does not look anything up, and its knowledge stops',
            'at the date its training data ends. It has no view of your workplace beyond what you',
            'tell it.',
          ].join(' '),
        },
        { type: 'paragraph', text: 'Used with care, it is good at tasks such as these:' },
        {
          type: 'list',
          items: [
            'drafting a first version of an email, a report or a notice;',
            'summarising a long text you provide;',
            'rewording a text for a different reader or a shorter length;',
            'explaining a term or an idea in simpler language;',
            'suggesting options or a structure when you are starting from a blank page.',
          ],
        },
        {
          type: 'key-point',
          text: 'Generative AI produces likely answers, not checked ones. Fluency is not accuracy.',
        },
      ],
    },
    {
      id: 'confident-errors',
      title: 'Why it can be wrong while sounding sure',
      minutes: 25,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'Because it generates plausible text, a generative AI tool can state things that are',
            'false in the same calm and confident tone it uses for things that are true. These',
            'errors are often called hallucinations. A tool may invent a statistic, a quotation, a',
            'law, a product feature or a reference to an article that does not exist.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'The tool gives no reliable signal that it is guessing. Asking it whether it is sure',
            'does not settle the question either, because the reply is generated in the same way.',
            'The answer is to check the parts that matter against a source you trust.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Check names, dates, numbers and amounts against the original document or record.',
            'When the tool cites a source, open it and confirm that it exists and says that.',
            'Take extra care with legal, medical, financial and safety information.',
            'If you cannot confirm a statement, remove it or mark it clearly as unchecked.',
          ],
        },
        {
          type: 'key-point',
          text: 'A confident tone tells you nothing about accuracy. Check what matters before you use it.',
        },
      ],
    },
    {
      id: 'safe-use',
      title: 'Using AI safely at work',
      minutes: 30,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'What you type into an AI tool leaves your hands. Depending on the service and its',
            'settings, it may be stored, reviewed or used to improve the system. Before you paste',
            'anything in, find out which tools your employer has approved and what its policy',
            'allows.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Do not enter personal data about customers, patients or colleagues ' +
              'unless an approved tool allows it.',
            'Keep out contracts, prices, passwords and anything marked confidential.',
            'Remove names and identifying details when an example is enough.',
          ],
        },
        {
          type: 'paragraph',
          text: [
            'AI tools can repeat human biases. They come from the writing and images a tool learned',
            'from, from the choice of which data went in and from how the system was tuned, so',
            'stereotypes about gender, age, origin or disability can appear in a draft without',
            'anyone asking for them. Read any output that describes or affects people with that in',
            'mind, and correct it.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'Finally, the tool is not responsible for the work. Whatever you send, sign or act on',
            'is yours to answer for, whoever drafted it, and towards customers and other outside',
            'parties your organisation answers for it as well. Where your employer or your',
            'customers expect to know that AI was used, say so.',
          ].join(' '),
        },
        {
          type: 'key-point',
          text: 'Share only what your employer allows, watch for bias, and own what you send.',
        },
      ],
    },
  ],
  practice: {
    title: 'Try it on one task of your job',
    instructions: [
      'Take the task you chose and write down one piece of work it produces, such as a message,',
      'a note or a short report. Ask an AI tool approved by your employer to draft it, giving only',
      'information you are allowed to share. Then mark every name, number, date and fact in the',
      'draft and check each one against a real source. Finish with two sentences: what the tool',
      'did well and what you had to correct.',
    ].join(' '),
  },
  quiz: {
    passMark: 4,
    questions: [
      {
        id: 'why-fluent',
        prompt: 'Why do answers from a generative AI tool usually read smoothly?',
        options: [
          'Because it looks each answer up in a library of checked, well-written documents.',
          'Because it was built to predict likely, natural-sounding text.',
          'Because it only answers when it is certain.',
          'Because it copies a single trusted source.',
        ],
        correctOption: 1,
        explanation:
          'The tool predicts what text is likely to come next, so fluency comes from how it ' +
          'works, not from any check of the facts.',
      },
      {
        id: 'invented-reference',
        prompt:
          'A draft from an AI tool cites a report you have never heard of. What should you do?',
        options: [
          'Keep it, because the tool would not name a report that does not exist.',
          'Ask the tool whether it is sure and keep the reference if it says yes.',
          'Delete the whole draft and stop using AI.',
          'Find and open the report, and remove the reference if you cannot confirm it.',
        ],
        correctOption: 3,
        explanation:
          'Tools can invent references. Only the source itself confirms them, and asking the ' +
          'tool again produces another generated answer.',
      },
      {
        id: 'customer-data',
        prompt:
          'You want help replying to a complaint that includes a customer’s address and account ' +
          'number. What is the safest first step?',
        options: [
          'Check your employer’s policy and remove the personal details unless an approved tool allows them.',
          'Paste the whole complaint, since the tool needs every detail.',
          'Use any free tool you find, because it is only one message.',
          'Ask the customer to send the complaint again without details.',
        ],
        correctOption: 0,
        explanation:
          'Personal data should only go into tools your employer approves for it; often the ' +
          'reply can be drafted without the details at all.',
      },
      {
        id: 'bias',
        prompt: 'Why should you read an AI-written job advert carefully for bias?',
        options: [
          'Because AI tools are deliberately designed by their makers to prefer some groups over others.',
          'Because adverts are the only place bias appears.',
          'Because the data it learned from, and the way it was tuned, can carry stereotypes.',
          'Because bias only matters when a law requires it.',
        ],
        correctOption: 2,
        explanation:
          'Bias is rarely built in on purpose. It can come from the data the tool learned from, ' +
          'from which data was chosen and from how the system was tuned, and it can appear in ' +
          'any output about people.',
      },
      {
        id: 'responsibility',
        prompt:
          'A report you sent contained an error introduced by an AI draft. Who is responsible?',
        options: [
          'The company that made the tool.',
          'You, who sent it, and your organisation towards the people who received it.',
          'Nobody, because the error came from software.',
          'The reader, for not checking it.',
        ],
        correctOption: 1,
        explanation:
          'The person who signs or sends the work answers for it, whoever or whatever drafted ' +
          'it; towards customers and other outside parties, their organisation answers for it ' +
          'too.',
      },
    ],
  },
} satisfies DemoCourse;
