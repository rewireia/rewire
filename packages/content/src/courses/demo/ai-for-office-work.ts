import type { DemoCourse } from '../../schema/course.ts';

export const AI_FOR_OFFICE_WORK = {
  id: 'ai-for-office-work',
  title: 'AI for office work: correspondence, documents and records',
  summary:
    'For clerical and administrative jobs. It shows how to use AI to draft messages, sum up ' +
    'documents and tidy data, and how to keep records accurate and private while doing so.',
  stage: 'apply',
  majorGroups: ['4'],
  level: 'introductory',
  hours: 2,
  outcomes: [
    'Draft routine correspondence with AI and check it before it goes out.',
    'Summarise documents and extract data with AI, and verify the result against the source.',
    'Keep personal and confidential records out of tools that are not approved for them.',
  ],
  prices: { USD: 4900, GBP: 3900, EUR: 4500 },
  lessons: [
    {
      id: 'correspondence',
      title: 'Drafting messages and replies',
      minutes: 35,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'Much office work is writing: replies to enquiries, reminders, appointment letters and',
            'notices. An AI tool can produce a clear first draft in seconds if you tell it who the',
            'reader is, what the message must achieve and which facts it must contain. The more',
            'precise your request, the less you will need to rewrite.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'State the reader and the tone: a customer, a supplier, a colleague.',
            'Give the facts yourself, such as dates, amounts and reference numbers.',
            'Say what to leave out, for example promises your organisation cannot make.',
            'Ask for a short version first; it is easier to add than to cut.',
          ],
        },
        {
          type: 'paragraph',
          text: [
            'Before sending, read the draft as the recipient would. Check that every date, amount',
            'and name matches your records, because the tool may fill a gap with a plausible',
            'invention. Check that the message does not commit your organisation to anything, such',
            'as a refund or a deadline, that nobody has agreed to. Then adjust the wording so that',
            'it sounds like your office and not like a template.',
          ].join(' '),
        },
        {
          type: 'key-point',
          text: 'Give the tool the facts; never let it supply them. Check every detail before sending.',
        },
      ],
    },
    {
      id: 'documents-and-data',
      title: 'Summarising documents and handling data',
      minutes: 40,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'AI tools can summarise a long document, list the actions in meeting notes or pull',
            'names and amounts out of a set of forms. This saves time, but a summary can drop a',
            'condition that matters, and an extraction can misread a figure or swap two fields.',
            'The output looks tidy either way, so its neatness is no proof that it is right.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'Treat any summary as a guide to the document, not a replacement for it. When a decision',
            'depends on a clause, a deadline or a figure, find it in the original and read it there.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Compare a sample of extracted rows with the source documents.',
            'Recalculate any total the tool reports; do not accept it as given.',
            'Check spreadsheet formulas the tool writes on a few rows you can work out by hand.',
            'Keep the original files, so that anyone can trace a figure back to where it came from.',
          ],
        },
        {
          type: 'key-point',
          text: 'A neat table can still hold a wrong number. Check samples and totals against the source.',
        },
      ],
    },
    {
      id: 'records-and-privacy',
      title: 'Keeping records accurate and private',
      minutes: 35,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'Office staff often look after personal data: names, addresses, account details, health',
            'or employment records. Putting that data into an AI tool is a decision about where it',
            'goes and who may see it. Many organisations allow only certain approved tools, and some',
            'allow none for personal data. Follow that policy, and ask when it is unclear.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Use made-up or anonymised examples when you only need help with wording or layout.',
            'Never paste passwords, bank details or identity numbers.',
            'Do not copy AI output into an official record until you have checked it.',
          ],
        },
        {
          type: 'paragraph',
          text: [
            'Records are trusted because someone checked them. If an AI tool helped you prepare an',
            'entry, you are still the person vouching for it, so keep the same standard you would',
            'apply to your own typing. When a record turns out to be wrong, correct it and tell the',
            'people who rely on it, as you would with any other error.',
          ].join(' '),
        },
        {
          type: 'key-point',
          text: 'Personal data goes only into approved tools. A record is yours once you enter it.',
        },
      ],
    },
  ],
  practice: {
    title: 'Speed up one office task without losing accuracy',
    instructions: [
      'Take the task you chose and pick one real piece of work it involves, such as a reply, a',
      'summary or a data entry. Replace any personal or confidential details with invented ones.',
      'Ask an approved AI tool for a draft, giving it the facts it needs. Check every date, amount,',
      'name and commitment against your own records and correct the draft. Note how long it took',
      'compared with doing it alone, and which checks you would always repeat.',
    ].join(' '),
  },
  quiz: {
    passMark: 4,
    questions: [
      {
        id: 'missing-fact',
        prompt: 'You ask for a payment reminder but forget to give the amount. What is the risk?',
        options: [
          'The tool will refuse to write a reminder without an amount.',
          'The reminder will be too formal.',
          'The tool may fill the gap with a plausible but wrong amount.',
          'The reminder will be sent automatically.',
        ],
        correctOption: 2,
        explanation:
          'When a fact is missing, a generative tool tends to fill the gap with something that ' +
          'looks right. Give the facts yourself.',
      },
      {
        id: 'summary-decision',
        prompt: 'A summary says a contract can be cancelled at any time. What should you do?',
        options: [
          'Find the cancellation clause in the contract and read it before relying on it.',
          'Rely on the summary, since summaries keep the key points.',
          'Ask the tool for a second summary and compare the two.',
          'Forward the summary to the customer.',
        ],
        correctOption: 0,
        explanation:
          'A summary can drop a condition. When a decision depends on a clause, read it in the ' +
          'original document.',
      },
      {
        id: 'total-check',
        prompt:
          'An AI tool has extracted 200 invoice amounts and reports their total. Which check is best?',
        options: [
          'None, because software adds up correctly.',
          'Read the list quickly to see that it looks tidy.',
          'Ask the tool to confirm the total.',
          'Recalculate the total yourself and compare a sample of rows with the invoices.',
        ],
        correctOption: 3,
        explanation:
          'Extraction can misread figures and generated totals can be wrong. Recalculating and ' +
          'sampling against the source catches both.',
      },
      {
        id: 'layout-help',
        prompt:
          'You only need help with the layout of a letter to a patient. What should you share?',
        options: [
          'The real letter, so the layout fits exactly.',
          'A version with invented names and details.',
          'The patient’s file, for context.',
          'Nothing; AI cannot help with layout.',
        ],
        correctOption: 1,
        explanation:
          'Layout does not need real personal data. An anonymised or invented example gives the ' +
          'same help without the risk.',
      },
      {
        id: 'wrong-record',
        prompt: 'You find that an entry you prepared with AI help is wrong. What do you do?',
        options: [
          'Leave it, since the tool made the mistake.',
          'Delete the entry without telling anyone.',
          'Correct it and tell the people who rely on it.',
          'Report the fault to the maker of the tool and wait until they fix it.',
        ],
        correctOption: 2,
        explanation:
          'You vouched for the entry when you made it, so you correct it as you would any other ' +
          'error, and you tell those who use it.',
      },
    ],
  },
} satisfies DemoCourse;
