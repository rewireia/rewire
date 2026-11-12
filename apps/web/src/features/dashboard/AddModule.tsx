import type { Region, RoadmapCourse, StudyTimeline } from '@rewire/contracts';
import { Link } from 'react-router';

import { useCourseCatalogue } from '../../api/courses-queries.ts';
import { Button } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { formatMoney, interpolate } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { dashboardCopy } from './dashboard-copy.ts';
import { modulesOf, suggestions, withAdded, type Suggestion } from './path-modules.ts';
import { usePathEdit } from './use-path-edit.ts';
import styles from './RoadmapPath.module.css';

/** How many courses of each step the panel offers; the catalogue has the rest. */
const PER_STAGE = 2;

interface AddProps {
  readonly region: Region;
  readonly timeline: StudyTimeline;
  readonly roadmap: readonly RoadmapCourse[];
}

/**
 * "Add a module": real courses of the catalogue for each step that the path does not have yet,
 * each added in one step, and the way to the whole catalogue.
 */
export function AddModule({ region, timeline, roadmap }: AddProps) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const catalogue = useCourseCatalogue(region, language);
  const inPath = new Set(modulesOf(timeline).map(({ id }) => id));
  return (
    <section className={styles.add} aria-labelledby="add-module">
      <header className={styles.addHead}>
        <h3 id="add-module">{copy.addModule}</h3>
        <Link to="/courses">{copy.wholeCatalogue}</Link>
      </header>
      <QueryState query={catalogue}>
        {({ courses }) => {
          const offered = suggestions(courses, inPath, PER_STAGE);
          return offered.length === 0 ? (
            <p className={styles.quiet}>{copy.nothingToAdd}</p>
          ) : (
            <ul className={styles.offers}>
              {offered.map((item) => (
                <Offer key={item.course.id} item={item} region={region} roadmap={roadmap} />
              ))}
            </ul>
          );
        }}
      </QueryState>
    </section>
  );
}

function Offer({
  item,
  region,
  roadmap,
}: {
  readonly item: Suggestion;
  readonly region: Region;
  readonly roadmap: readonly RoadmapCourse[];
}) {
  const { language, t } = useMessages();
  const copy = dashboardCopy[language];
  const path = usePathEdit(region);
  const { course, stage } = item;
  const next = withAdded(roadmap, course.id);
  return (
    <li className={styles.offer} data-stage={stage}>
      <p className={styles.sheetStage}>
        {t(`stage.${stage}`)} <span>· {course.provider}</span>
      </p>
      <p className={styles.offerTitle}>{course.title}</p>
      <p className={styles.offerMeta}>
        {course.hours === null
          ? copy.hoursUnknown
          : interpolate(copy.hours, { hours: course.hours }, language)}{' '}
        · {formatMoney(course.price, language)}
      </p>
      {next === null ? (
        <p className={styles.quiet}>{copy.pathFull}</p>
      ) : (
        <Button
          disabled={path.isPending}
          onClick={() => {
            path.mutate(next);
          }}
        >
          {copy.addToPath}
        </Button>
      )}
      {path.isError && <ErrorNotice error={path.error} />}
    </li>
  );
}
