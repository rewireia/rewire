/** English messages of the journey: home, report, plan, course and payment. */
export const journeyEn = {
  'report.visual.tasksLabel': 'Occupation tasks',
  'report.visual.selectorLabel': 'Show distribution of',
  'report.visual.distributionCaption': 'Number of tasks in each exposure band.',
  'report.visual.compareTitle': 'Your week and the occupation',
  'report.visual.compareCaption':
    'Your week uses your task weights. The occupation mean covers the whole group. Scores out of 100.',
  'report.visual.weekLabel': 'Your week',
  'report.visual.occupationLabel': 'Occupation mean',
  'report.visual.noWeek': 'No time assigned',
  'report.visual.tasksTotal': 'Official tasks',
  'report.visual.tasksYours': 'Tasks in your week',
  'report.visual.tasksReviewed': 'Tasks reviewed by experts',
  'report.visual.tasksTitle': 'Tasks with the highest exposure',
  'report.visual.tasksCaption': 'Technical exposure score out of 100 for tasks in this occupation.',

  'home.welcome.businessTitle': 'Your courses, connected.',
  'home.welcome.businessBody':
    'Manage your training, set your agent’s rules and follow each purchase.',
  'home.welcome.dashboard': 'Open my dashboard',
  'home.entry.title': 'Your demo access',
  'home.entry.learner': 'Opening the shared learner account.',
  'home.entry.business': 'Opening the course provider account.',
  'home.entry.preparing': 'Preparing your demo access…',
  'home.entry.note': 'This is a shared demonstration account.',
  'home.entry.success': 'You are signed in',
  'home.entry.failed': 'We could not sign you in.',
  'gate.eyebrow': 'Your location',
  'home.entry.retry': 'Try signing in again',
  'home.welcome.eyebrow': 'Welcome',
  'home.welcome.title': 'Rewire your skills.',
  'home.welcome.body': 'Understand how AI changes your work. Find the training for your next step.',
  'home.welcome.start': 'Start',
  'home.region.facts':
    '{classification}, published by {publisher}: {occupations} occupations and {titles} job titles, in {languages}.',
  'home.choice.eyebrow': 'Choose your path',
  'home.choice.title': 'The world is changing. Rewire your skills.',
  'home.choice.label': 'Choose how to enter',
  'home.choice.learner': 'Individual',
  'home.choice.learnerBody': 'Explore your work and learn what comes next',
  'home.choice.business': 'Business',
  'home.choice.businessBody': 'Manage your training catalogue and sales',
  'report.preparing': 'Preparing your task-by-task exposure report',
  'report.profileLoading': 'Reading the time you assigned to each task',

  'report.plan.title': 'With this information, let’s move on to your training',
  'report.plan.lede': 'Explore your learning plan and ask the agent to find training for you.',
  'report.plan': 'Ask the agent for training tailored to me',
  'report.summary.caveat': 'Exposure describes technical potential, not a prediction of job loss.',
  'report.table.label': 'Task by task, as a table',
  'report.table.bands': 'Bands shown',
  'report.table.none': 'No task falls in the bands chosen.',
  'report.table.col.task': 'Task',
  'report.table.col.score': 'Score',
  'report.table.col.band': 'Band',
  'report.table.col.range': 'Between models',
  'report.table.col.reviewed': 'Expert review',
  'report.table.col.time': 'Your time',
  'report.table.reviewed': 'Reviewed',
  'report.table.notReviewed': 'Not reviewed',
  'labour.title': 'Your labour market',
  'labour.noOccupation':
    'Open this report from your job title to see the employment and pay of your occupation in your region.',
  'labour.scope.own': 'your occupation',
  'labour.scope.group': 'the wider group “{group}”, because the source publishes nothing finer',
  'labour.employment.label': 'Employment',
  'labour.employment.people': 'People in employment in {scope}, {period}.',
  'labour.employment.jobs':
    'Jobs in {scope}, {period}. It counts jobs, not people: someone with two jobs counts twice.',
  'labour.employment.none':
    'Employment data for this occupation is not available in the sources used here.',
  'labour.pay.median-annual': 'Median annual pay',
  'labour.pay.mean-monthly': 'Mean monthly earnings',
  'labour.pay.median-annual.sentence':
    'The median annual pay of {scope}, {period}: half earn more and half earn less.',
  'labour.pay.mean-monthly.sentence':
    'The mean monthly earnings of {scope}, {period}. A mean is pulled up by the highest earners, so it is not comparable with a median.',
  'labour.pay.none': 'Pay data for this occupation is not available in the sources used here.',
  'labour.population': 'Who is counted: {population}.',
  'explain.title': 'In plain words',
  'explain.lede': 'Rex can write this report out in a few paragraphs, from its own figures.',
  'explain.button': 'Explain my report',
  'explain.thinking': 'Rex is writing',
  'explain.label': 'Written by an AI model',
  'explain.task': 'task {number} · {score} of 100',
  'explain.note':
    'Written by an AI model, in words only: the numbers beside it are the report’s own, drawn by {brand}. Exposure is technical potential: it is not a prediction about anyone’s job.',

  'plan.eyebrow': 'Your next step',
  'plan.continuity': 'From your report to your training',
  'plan.lede': 'Answer a few questions. Rex will find three demo courses for your next steps.',
  'plan.toReport': 'Back to the report',
  'plan.focus.chartCaption':
    'ILO task exposure, from 0 to 100. This is technical potential, not a prediction of job loss.',
  'plan.focus.task': 'Task {number}',
  'plan.focus.label': 'What the plan is about',
  'plan.focus.most': 'Where AI can do most',
  'plan.focus.mostLede':
    'The tasks the ILO scores highest in this occupation: learn to put AI to work on them, and to check what it does.',
  'plan.focus.least': 'Where AI can do least',
  'plan.focus.leastLede': 'The tasks the ILO scores lowest in this occupation.',
  'stage.understand': 'Understand',
  'stage.apply': 'Apply',
  'stage.strengthen': 'Review and decide',
  'stage.understand.body': 'What generative AI does, and where it goes wrong.',
  'stage.apply.body': 'Using it on the tasks of your job, safely.',
  'stage.strengthen.body':
    'Reviewing what AI produces, deciding what to use, and answering for the result.',
  'plan.opensElsewhere': '(opens the provider’s site in a new tab)',
  'plan.payLater':
    'PayPal documents {offers} for this amount. Whether you are offered it is PayPal’s decision at checkout.',
  'plan.payLater.offer': '{products} in {country}',
  'course.demo': 'Demo',
  'course.demoNote':
    'This course belongs to a demonstration catalogue. Its lessons are real, but it is not an accredited qualification.',
  'course.hours': '{hours} h',
  'course.lessons': '{count} lessons',
  'course.outcomes': 'You will be able to',
  'level.introductory': 'Introductory',
  'level.intermediate': 'Intermediate',
  'enrolment.none': 'Not enrolled',
  'enrolment.payment-pending': 'Payment under review',
  'enrolment.active': 'Enrolled',
  'enrolment.completed': 'Completed',
  'course.back': 'Back to my learning plan',
  'course.toHome': 'Find your occupation',
  'course.factsTitle': 'About the course',
  'course.stage': 'Step',
  'course.level': 'Level',
  'course.length': 'Length',
  'course.enrolledTitle': 'You are enrolled',
  'course.enrolledNote': 'Your lessons, the practice and the quiz are waiting where you left them.',
  'course.continue': 'Continue the course',
  'course.pendingNote': 'PayPal is reviewing your payment. Your course opens as soon as it clears.',
  'course.payTitle': 'Pay with PayPal',
  'course.priceNote': 'The price is set by {brand}’s server, in the currency of your region.',
  'course.refundNote':
    'Full refund within {days} days of payment, as long as you have not completed the course.',
  'course.browserNote':
    'Courses and progress belong to the shared Demo account. Sign in from any browser to continue.',
  'course.noPayments': 'This server has no PayPal credentials, so nothing can be bought here.',
  'checkout.loading': 'Loading PayPal',
  'checkout.failedToLoad': 'PayPal could not be loaded. Check your connection and try again.',
  'checkout.notEligible': 'PayPal cannot take this payment from here.',
  'checkout.nothingCharged': 'Nothing is charged until you approve it in PayPal.',
  'checkout.capturing': 'Confirming your payment with PayPal',
  'checkout.cancelled': 'You closed PayPal before approving. Nothing was charged.',
  'checkout.error': 'PayPal could not complete the payment. Nothing was charged. Please try again.',
  'checkout.outcome.completed': 'Payment received. Your course is open.',
  'checkout.outcome.held':
    'PayPal is reviewing this payment. Your course opens as soon as it clears.',
  'checkout.outcome.review':
    'PayPal answered, but {brand} could not confirm this payment yet. Your course stays reserved while it is checked; your dashboard shows how it stands. Do not pay again.',
  'checkout.outcome.failed': 'The payment did not go through. Nothing was charged.',
  'checkout.outcome.mismatch':
    'The payment did not match the order, so the course was not opened. The money goes back to your PayPal account; your dashboard shows when it has.',
  'checkout.outcome.not-approved':
    'PayPal has not received your approval yet. Nothing was charged.',
  'checkout.outcome.refunded': 'This payment has been refunded.',
  'checkout.orderNumber': 'Order number',
  'sponsor.title': 'Ask my employer to pay',
  'sponsor.lede':
    '{brand} sends your employer a PayPal invoice for this course. The course opens when they pay it.',
  'sponsor.email': 'Your employer’s email',
  'sponsor.name': 'Company name (optional)',
  'sponsor.submit': 'Send the invoice',
  'sponsor.sending': 'Sending',
  'sponsor.sent': 'Invoice {number} is on its way to your employer.',
  'sponsor.statusLabel': 'Status',
  'sponsor.status.sent': 'Sent, not paid yet',
  'sponsor.status.paid': 'Paid',
  'sponsor.status.review': 'Payment under review',
  'sponsor.status.cancelled': 'Cancelled',
  'sponsor.pay': 'Open the invoice',

  'problem.payments_unavailable':
    'This server has no PayPal credentials, so nothing can be bought here.',
  'problem.already_enrolled':
    'You are already enrolled in this course. Continue it from your dashboard.',
  'problem.payment_pending':
    'A payment for this course is already under review at PayPal. Your course opens as soon as it clears.',
  'problem.payment_in_progress':
    'Another payment for this course is being completed right now. Wait a few minutes and try again: you will not be charged twice.',
  'problem.payment_provider_error':
    'PayPal could not complete the request. Nothing was charged. Please try again in a moment.',
  'problem.refund_in_progress':
    'A refund of this payment has already been requested. PayPal is completing it; check again in a few minutes.',
  'problem.refund_not_allowed':
    'This payment can no longer be refunded: the course is completed or the refund period is over.',
  'problem.no_session':
    'This browser has no {brand} session yet. Confirm your occupation or start from a course page.',
  'problem.lessons_incomplete': 'Complete every lesson of the course before taking its quiz.',
  'problem.course_not_completed': 'Pass the quiz of the course to receive its certificate.',
  'problem.guide_unavailable':
    'The AI model is not set up on this server. Everything else works without it.',
  'problem.guide_busy': 'The AI model is answering other people right now. Try again in a moment.',
  'problem.analyst_busy':
    'The analyst is still working on your last request. Wait for it to finish, then ask again.',
  'problem.guide_budget_spent':
    'The AI model has answered all it can for today. It will be back tomorrow; the rest of {brand} works as usual.',
  'problem.guide_refused': 'The AI model could not answer that. Try asking in another way.',
  'problem.guide_truncated': 'The AI model did not finish its answer. Please ask again.',
  'problem.explanation_failed_check':
    'What Rex wrote did not match the figures of your report, so it is not shown. The report above is complete without it.',
  'problem.invalid_input': 'Something in the form is not valid. Check it and try again.',
  'problem.not_found':
    '{brand} could not find what you asked for. It may have moved or never existed.',
  'problem.invoice_pending':
    'Your employer has an open invoice for this course. Cancel that request in your dashboard before paying yourself.',
  'problem.invoice_not_open':
    'This request was already paid or cancelled, so there is nothing to cancel. The table now shows how it stands.',
  'problem.invoice_unconfirmed':
    'PayPal has not confirmed this invoice yet, so it cannot be cancelled for now. Try again in a few minutes.',
  'problem.certificate_unavailable':
    'The certificate could not be issued just now. Your course is complete: please try again in a moment.',
  'problem.invalid_json':
    '{brand} could not read what this page sent. Reload the page and try again.',
  'problem.toDashboard': 'Go to my dashboard',
} as const;

export type JourneyCatalogue = Readonly<Record<keyof typeof journeyEn, string>>;
