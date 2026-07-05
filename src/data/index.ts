import { LocalStorageDataSource } from './LocalStorageDataSource';
import type { DataSource } from './types';

/**
 * The single concrete data source for the app. Swap this line to change the
 * backend (e.g. a REST or IndexedDB implementation) — nothing else needs to know.
 */
export const dataSource: DataSource = new LocalStorageDataSource();

export type { DataSource, DotEvent } from './types';
