import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".next/**", ".claude/**", "node_modules/**"],
  },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@next/next/no-html-link-for-pages": "warn",
      "prefer-const": "warn",
      "react/no-unescaped-entities": "warn",
      // Next 16 adds compiler diagnostics to lint. Keep them visible without
      // making this security release rewrite unrelated UI. Existing Hooks
      // correctness checks retain the preset's enforcement.
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/error-boundaries": "warn",
    },
  },
];

export default eslintConfig;
