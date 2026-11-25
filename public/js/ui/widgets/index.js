// Widget registry: name → mount(container, { ex, query, onSaved, resetForm }) → cleanup | { cleanup, afterSave }
import { trapQuiz } from './quiz.js';
import { ladder, worryList, matrix, habits } from './tools.js';
import { breathing, pmr, focus } from './timers.js';
import { tmt, values } from './calculators.js';

export const WIDGETS = {
  'trap-quiz': trapQuiz,
  ladder,
  'worry-list': worryList,
  matrix,
  habits,
  breathing,
  pmr,
  focus,
  tmt,
  values,
};
