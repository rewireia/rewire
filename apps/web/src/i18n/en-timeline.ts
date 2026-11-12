/** English messages of "Your plan in time", the learning plan laid out on a chart. */
export const timelineEn = {
  'timeline.title': 'Your plan in time',
  'timeline.dashboardTitle': 'My plan in time',
  'timeline.toPlan': 'Open the learning plan',
  'timeline.view': 'Show the plan as',
  'timeline.view.timeline': 'Timeline',
  'timeline.view.list': 'List',
  'timeline.scale': 'Scale of the chart',
  'timeline.scale.fit': 'Fit',
  'timeline.scale.weeks': 'Weeks',
  'timeline.scale.months': 'Months',
  'timeline.lede':
    '{brand} lays the courses of this plan out one after another, at the hours you give them each week.',
  'timeline.chartHint':
    'Drag a course to start it later, stretch one whose length is not published, or untick “In plan” to leave it out.',
  'timeline.pace': 'Hours a week',
  'timeline.paceOption': '{hours} h',
  'timeline.start': 'Start',
  'timeline.reset': 'Reset',
  'timeline.resetHint': 'Puts every course back in the plan, in its place and length.',
  'timeline.saving': 'Saving your plan…',
  'timeline.saveFailed': 'Your last change was not saved, so the chart shows the plan as it was.',
  'timeline.chartLabel': 'The courses of your plan in time',

  'timeline.summary.finishes': 'At {hours} hours a week you finish on {date}.',
  'timeline.summary.empty':
    'Every course is out of the plan, so it has no end date. Tick “In plan” to bring one back.',
  'timeline.summary.known': 'The courses in the plan publish {hours} hours in all.',
  'timeline.unbooked.one':
    'One course does not publish its length: {brand} books {length} for it until you say.',
  'timeline.unbooked.other':
    '{count} courses do not publish their length: {brand} books {length} for each until you say.',
  'timeline.length.week': 'a week',
  'timeline.length.days': '{days} days',

  'timeline.column.course': 'Course',
  'timeline.column.hours': 'Hours',
  'timeline.column.inPlan': 'In plan',
  'timeline.hours': '{hours} h',
  'timeline.noLength': 'Its provider does not publish a length.',
  'timeline.inPlanLabel': 'In the plan',

  'timeline.list.lede':
    'Each course can be moved, given a length or left out from here, with the keyboard too. Leave “Start no earlier than” empty and the course starts when the one before it ends.',
  'timeline.list.outOfPlan': 'Out of the plan',
  'timeline.list.noLength': 'Length not published',
  'timeline.list.notBefore': 'Start no earlier than',
  'timeline.list.notBeforeHint': 'Leave it empty to start when the course before it ends.',
  'timeline.list.days': 'Days booked',
  'timeline.list.fieldsOf': 'Your choices for “{title}”',

  'timeline.payment.name': 'PayPal · {price}',
  'timeline.payment.due': 'To be paid',
  'timeline.payment.held-by-paypal': 'Held by PayPal for review',
  'timeline.payment.invoice-sent': 'Invoice sent to your employer',
  'timeline.payment.paid': 'Paid',
  'timeline.payment.paidOn': 'Paid on {date}',
  'timeline.payment.refunded': 'Refunded',
  'timeline.payment.short.due': 'To pay',
  'timeline.payment.short.held-by-paypal': 'Held',
  'timeline.payment.short.invoice-sent': 'Invoice sent',
  'timeline.payment.short.paid': 'Paid',
  'timeline.payment.short.refunded': 'Refunded',
  'timeline.payment.action.due': 'Pay for it',
  'timeline.payment.action.held-by-paypal': 'See the payment',
  'timeline.payment.action.invoice-sent': 'See the request',
  'timeline.payment.action.paid': 'Open the course',
  'timeline.payment.action.refunded': 'Pay for it again',
  'timeline.held.label': 'Waiting for payment',
  'timeline.held.waiting':
    'It cannot start until it is paid for: it moves a day later each day until then.',
  'timeline.held.startedWhenPaid': 'It started the day it was paid for.',
  'timeline.summary.held.one':
    'One course waits for its payment, so the plan moves a day later each day until it is paid.',
  'timeline.summary.held.other':
    '{count} courses wait for their payment, so the plan moves a day later each day until they are paid.',
  'timeline.finish': 'You finish here',
  'timeline.stageDone': '{done} of {total} done',
  'timeline.today': 'Today',
  'timeline.ics.button': 'Add to my calendar',
  'timeline.ics.file': 'rewire-plan.ics',
  'timeline.ics.note': 'A course of your {brand} learning plan.',
  'timeline.guide.title': 'Your plan agent: tell me what changed and I will adapt your roadmap.',
  'timeline.guide.input': 'Tell Tempo what changed',
  'timeline.guide.placeholder':
    'For example: I only have two hours a week and cannot start until January',
  'timeline.guide.ideas': 'Changes to ask Tempo for',
  'timeline.guide.off': 'Tempo is not set up on this server, so you change the plan by hand below.',
  'timeline.guide.hours': 'I only have 2 hours a week',
  'timeline.guide.january': 'Start in January',
  'timeline.guide.paid': 'Leave out the paid courses',

  'timeline.bar.demo': 'Demo',
  'timeline.bar.done': 'Done',

  'timeline.tip.dates': '{start} to {end}',
  'timeline.tip.hours': '{hours} hours',
  'timeline.tip.noLength': 'Length not published: you can stretch it.',
  'timeline.tip.moved': 'You moved it.',
  'timeline.tip.progress': '{percent} done',
  'timeline.tip.completed': 'Completed',
  'timeline.tip.free': 'Free, on the provider’s site. {brand} cannot see your progress there.',
  'timeline.tip.paid': 'Demo course of {brand}.',
} as const;

export type TimelineCatalogue = Readonly<Record<keyof typeof timelineEn, string>>;
