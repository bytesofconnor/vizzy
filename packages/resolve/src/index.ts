export { DATASETS, RECIPES, datasetForSourceUrl, datasetsForTopic, matchAsked, matchPrompt, rankDatasets } from './catalog';
export { labelIsPlace, phraseIn, placesInAsked } from './places';
export { topCountFromAsked } from './normalize';
export { fetchMatched, fetchRecipe, notesFromResolved, resolvePrompt, rowsForAsked } from './resolve';
export { defaultGet, RESOLVE_UA } from './http';
export type { Dataset, DatasetTopic, Family, HttpGet, Recipe, ResolvedSeries, SeriesRow } from './types';
