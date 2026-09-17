export type AccountChartRow = {
  slug: string;
  title: string;
  route: 'compose' | 'publish';
  createdAt: number;
  pinned?: boolean;
};

export type AccountLibraryKind = 'all' | 'pinned' | 'compose' | 'publish';

export type AccountLibraryPage = {
  page: AccountChartRow[];
  isDone: boolean;
  continueCursor: string;
};

export const HISTORY_REMOVED_EVENT = 'vizzy-history-removed';
