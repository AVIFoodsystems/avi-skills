# Changelog

## 0.2.0 — release preparation

- Add canonical standards and five `avi-engineering` skills, with stable rule IDs and adopted/recommendation/unverified status. Preserve forms, state architecture and actual model identifiers.
- Add deterministic catalog-driven generation, portable manifests, standalone/package archives and SHA-256 checksums.
- Add repository and managed installations, client adapters, receipts, conflict checks, rollback, diagnostics and conservative uninstall.
- Preserve `avi-migration` 0.1.5, both legacy skill names, Claude namespace commands, attribution and the GitHub script interface. Move top-level skill `version` into `metadata.version` for open-spec compatibility.
- Native installs stage immutable packages and return client activation steps. Behavioral client support remains gated by recorded evaluations.

Upgrade: maintainers edit `skill-sources/` and `standards/`, then regenerate. Existing plugin consumers can retain their current pin. New repository/user installations should review `--dry-run`, select one distribution per client/skill, and verify activation. No standard IDs or legacy commands are deprecated.
