import { createActionGroup, props } from '@ngrx/store';
import { Item } from './item.model';
export const ItemActions = createActionGroup({ source: 'Item', events: {
  'Load': props<{ query: string }>(),
  'Load Success': props<{ items: Item[] }>(),
  'Load Failed': props<{ error: string }>(),
} });
