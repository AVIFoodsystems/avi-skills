# Fixture Nx instructions

Catalog features use cat- selectors. Core libraries have type:core tags, catalog features have scope:catalog tags; inspect generator schemas rather than inventing flags.

Scoped exception to AVI-TEST-001: only libs/compat-widget/** may use ComponentFixture to verify the third-party DOM widget integration. It does not extend to libs/catalog/**. Owner: fixture maintainers; rationale: class-only testing cannot observe widget DOM events.
