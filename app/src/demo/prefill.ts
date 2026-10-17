// Web demo only: the Welcome field starts filled with the prepared new subject, until it exists.
import { normalizeTitle } from '../core/model';
import { browserSubjects } from '../frame/browser-storage';

export const demoNewSubject = {
  title: 'Blender 3D',
  direction: 'Discover what this software is, why it is so popular, and what makes it such a special piece of software.'
};
export function demoPrefill(): typeof demoNewSubject | null {
  try { return browserSubjects().some(s => normalizeTitle(s.title) === normalizeTitle(demoNewSubject.title)) ? null : demoNewSubject; }
  catch { return demoNewSubject; }
}
