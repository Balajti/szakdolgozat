import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { createAssignment } from './functions/create-assignment/resource';
import { generateStory } from './functions/generate-story/resource';
import { listAssignments } from './functions/list-assignments/resource';
import { listStories } from './functions/list-stories/resource';
import { studentDashboard } from './functions/student-dashboard/resource';
import { teacherDashboard } from './functions/teacher-dashboard/resource';
import { updateWordMastery } from './functions/update-word-mastery/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
export const backend = defineBackend({
  auth,
  data,
  studentDashboard,
  teacherDashboard,
  listStories,
  listAssignments,
  generateStory,
  updateWordMastery,
  createAssignment,
});
