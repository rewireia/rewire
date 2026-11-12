/**
 * English messages of the reading pages: what Rewire is, and the guide to generative AI.
 * A link inside a paragraph of the guide is written `[words](https://…)`.
 */
export const pagesEn = {
  'about.eyebrow': 'What is {brand}',
  'about.slogan': 'Work is changing. Rewire your skills.',
  'about.lede':
    '{brand} shows which tasks of your job generative AI could do, according to the International Labour Organization, and turns that into a plan to learn with real courses.',
  'about.who.title': 'Who it is for',
  'about.who.body':
    'It is for adults in work in the European Union, the United States or the United Kingdom who want to know how generative AI touches their own job, without reading research papers. Employers and course providers have a workspace of their own.',
  'about.problem.title': 'What it solves',
  'about.problem.body':
    'Most of what is said about AI and jobs is either alarm or promise, and little of it is about your own tasks. {brand} starts from published evidence: the ILO scores the tasks of each occupation, and {brand} shows those scores for the tasks you confirm, weighed by your own week. It does not predict that a job will be lost; it shows where learning will help first.',
  'about.journey.title': 'The whole journey',
  'about.journey.1.title': 'Your work',
  'about.journey.1.body':
    'Describe what you do or type your job title, and {brand} finds it among the official occupations of your region.',
  'about.journey.2.title': 'Your tasks',
  'about.journey.2.body':
    'You confirm which tasks of that occupation are part of your work and how much of your week each one takes.',
  'about.journey.3.title': 'Your exposure report',
  'about.journey.3.body':
    'Each task carries its ILO exposure score, and your week is weighed into one figure you can read task by task.',
  'about.journey.4.title': 'Your plan',
  'about.journey.4.body':
    'From the report, {brand} proposes what to learn first: three real courses that fit your tasks and your weekly time.',
  'about.journey.5.title': 'Real courses',
  'about.journey.5.body':
    'The catalogue lists real courses from their providers, each with a link to its page. The price you see is a sandbox price of this marketplace; to enrol for real, you go to the provider.',
  'about.journey.6.title': 'Your wallet and PayPal Sandbox',
  'about.journey.6.body':
    'You top up your wallet and pay with PayPal Sandbox, which uses test money: no real money moves. Nothing is paid until you approve it in PayPal, and an AI agent cannot approve it for you.',
  'about.journey.7.title': 'Learn',
  'about.journey.7.body':
    'Your courses, progress, payments and refunds stay together in your dashboard, and the business workspace shows the matching sales.',

  'primer.eyebrow': 'A guide for everyone',
  'primer.title': 'What is AI, and what does it mean for your work?',
  'primer.lede':
    'A plain guide to generative AI for anyone who has just read their report: how it writes, what it does well, where it fails and how to work with it.',
  'primer.minutes': 'About {minutes} minutes of reading',
  'primer.contents': 'On this page',

  'primer.what.title': 'What generative AI is',
  'primer.what.1':
    'Generative AI is software that produces new text, images, sound or code in answer to a request written in ordinary language. The tools most people meet at work, chat assistants among them, are built on large language models: programs trained on enormous collections of text to continue any text they are given.',
  'primer.what.2':
    'They are useful because they handle language, and language is how much of working life gets done. Writing an email, summarising a report, drafting a procedure or turning notes into a table are all tasks made of words, and a language model can attempt each of them in seconds.',
  'primer.what.3':
    'They are not a search engine and not an encyclopaedia. Understanding that difference is the most useful thing you can learn about them, because it explains both what they do well and where they go wrong.',
  'primer.what.4':
    'You may meet generative AI without choosing it. It drafts replies in email programs, suggests text in word processors, summarises meetings in video calls and answers questions on the websites of shops, banks and public services. Knowing how it works helps you judge its output wherever it turns up, not only in a chat window.',

  'primer.how.title': 'How it writes',
  'primer.how.1':
    'A language model writes one small piece at a time. It reads your request, works out which piece of text is most likely to come next, adds it, and repeats until the answer is complete. Those pieces, called tokens, are whole words or parts of words.',
  'primer.how.2':
    'The model learnt what is likely during its training, by reading a vast amount of text and adjusting itself until it could predict well how texts go on. What it keeps is not a list of facts but patterns: which words go together, how an argument is usually built, what a polite reply to a complaint sounds like.',
  'primer.how.3':
    'This is why it can write fluently about almost anything, and also why fluency is no proof of truth. When it answers a question, it does not look the answer up in a base of checked facts; it produces the text that best fits the pattern of the question. Some tools add a web search or read the documents you give them, which helps, but the writing itself still works by prediction.',
  'primer.how.4':
    'There is also a measure of chance in it. At each step the tool does not always take the single most likely piece: it often picks among several likely ones, so that the writing sounds natural. That is why the same request can bring a different answer each time, and why a model can be right on one attempt and wrong on the next.',
  'primer.diagram.title': 'How a language model writes, one piece at a time',
  'primer.diagram.request': 'Your request',
  'primer.diagram.prompt': 'Please draft a reply to the',
  'primer.diagram.model': 'Language model',
  'primer.diagram.patterns': 'patterns learnt from text',
  'primer.diagram.candidates': 'Likely next words',
  'primer.diagram.word1': 'customer',
  'primer.diagram.word2': 'client',
  'primer.diagram.word3': 'email',
  'primer.diagram.chosen': 'One is chosen and added',
  'primer.diagram.repeat': 'and the step repeats',
  'primer.diagram.caption':
    'A simplified view. The model weighs possible next words, one of them is added to the text, and the step repeats until the answer ends. The lengths of the bars are illustrative, not measured.',

  'primer.good.title': 'What it does well',
  'primer.good.1':
    'Generative AI is at its best with tasks where a quick first version is valuable and a person can check the result: drafting and rewording text, summarising long documents, translating, suggesting a structure, explaining an idea in simpler words, writing or reviewing small pieces of code, and turning loose notes into a tidy format.',
  'primer.good.2':
    'It is also patient. You can ask the same question several times, in different words, and it does not tire. For someone learning a new subject or preparing a difficult conversation, that makes it a useful partner for practice.',
  'primer.good.3':
    'In each of these cases the value comes from speed on the first version. The judgement about whether the result is right, appropriate and complete stays with the person who uses it.',
  'primer.good.4':
    'It helps most when you already know the subject well enough to judge the result. A payroll clerk who asks for a draft letter about a change of pay can see at once whether the letter is right. Someone who asks about a rule they have never read cannot, and that is where its fluent mistakes do the most harm.',

  'primer.fails.title': 'Where it fails',
  'primer.fails.1':
    'The best-known failure has a name: hallucination. A model hallucinates when it produces text that is fluent, confident and false, such as a date that never happened, a rule that does not say what it claims, a quotation nobody wrote, or a reference to an article, a court case or a web page that does not exist. Because the model predicts plausible text instead of retrieving facts, an invented citation can look exactly like a real one.',
  'primer.fails.2':
    'Models also carry bias. They learn from text written by people, with the imbalances that text contains, and they can repeat stereotypes about jobs, genders, ages or origins, or describe one group more favourably than another. When a model helps with decisions about people, such as sorting job applications, those patterns matter.',
  'primer.fails.3':
    'Their knowledge has a date. A model is trained on text gathered up to a certain moment, called its training cut-off, and knows nothing of what came after unless the tool adds a search. It may present old prices, old rules or old versions of software as if they were current, and it will rarely say that it does not know.',
  'primer.fails.4':
    'They are not consistent. The same question asked twice can bring two different answers, and a small change of wording can change the conclusion. A single answer is one draw among many possible ones, not a settled position.',
  'primer.fails.5':
    'Finally, what you type goes somewhere. A request sent to an online AI tool is processed on its provider’s servers and, depending on the service and its settings, may be stored or used to improve the model. Before you paste a client’s details, a colleague’s personal data or a confidential document, check what your employer allows and what the provider’s terms say.',
  'primer.fails.6':
    'One more habit deserves attention: models tend to agree with the person asking. If a question already suggests an answer, the model is likely to support it, and if you push back on a correct answer it may give way. Asking the same question in a neutral form, or asking it to argue the other side, is a simple way to test how solid an answer is.',

  'primer.exposure.title': 'What “exposure” means in {brand}',
  'primer.exposure.1':
    'Your report uses the word exposure in a precise sense. It comes from an index published by the International Labour Organization, which scores the tasks of each occupation by how much of them generative AI could technically perform. In its [Working Paper 140 of 2025](https://doi.org/10.54394/HETP0387), the ILO gives each task a score from 0 to 1, and it scores the tasks of the 427 occupation groups of the International Standard Classification of Occupations, ISCO-08.',
  'primer.exposure.2':
    'A high score means the technology could do much of a task, not that a job will disappear. Whether a task really changes depends on cost, regulation, how work is organised and the choices of employers and workers. {brand} reads the score as potential: a map of where your work could change first, and so of where learning will help first.',
  'primer.exposure.3':
    '{brand} adds one step of its own. You say how much of your week each task takes, and the ILO’s scores are averaged with those weights. The result is {brand}’s own calculation, not a figure the ILO publishes, and it is not a probability: a week that scores 61 out of 100 does not carry a 61% risk of anything.',
  'primer.exposure.4':
    'Each score in your report also shows the range between the models the ILO used to produce it. A wide range means they disagreed about that task; it is not a margin of error, and it is a good reason to read that task with more care. Your report shows the source of every score, so you can always go back to the evidence.',

  'primer.work.title': 'How to work with it',
  'primer.work.1':
    'Give it context. A model knows only what is in your request and in the documents you share with it. Say who the text is for, what it should achieve, what you already know and what form you need. A request such as “summarise this report for a manager who has two minutes, in five sentences, and point out any figure I should check” brings a far better answer than “summarise this”.',
  'primer.work.2':
    'Check what matters. Treat each answer as a draft from a fast but unreliable assistant. Compare names, figures, dates, quotations and references with the original source before you use them, and open every link it gives you. If it cites a document, find the document.',
  'primer.work.3':
    'Decide yourself. You remain responsible for what you send, sign or publish. Use the model to go faster on the first version, to see options you had not thought of, or to practise; keep for yourself the judgement about what is correct, fair and right for the people involved.',
  'primer.work.4':
    'Use the tools your organisation allows. Many employers choose an AI service with settings that keep what staff write out of the provider’s training, and set rules on what may be shared with it. If there are no rules yet, the safe habit is simple: leave out names, personal details and anything confidential, and say so when a text you hand in was drafted with AI.',

  'primer.next.title': 'Where to go next',
  'primer.next.1':
    'If you have not confirmed your occupation yet, Start takes you through it and gives you your report, task by task. The Library gathers public reports and guides about AI and work from official sources, each with a note on why it may interest you. Courses opens the catalogue, with real courses from their providers.',
} as const;

export type PagesCatalogue = Readonly<Record<keyof typeof pagesEn, string>>;
