# Signal Store implementation

Maintainer: AVI repository maintainers. Extracted 2026-10-12.
Status is recorded per rule; adopted means carried forward from the source standards, not a new team approval.

Read [state selection](ngrx-selection.md) when state is involved.

## AVI-SIGNALS-001

Status: **adopted**. Applicability: Signal Store features.

Compose supported signalStore features: withState for owned state, withComputed for derived views, withMethods for operations and supported entity features from @ngrx/signals/entities. Verify the installed entity API: do not substitute classic @ngrx/entity helpers or copy an unverified entities() map assumption.

## AVI-SIGNALS-002

Status: **adopted**. Applicability: Signal Store async boundaries.

Keep HTTP services focused on API communication. Store methods coordinate state changes, loading and failure behavior; use firstValueFrom when awaiting a finite HTTP observable. Discover existing request-status features before introducing another. Use the actual entity key type, handle zero/null selections correctly and test store lifetime and success/failure/computed behavior.

## AVI-SIGNALS-003

Status: **adopted**. Applicability: Signal Store naming.

Use <Feature>Store, descriptive operation verbs (load/create/update/remove/select/reset), computed value names for views and with<Feature> custom features. Keep reusable features separate from application-specific transport and models.

## Source references

- [ngrx/SIGNAL_STORE.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/ngrx/SIGNAL_STORE.md)
- [ngrx/NAMING_CONVENTIONS.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/ngrx/NAMING_CONVENTIONS.md)
- [ngrx/TESTING.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/ngrx/TESTING.md)
