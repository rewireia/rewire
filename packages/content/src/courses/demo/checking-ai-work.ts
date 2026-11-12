import type { DemoCourse } from '../../schema/course.ts';

export const CHECKING_AI_WORK = {
  id: 'checking-ai-work',
  title: 'Checking AI work: review, decide and answer for the result',
  summary:
    'For any job. It builds the skills that stay with people when AI drafts more of the work: ' +
    'checking output methodically, spotting bias and gaps, and taking responsibility for decisions.',
  stage: 'strengthen',
  majorGroups: [],
  level: 'intermediate',
  hours: 2,
  outcomes: [
    'Review AI output with a repeatable method that catches false claims and missing parts.',
    'Spot bias and gaps in AI output that affects people, and correct them.',
    'Make and explain the final decision, and respond well when an error gets through.',
  ],
  prices: { USD: 5900, GBP: 4900, EUR: 5500 },
  lessons: [
    {
      id: 'review-method',
      title: 'A method for checking AI output',
      minutes: 40,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'Reading a fluent draft and finding nothing wrong is not the same as checking it. Errors',
            'in AI output are easy to miss because they are written in the same confident style as',
            'everything else. A fixed method helps you look for them on purpose rather than by luck.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Purpose: does the output answer the actual question, for the actual reader?',
            'Claims: mark every statement of fact and confirm the ones that matter.',
            'Sources: open each reference and check that it exists and says what is claimed.',
            'Numbers: recalculate totals, percentages and dates.',
            'Omissions: ask what a careful expert would expect to see that is missing.',
          ],
        },
        {
          type: 'paragraph',
          text: [
            'Scale the effort to the stakes. An internal note needs a quick pass; anything that',
            'reaches customers, affects someone’s money, health or rights, or carries your',
            'signature needs every step. When time is short, check the claims that would cause',
            'the most harm if they were wrong, and say clearly what remains unchecked.',
          ].join(' '),
        },
        {
          type: 'key-point',
          text: 'Check on purpose: purpose, claims, sources, numbers and what is missing.',
        },
      ],
    },
    {
      id: 'bias-and-gaps',
      title: 'Spotting bias and gaps',
      minutes: 40,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'AI tools learn from large amounts of human writing, and that writing contains',
            'stereotypes and blind spots. The result can be subtle: examples that always describe',
            'managers as men, advice that assumes everyone has the same resources, or summaries',
            'that leave out the views of a smaller group.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'Gaps matter as much as bias. A tool answers what you asked, so it may say nothing about',
            'an exception, a local rule or a risk you did not mention. It rarely tells you that the',
            'question itself was incomplete.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Swap a detail about a person, such as gender, age or origin, and see if the output changes.',
            'Ask who is affected by the work and whether each group is fairly represented.',
            'Ask what local rules, exceptions or risks apply that the output does not mention.',
            'Invite someone with a different viewpoint to read important work.',
          ],
        },
        {
          type: 'key-point',
          text: 'Look for unequal treatment and for what was never said. Both can cause harm.',
        },
      ],
    },
    {
      id: 'deciding-and-responding',
      title: 'Deciding, signing and responding',
      minutes: 40,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'AI can draft options, but someone has to choose between them and answer for the',
            'choice. That person needs to understand the reasons well enough to explain them to',
            'the people affected, without saying that the tool decided. If you cannot explain a',
            'decision in your own words, you are not ready to make it.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'Errors will sometimes get through, however careful the review. What matters then is',
            'the response, and it follows the same steps as for any other mistake.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Correct the error and tell the people who relied on the work.',
            'Find which check would have caught it, and add it to your method.',
            'Report the problem through your organisation’s usual channel.',
          ],
        },
        {
          type: 'paragraph',
          text: [
            'Reviewing, deciding and responding to people are the parts of the work that stay',
            'yours as AI drafts more of the rest. They are skills, and they improve with practice.',
          ].join(' '),
        },
        {
          type: 'key-point',
          text: 'Decide only what you can explain. When an error gets through, correct it and learn.',
        },
      ],
    },
  ],
  practice: {
    title: 'Review one AI-assisted piece of your own work',
    instructions: [
      'Take the task you chose and produce one piece of its work with an approved AI tool, sharing',
      'no personal or confidential data. Review the result with the five checks from this course:',
      'purpose, claims, sources, numbers and omissions. Then run the bias and gap checks if it',
      'concerns people. Write the final version, a short explanation of the decision it supports in',
      'your own words, and the one check you will add to your routine.',
    ].join(' '),
  },
  quiz: {
    passMark: 4,
    questions: [
      {
        id: 'nothing-wrong',
        prompt: 'You read an AI draft and nothing looks wrong. Have you checked it?',
        options: [
          'Yes, if you read it carefully from start to finish.',
          'Yes, because fluent text is usually correct.',
          'Not yet: you need to confirm its claims, sources and numbers on purpose.',
          'Only if a colleague also read it.',
        ],
        correctOption: 2,
        explanation:
          'Errors in AI output look like the rest of the text. Checking means confirming claims, ' +
          'sources and numbers deliberately.',
      },
      {
        id: 'short-time',
        prompt:
          'You have ten minutes to review a long AI-drafted text. What is the best use of the time?',
        options: [
          'Check the claims that would cause most harm if wrong, and say what is unchecked.',
          'Fix the spelling.',
          'Skim it all once.',
          'Ask the tool to review its own work.',
        ],
        correctOption: 0,
        explanation:
          'With limited time, focus on the highest-stakes claims and be open about what was not ' +
          'verified.',
      },
      {
        id: 'swap-test',
        prompt: 'What does it suggest if changing a person’s age changes the AI’s recommendation?',
        options: [
          'That the tool is working as designed.',
          'That the output may treat people unequally and needs review.',
          'That age should always be included.',
          'Nothing; it is random noise.',
        ],
        correctOption: 1,
        explanation:
          'If an irrelevant detail about a person changes the result, the output may be biased ' +
          'and needs correcting.',
      },
      {
        id: 'explain-decision',
        prompt: 'When are you ready to make a decision that an AI tool helped prepare?',
        options: [
          'When the tool rates its own answer highly.',
          'When the decision is urgent.',
          'When two tools agree.',
          'When you can explain the reasons in your own words to the people affected.',
        ],
        correctOption: 3,
        explanation:
          'The person who decides must be able to explain and answer for the decision without ' +
          'pointing to the tool.',
      },
      {
        id: 'error-through',
        prompt: 'An error in AI-assisted work reached a customer. What comes first?',
        options: [
          'Blame the tool in your reply.',
          'Correct the error and tell the customer.',
          'Stop using AI altogether.',
          'Wait to see whether the customer notices.',
        ],
        correctOption: 1,
        explanation:
          'Fix it and tell those affected, then find the check that would have caught it. The ' +
          'same steps apply to any mistake.',
      },
    ],
  },
} satisfies DemoCourse;
