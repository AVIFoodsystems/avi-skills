# Ionic and Capacitor boundaries

Maintainer: AVI repository maintainers. Extracted 2026-10-12.
Status is recorded per rule; adopted means carried forward from the source standards, not a new team approval.

Read [state selection](ngrx-selection.md) when state is involved.

## AVI-MOBILE-001

Status: **adopted**. Applicability: Native/mobile work.

Inspect each installed Ionic/Capacitor/plugin version, capacitor configuration, native projects and resolved scripts/targets. Discover actual supported platforms; do not assume Android, iOS, a storage package or an authentication provider from avi-web examples.

## AVI-MOBILE-002

Status: **adopted**. Applicability: Offline, auth and synchronization changes.

Keep offline/synchronization responsibilities in their existing services/models, preserve domain IDs, sync IDs, dates and API serialization, and follow the current storage/auth integration. Mobile work preserves the current NgRx architecture. Keep platform configuration with the application.

## AVI-MOBILE-003

Status: **adopted**. Applicability: Native verification.

Use the application's existing build/sync/open/run wrappers after inspecting their behavior. Verify affected web checks and native targets/devices when plugin integration changes. Check affected offline recovery, synchronization, authentication and camera/scanner behavior. Report unavailable native toolchains or unrun device checks; deployment tags and release settings remain repository facts.

## Source references

- [ionic-capacitor/README.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/ionic-capacitor/README.md)
- [ionic-capacitor/MOBILE_DEVELOPMENT.md](https://github.com/AVIFoodsystems/avi-web/blob/main/docs/architecture/ionic-capacitor/MOBILE_DEVELOPMENT.md)
