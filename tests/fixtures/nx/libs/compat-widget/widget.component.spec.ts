import { ComponentFixture, TestBed } from '@angular/core/testing';
// The local exception permits a DOM fixture only for this widget directory.
export const widgetFixtureType: typeof TestBed = TestBed;
export type WidgetFixture<T> = ComponentFixture<T>;
