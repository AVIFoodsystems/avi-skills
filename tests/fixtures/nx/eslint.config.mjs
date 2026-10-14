export default [{ rules: { '@nx/enforce-module-boundaries': ['error', {
  depConstraints: [
    { sourceTag: 'type:core', onlyDependOnLibsWithTags: ['type:core'] },
    { sourceTag: 'scope:catalog', onlyDependOnLibsWithTags: ['type:core', 'scope:catalog'] },
  ],
}] } }];
