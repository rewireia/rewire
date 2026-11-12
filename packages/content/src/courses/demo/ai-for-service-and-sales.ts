import type { DemoCourse } from '../../schema/course.ts';

export const AI_FOR_SERVICE_AND_SALES = {
  id: 'ai-for-service-and-sales',
  title: 'AI for service and sales: answers, messages and customer trust',
  summary:
    'For jobs that serve customers in person, by phone or online. It shows how to use AI to ' +
    'prepare information and messages without passing on errors or customers’ private details.',
  stage: 'apply',
  majorGroups: ['5'],
  level: 'introductory',
  hours: 1.5,
  outcomes: [
    'Prepare product and service information with AI and check it against official sources.',
    'Write clear customer messages with AI that promise only what your business offers.',
    'Protect customers’ personal details and know when to hand a case to a person.',
  ],
  prices: { USD: 3900, GBP: 3200, EUR: 3600 },
  lessons: [
    {
      id: 'preparing-answers',
      title: 'Preparing answers and product information',
      minutes: 30,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'Customers ask the same questions many times: opening hours, how a product works,',
            'what a service includes. An AI tool can help you prepare clear answers, explain a',
            'feature in simple words or turn a long policy into a short description.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'The risk is that the tool fills gaps with details that sound right. It may give a',
            'price, a size, an ingredient or a return period that is not yours, because it is',
            'drawing on patterns from other businesses. Customers act on what you tell them, so',
            'an invented detail can cost them money or cause harm, for example with allergies.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Give the tool your official information and ask it to use only that.',
            'Check prices, stock, ingredients and conditions against your own records.',
            'Never pass on safety or health information you have not confirmed.',
            'Keep a checked set of answers so you do not need to generate them again.',
          ],
        },
        {
          type: 'key-point',
          text: 'Your official information is the source. Check every detail before a customer hears it.',
        },
      ],
    },
    {
      id: 'customer-messages',
      title: 'Writing messages to customers',
      minutes: 30,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'AI can help you write a polite reply to a complaint, a friendly reminder or a clear',
            'description for an online listing. Tell it the situation, the tone you want and what',
            'you can and cannot offer. A good request saves time, and the result still needs',
            'your reading before it is sent.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'Generated messages tend to be generous with promises: a refund, a discount, a delivery',
            'date. If your business has not agreed to it, take it out. Keep the message honest and',
            'specific, and make sure it sounds like a person from your business, not like a',
            'template. If you are not sure whether an offer is allowed, ask before you send it.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Remove any offer, discount or date nobody has approved.',
            'Make product descriptions accurate rather than impressive.',
            'Read replies to complaints aloud: would you say this to the customer in person?',
          ],
        },
        {
          type: 'key-point',
          text: 'Send only promises your business has made, in words you would say yourself.',
        },
      ],
    },
    {
      id: 'protecting-customers',
      title: 'Protecting customers and knowing when to step in',
      minutes: 30,
      blocks: [
        {
          type: 'paragraph',
          text: [
            'Customer details such as names, phone numbers, addresses, order histories and payment',
            'information are personal data. Do not paste them into an AI tool unless your employer',
            'has approved that tool for customer data. When you only need help with wording, leave',
            'the details out or replace them with invented ones.',
          ].join(' '),
        },
        {
          type: 'paragraph',
          text: [
            'Many businesses now use automated assistants to answer customers. They are useful for',
            'simple questions but can give wrong answers with confidence, or treat some customers',
            'less fairly because of biases in their training. Customers should always be able to',
            'reach a person, so know how to pass a conversation to a colleague without delay.',
          ].join(' '),
        },
        {
          type: 'list',
          items: [
            'Hand a case to a person when the customer is upset, vulnerable or confused.',
            'Step in when money, health, safety or a legal right is involved.',
            'Correct a wrong automated answer quickly and tell the customer what is right.',
          ],
        },
        {
          type: 'key-point',
          text: 'Keep customer data out of unapproved tools, and keep a person within reach.',
        },
      ],
    },
  ],
  practice: {
    title: 'Prepare one customer answer you can trust',
    instructions: [
      'Take the task you chose and think of a question or situation that comes up in it with',
      'customers. Write down the official facts that apply: prices, conditions, policies. Ask an',
      'approved AI tool to draft a reply using only those facts, with no customer details. Check',
      'the draft line by line, remove anything promised that you cannot offer, and rewrite it in',
      'your own voice. Keep the checked version for next time.',
    ].join(' '),
  },
  quiz: {
    passMark: 4,
    questions: [
      {
        id: 'allergy-question',
        prompt:
          'A customer asks whether a dish contains nuts. An AI tool says it does not. What do you do?',
        options: [
          'Tell the customer it is nut-free, as the tool said.',
          'Check the recipe or the official allergen information before answering.',
          'Ask the tool again to make sure.',
          'Tell the customer to ask the tool directly.',
        ],
        correctOption: 1,
        explanation:
          'The tool may invent details. Health and safety information must come from your own ' +
          'confirmed records.',
      },
      {
        id: 'unapproved-offer',
        prompt:
          'An AI draft of a reply to a complaint offers a 20% discount. Nobody approved it. What now?',
        options: [
          'Remove the offer before sending.',
          'Send it, since the customer will be pleased.',
          'Send it but halve the discount.',
          'Ask the customer whether they want the discount.',
        ],
        correctOption: 0,
        explanation:
          'Only promises your business has made should go out. Generated drafts often add ' +
          'offers nobody agreed to.',
      },
      {
        id: 'wording-help',
        prompt:
          'You want help wording a delivery update. What should you leave out of your request?',
        options: [
          'The tone you want.',
          'The new delivery date.',
          'That the message is for a customer.',
          'The customer’s name, address and phone number.',
        ],
        correctOption: 3,
        explanation:
          'Wording does not need personal data. Leave it out unless the tool is approved for ' +
          'customer details.',
      },
      {
        id: 'hand-over',
        prompt: 'When should an automated assistant hand a customer over to a person?',
        options: [
          'Only when the customer asks three times.',
          'Never, if the assistant is working.',
          'When the customer is upset or a legal right, money or safety is involved.',
          'Only at the end of the day, when staff review the queue.',
        ],
        correctOption: 2,
        explanation:
          'People need a person when the stakes are high or they are struggling. Automated ' +
          'answers can be wrong with confidence.',
      },
      {
        id: 'listing',
        prompt: 'What makes an AI-written product listing acceptable?',
        options: [
          'It is long and enthusiastic.',
          'It is accurate in every detail you checked.',
          'It copies the wording of a best-selling competitor’s listing.',
          'It was written in seconds.',
        ],
        correctOption: 1,
        explanation: 'Customers act on what a listing says, so accuracy matters more than style.',
      },
    ],
  },
} satisfies DemoCourse;
