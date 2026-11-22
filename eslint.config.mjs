import next from "eslint-config-next";

const config = [
  { ignores: [".next/**", "node_modules/**", "reference/**", "playwright-report/**", "test-results/**", "next-env.d.ts", "lib/generated/**"] },
  ...next,
];

export default config;
