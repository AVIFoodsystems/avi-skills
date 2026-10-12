---
name: avi-nx
description: Apply AVI Nx library boundaries, public APIs, generator selection and task conventions in an existing Nx workspace. Use for Nx scaffolding or workspace changes; do not impose Nx on other repositories.
metadata:
  version: "0.1.0"
---

# Avi Nx

Read [repository discovery and interpretation](../../standards/context.md) before selecting APIs or applying rules. Apply these conventions to the requested scope; repository facts and documented exceptions remain local. Detailed references load only when relevant.

Confirm Nx is present in the manifest/configuration. If absent, use the repository's own tooling without prescribing Nx layout or commands. Inspect nx.json, installed plugins, resolved projects and relevant aliases/boundary rules.

Read [workspace rules](../../standards/nx-workspace.md). For scaffolding, discover local/installed generators, inspect options and review a dry run. For task execution, resolve actual targets including inferred configuration. Preserve shared dependency versions and use the repository package manager.

Official Nx skills or MCP tools are optional aids. When unavailable, use installed Nx help and resolved configuration; do not block on optional tools. Verify affected boundaries and configured checks.
