import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Item } from './item.model';
@Injectable({ providedIn: 'root' })
export class ItemHttpService {
  private http = inject(HttpClient);
  load(query: string) { return this.http.get<Item[]>('/items', { params: { query } }); }
}
