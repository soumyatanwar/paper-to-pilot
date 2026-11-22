import next from "eslint-config-next";

const config = [
  { ignores: [".next/**", "node_modules/**", "reference/**", "playwright-report/**", "test-results/**", "next-env.d.ts"] },
  ...next,
];

export default config;
