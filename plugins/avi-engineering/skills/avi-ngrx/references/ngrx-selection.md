# State ownership and selection

Maintainer: AVI repository maintainers. Extracted 2026-10-12.
Status is recorded per rule; adopted means carried forward from the source standards, not a new team approval.

## AVI-STATE-001

Status: **adopted**. Applicability: Existing state features.

Both classic Store/Effects/Entity and Signal Store are supported. Continue the feature's existing architecture when extending it. Prefer Signal Store for isolated new features when installed APIs support it. Migration is optional and requires requested scope; preserve behavior and tests.

## AVI-STATE-002

Status: **adopted**. Applicability: Coexisting state architectures.

Give each piece of state one owner. Avoid duplicate writable entity collections in classic and signal stores; connect them through explicit read/dispatch boundaries. Choose root/route/component provider scope according to intended lifetime and existing configuration.

## Source references

- [ngrx/STATE_MANAGEMENT.md#state-management-strategy](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/ngrx/STATE_MANAGEMENT.md#state-management-strategy)
- [ngrx/STATE_MANAGEMENT.md#coexistence-and-optional-migration](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/ngrx/STATE_MANAGEMENT.md#coexistence-and-optional-migration)
