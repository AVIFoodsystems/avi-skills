# Classic Store, Effects and Entity

Maintainer: AVI repository maintainers. Extracted 2026-10-12.
Status is recorded per rule; adopted means carried forward from the source standards, not a new team approval.

Read [state selection](ngrx-selection.md) when state is involved.

## AVI-NGRX-001

Status: **adopted**. Applicability: Classic NgRx features.

Components dispatch actions and consume selectors; effects coordinate HTTP and other side effects; pure reducers update state. Normalize entities using @ngrx/entity and derive adapter selectId and action payload types from the actual persisted model.

## AVI-NGRX-002

Status: **adopted**. Applicability: Async effects.

Catch failures inside the inner request stream so later actions continue. Choose switchMap for replaceable reads, concatMap for ordered writes, or exhaustMap for duplicate submission suppression according to operation semantics. Test success, failure and subsequent requests.

## AVI-NGRX-003

Status: **adopted**. Applicability: NgRx naming.

Use descriptive PascalCase feature action sources, PascalCase single-word events and Title Case multi-word events with request/success/failure families. Follow existing action/selector naming and feature file organization. Selectors derive views without introducing a second owner.

## Source references

- [ngrx/STATE_MANAGEMENT.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/ngrx/STATE_MANAGEMENT.md)
- [ngrx/NAMING_CONVENTIONS.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/ngrx/NAMING_CONVENTIONS.md)
- [ngrx/TESTING.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/ngrx/TESTING.md)
