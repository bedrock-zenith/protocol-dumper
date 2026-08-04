import type { RolldownOptions } from "rolldown";

export default {
   external: /^node:/,
   input: {
      main: "src/main.ts",
   },
   output: {
      cleanDir: true,
      minify: true,
      sourcemap: "inline",
   },
} satisfies RolldownOptions;
