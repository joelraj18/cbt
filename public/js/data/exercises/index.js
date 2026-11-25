// All exercises, indexed. Each exercise lists the verified research it is based on (refs).
import depression from './depression.js';
import anxiety from './anxiety.js';
import productivity from './productivity.js';
import selfDiscipline from './self-discipline.js';
import timeManagement from './time-management.js';
import sexualDesire from './sexual-desire.js';
import impulsiveness from './impulsiveness.js';

export const EXERCISES = [...depression, ...anxiety, ...productivity, ...selfDiscipline, ...timeManagement, ...sexualDesire, ...impulsiveness];
export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
/** Exercises for an area: its own plus cross-listed ones. */
export const exercisesForArea = (areaId) => EXERCISES.filter((e) => e.area === areaId || (e.also || []).includes(areaId));
