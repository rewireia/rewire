import type { DemoCourse } from '../../schema/course.ts';

export const AI_FOR_MANAGERS = {
  id: 'ai-for-managers',
  title: 'AI for managers: choosing uses, setting rules and leading the change',
  summary:
    'For people who run a team or an organisation. It covers how to choose where AI helps, ' +
    'how to set clear rules for using it and how to keep decisions about people fair.',
  stage: 'apply',
  majorGroups: ['1'],
  level: 'intermediate',
  hours: 2.5,
  outcomes: [
    'Choose tasks in your area where AI can help and say how you will judge the result.',
    'Write simple rules for your team on approved tools, data and review.',
    'Keep decisions about people under human judgement and explain them openly.',
  ],
  prices: { USD: 9900, GBP: 7900, EUR: 8900 },
  lessons: [
    {
      id: 'choosing-uses',
      title: 'Deciding where AI helps your team',
      minutes: 45,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'Start from the work, not from the tool. List the tasks your team does each week and',
            'ask, for each one, how much of it is drafting, summarising, searching or reformatting',
            'information. Those are the parts generative AI does well. Tasks that depend on',
            'relationships, physical presence or a final judgement are far less suited to it.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'Begin with one or two tasks where a mistake is easy to spot and cheap to fix, such as',
            'first drafts of internal notes. Avoid starting with work that goes straight to',
            'customers or that affects people’s rights, money or safety.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Agree how you will judge the trial: time saved, errors found, quality of the result.',
            'Ask the people who do the task to run the trial and report honestly.',
            'Count the time spent checking output, not only the time saved drafting it.',
            'Stop or change a use that does not hold up.',
          ],
        },
        {
          type: 'key-point',
          text: 'Trial AI on low-risk tasks first, measure the checking time too, and let the evidence decide.',
        },
      ],
    },
    {
      id: 'setting-rules',
      title: 'Setting clear rules for safe use',
      minutes: 50,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'People will use AI tools whether or not there are rules, so it is better to have',
            'clear ones. A short, practical policy protects customers and staff and removes the',
            'guesswork. It should be written in plain language and agreed with whoever is',
            'responsible for data protection and security in your organisation.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Which tools are approved, and for what kinds of work.',
            'What data must never be entered: personal data, confidential and client information.',
            'Who checks AI-assisted work before it leaves the team, and how.',
            'When customers or colleagues must be told that AI was used.',
            'Whom to tell when something goes wrong.',
          ],
        },
        {
          type: 'paragraph',
          text: [
            'Rules only work if people can follow them. Give the team time to learn the approved',
            'tools, and treat honest reports of errors as useful information rather than as',
            'failures. Review the rules as the tools and the law change.',
          ].join(' '),
        },
        {
          type: 'key-point',
          text: 'Short written rules on tools, data, review and disclosure, reviewed as things change.',
        },
      ],
    },
    {
      id: 'leading-change',
      title: 'Leading people through the change',
      minutes: 55,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'Staff often worry about what AI means for their jobs. Talk about it directly: explain',
            'which tasks you plan to change, why, and what support people will have. Avoid promises',
            'you cannot keep, and avoid dismissing concerns.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'Be especially careful with decisions about people. Recruitment, performance reviews,',
            'pay and discipline call for human judgement and a clear explanation. An AI tool can',
            'repeat biases from its training data, and it cannot explain its reasoning in a way',
            'you can rely on. Do not let it rank or reject people on its own; in some places the',
            'law also sets rules on automated decisions about workers.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Keep a named person responsible for every decision that affects someone.',
            'Be able to explain each such decision without referring to the tool.',
            'Check outcomes across groups for signs of unequal treatment.',
          ],
        },
        {
          type: 'key-point',
          text: 'Decisions about people stay with people, who can explain them and answer for them.',
        },
      ],
    },
  ],
  practice: {
    title: 'Plan a small AI trial for one task',
    instructions: [
      'Take the task you chose and write a one-page plan for trying AI on it. Say which part of',
      'the task the tool would help with and which part stays with a person. List the data that',
      'must not be entered, who will check the output and how, and how you will judge the trial',
      'after a few weeks, counting checking time as well as time saved. Finish with the rule you',
      'would add to your team’s policy if the trial goes well.',
    ].join(' '),
  },
  quiz: {
    passMark: 4,
    questions: [
      {
        id: 'first-trial',
        prompt: 'Which task is the best first trial of AI in a team?',
        options: [
          'Writing the final letters that tell customers about price changes.',
          'Screening job applications automatically to save the managers time.',
          'First drafts of internal meeting notes.',
          'Deciding which suppliers to stop working with.',
        ],
        correctOption: 2,
        explanation:
          'Internal drafts are low-risk: errors are easy to spot and cheap to fix before ' +
          'anything reaches customers or affects people.',
      },
      {
        id: 'checking-time',
        prompt: 'When judging an AI trial, why count the time spent checking output?',
        options: [
          'Because the real saving is drafting time minus checking time.',
          'Because checking takes longer than writing from scratch.',
          'Because regulators ask for it in every country.',
          'It does not matter; only drafting time counts.',
        ],
        correctOption: 0,
        explanation:
          'A draft that takes long to verify may save little. The honest measure includes the ' +
          'checking.',
      },
      {
        id: 'policy-content',
        prompt: 'Which item belongs in a team policy on AI use?',
        options: [
          'A ban on talking about AI at work.',
          'A promise that approved tools need no checking.',
          'The name of the most popular tool this year.',
          'What data must never be entered into AI tools.',
        ],
        correctOption: 3,
        explanation:
          'A useful policy covers approved tools, forbidden data, review, disclosure and how to ' +
          'report problems.',
      },
      {
        id: 'ranking-candidates',
        prompt: 'A tool offers to rank job applicants for you. What is the right approach?',
        options: [
          'Use the ranking as the decision, since software is neutral.',
          'Keep the decision with a person who can explain it, and check outcomes for bias.',
          'Use it only for applicants you have not met.',
          'Hide the use of the tool from applicants.',
        ],
        correctOption: 1,
        explanation:
          'Tools can repeat bias and cannot reliably explain their reasoning. Decisions about ' +
          'people need a person who can explain and answer for them.',
      },
      {
        id: 'staff-worries',
        prompt: 'Staff ask whether AI will change their jobs. What is the best response?',
        options: [
          'Promise that nothing will change.',
          'Say nothing until the plans are final.',
          'Explain which tasks may change, why, and what support they will have.',
          'Tell them it is not their concern.',
        ],
        correctOption: 2,
        explanation:
          'Open, specific answers without promises you cannot keep build the trust a change ' +
          'needs.',
      },
    ],
  },
} satisfies DemoCourse;
