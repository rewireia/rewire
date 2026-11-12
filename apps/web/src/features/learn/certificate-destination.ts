/**
 * Where the learner goes once their certificate exists: to it, if they are still on the course
 * they claimed it from. Someone who already moved on stays where they went; the course keeps a link
 * to the certificate for later.
 */
export function certificateDestination(
  certificateId: string,
  coursePath: string,
  currentPath: string,
): string | null {
  return currentPath === coursePath ? `/certificates/${certificateId}` : null;
}
