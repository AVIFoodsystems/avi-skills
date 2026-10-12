import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { ItemActions } from './item.actions';
import { ItemHttpService } from './item-http.service';
@Injectable()
export class ItemEffects {
  private actions = inject(Actions);
  private http = inject(ItemHttpService);
  load = createEffect(() => this.actions.pipe(ofType(ItemActions.load), switchMap(({ query }) =>
    this.http.load(query).pipe(map(items => ItemActions.loadSuccess({ items })),
      catchError(() => of(ItemActions.loadFailed({ error: 'Unable to load items' })))))));
}
