import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormlyModule, FormlyFieldConfig } from '@ngx-formly/core';
@Component({ selector: 'demo-editor', standalone: true, imports: [ReactiveFormsModule, FormlyModule],
  template: '<form [formGroup]="form"><formly-form [form]="form" [fields]="fields" /></form>' })
export class EditorComponent {
  form = new FormGroup({ name: new FormControl('', { nonNullable: true }) });
  fields: FormlyFieldConfig[] = [{ key: 'name', type: 'input', props: { label: 'Name' } }];
}
