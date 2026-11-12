import type { CourseSearchInput, Region } from '@rewire/contracts';
import { useState } from 'react';
import { Button } from '../../components/Button.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { trainingCopy } from './training-copy.ts';
import styles from './TrainingSelection.module.css';

interface Answers {
  budget: number;
  level: CourseSearchInput['level'];
  goal: CourseSearchInput['goal'];
  weeklyHours: number;
}
interface Props {
  readonly region: Region;
  readonly answers: Answers;
  readonly onChange: (answers: Answers) => void;
  readonly disabled: boolean;
  readonly onSearch: () => void;
}
/** What every step of the questions reads and edits. */
interface StepProps {
  readonly copy: Copy;
  readonly answers: Answers;
  readonly onChange: (answers: Answers) => void;
}
type Copy = (typeof trainingCopy)[keyof typeof trainingCopy];

const LAST_STEP = 2;
const levels = ['beginner', 'intermediate', 'advanced'] as const;
const goals = ['current-job', 'career-change', 'explore'] as const;
const weeklyHours = [1, 2, 4, 6] as const;

/** Three questions, one at a time: budget, starting point and time, then the search. */
export function TrainingQuestions({ region, answers, onChange, disabled, onSearch }: Props) {
  const { language } = useMessages();
  const copy = trainingCopy[language];
  const [step, setStep] = useState(0);
  const currency = region === 'us' ? 'USD' : region === 'uk' ? 'GBP' : 'EUR';
  const fields = { copy, answers, onChange };
  return (
    <form
      className={styles.questions}
      onSubmit={(event) => {
        event.preventDefault();
        if (step < LAST_STEP) setStep(step + 1);
        else onSearch();
      }}
    >
      <StepProgress steps={copy.steps} step={step} />
      <fieldset disabled={disabled} className={styles.fields}>
        {step === 0 && <BudgetStep {...fields} currency={currency} />}
        {step === 1 && <LevelStep {...fields} />}
        {step === 2 && <TimeStep {...fields} />}
      </fieldset>
      <div className={styles.actions}>
        {step > 0 && (
          <Button
            disabled={disabled}
            onClick={() => {
              setStep(step - 1);
            }}
          >
            {copy.back}
          </Button>
        )}
        <Button primary type="submit" disabled={disabled}>
          {step === LAST_STEP ? copy.search : copy.next} →
        </Button>
      </div>
    </form>
  );
}

function StepProgress({
  steps,
  step,
}: {
  readonly steps: readonly string[];
  readonly step: number;
}) {
  return (
    <ol className={styles.progress}>
      {steps.map((title, index) => (
        <li key={title} aria-current={index === step ? 'step' : undefined}>
          <span>{index + 1}</span>
          {title}
        </li>
      ))}
    </ol>
  );
}

function BudgetStep({
  copy,
  answers,
  onChange,
  currency,
}: StepProps & { readonly currency: string }) {
  return (
    <>
      <legend>{copy.budget}</legend>
      <p>{copy.budgetBody}</p>
      <label className={styles.amount}>
        {currency}
        <input
          aria-label={`${copy.steps[0]} (${currency})`}
          type="number"
          min="1"
          max="1000"
          step="0.01"
          required
          value={answers.budget}
          onChange={(event) => {
            onChange({ ...answers, budget: Number(event.target.value) });
          }}
        />
      </label>
    </>
  );
}

function LevelStep({ copy, answers, onChange }: StepProps) {
  return (
    <>
      <legend>{copy.level}</legend>
      <div className={styles.options}>
        {levels.map((value, index) => (
          <label key={value} data-selected={answers.level === value}>
            <input
              type="radio"
              name="level"
              value={value}
              checked={answers.level === value}
              onChange={() => {
                onChange({ ...answers, level: value });
              }}
            />
            {copy.levels[index]}
          </label>
        ))}
      </div>
      <fieldset className={styles.goal}>
        <legend>{copy.goal}</legend>
        <div className={styles.options}>
          {goals.map((value, index) => (
            <label key={value} data-selected={answers.goal === value}>
              <input
                type="radio"
                name="goal"
                checked={answers.goal === value}
                onChange={() => {
                  onChange({ ...answers, goal: value });
                }}
              />
              {copy.goals[index]}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

function TimeStep({ copy, answers, onChange }: StepProps) {
  return (
    <>
      <legend>{copy.time}</legend>
      <div className={styles.options}>
        {weeklyHours.map((hours) => (
          <label key={hours} data-selected={answers.weeklyHours === hours}>
            <input
              name="hours"
              type="radio"
              checked={answers.weeklyHours === hours}
              onChange={() => {
                onChange({ ...answers, weeklyHours: hours });
              }}
            />
            {hours} h
          </label>
        ))}
      </div>
    </>
  );
}
