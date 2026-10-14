import { createEntityAdapter } from '@ngrx/entity';
import { Item } from './item.model';
export const adapter = createEntityAdapter<Item>({ selectId: item => item.id });
export const initialState = adapter.getInitialState({ loading: false });
