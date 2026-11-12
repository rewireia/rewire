import type { Region, SellerCourse } from '@rewire/contracts';
import { useRef, useState } from 'react';
import { Link } from 'react-router';

import { usePublishCourse, useUpdateCourse } from '../../api/seller-queries.ts';
import { Button } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Business.module.css';
import { draftOf, EMPTY_DRAFT, firstInvalid, readDraft } from './seller-course-draft.ts';
import { AccessFields, ChoiceFields, TextFields, useDraft } from './SellerCourseFields.tsx';

interface SellerCourseFormProps {
  readonly region: Region;
  /** The course to edit; none to publish a new one. */
  readonly course?: SellerCourse;
  readonly onDone?: () => void;
}

/** Takes the person to the field that needs them first. */
function focusField(form: HTMLFormElement | null, field: string | undefined) {
  if (field !== undefined) form?.querySelector<HTMLElement>(`[data-field="${field}"]`)?.focus();
}

/**
 * The form to publish a course, or to edit one published here. Each field is checked as it is
 * typed, with the server's own rules; a field says what is wrong once it was left or sent.
 */
export function SellerCourseForm({ region, course, onDone }: SellerCourseFormProps) {
  const { t } = useMessages();
  const [published, setPublished] = useState(course?.published ?? true);
  const fields = useDraft(course ? draftOf(course) : EMPTY_DRAFT, region, published);
  const publish = usePublishCourse();
  const update = useUpdateCourse();
  const saving = course ? update : publish;
  const form = useRef<HTMLFormElement>(null);
  const send = (publishNow: boolean) => {
    const read = readDraft(fields.draft, region, publishNow);
    fields.revealAll();
    if (read.course === null) {
      focusField(form.current, firstInvalid(read.errors));
      return;
    }
    if (course)
      update.mutate({ id: course.id, body: read.course }, { onSuccess: () => onDone?.() });
    else publish.mutate(read.course);
  };
  if (!course && publish.isSuccess) {
    return (
      <Published
        course={publish.data}
        onAnother={() => {
          publish.reset();
          fields.reset();
        }}
      />
    );
  }
  return (
    <form
      ref={form}
      className={styles.publish}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        send(course ? published : true);
      }}
    >
      <p className={styles.publishIntro}>
        {course ? t('publish.editTitle', { title: course.title }) : t('publish.intro')}
      </p>
      <TextFields {...fields} />
      <ChoiceFields {...fields} />
      <AccessFields {...fields} region={region} />
      <FormActions
        editing={course !== undefined}
        published={published}
        setPublished={setPublished}
        pending={saving.isPending}
        onDraft={() => {
          send(false);
        }}
        onCancel={onDone}
      />
      {saving.isError && <ErrorNotice error={saving.error} />}
    </form>
  );
}

function FormActions({
  editing,
  published,
  setPublished,
  pending,
  onDraft,
  onCancel,
}: {
  readonly editing: boolean;
  readonly published: boolean;
  readonly setPublished: (published: boolean) => void;
  readonly pending: boolean;
  readonly onDraft: () => void;
  readonly onCancel: (() => void) | undefined;
}) {
  const { t } = useMessages();
  return (
    <div className={`${styles.termsActions} ${styles.wide}`}>
      {editing && (
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => {
              setPublished(event.target.checked);
            }}
          />
          {t('publish.onSale')}
        </label>
      )}
      <Button primary type="submit" disabled={pending}>
        {t(editing ? 'publish.save' : 'publish.publishNow')}
      </Button>
      {!editing && (
        <Button onClick={onDraft} disabled={pending}>
          {t('publish.saveDraft')}
        </Button>
      )}
      {onCancel && <Button onClick={onCancel}>{t('publish.cancel')}</Button>}
    </div>
  );
}

function Published({
  course,
  onAnother,
}: {
  readonly course: SellerCourse;
  readonly onAnother: () => void;
}) {
  const { t } = useMessages();
  return (
    <div className={styles.published} role="status">
      <p>{t(course.published ? 'publish.done' : 'publish.doneDraft', { title: course.title })}</p>
      <div className={styles.termsActions}>
        {course.published && (
          <Link className={styles.shopLink} to="/courses">
            {t('publish.seeInShop')}
          </Link>
        )}
        <Button onClick={onAnother}>{t('publish.another')}</Button>
      </div>
    </div>
  );
}
