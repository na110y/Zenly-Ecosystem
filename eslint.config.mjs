import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Prettier is the formatter of record for this project (see .claude/rules/frontend.md);
    // vue/html-self-closing conflicts with Prettier's void-element output and caused the
    // two tools to fight over the same input tags.
    'vue/html-self-closing': 'off',
  },
})
