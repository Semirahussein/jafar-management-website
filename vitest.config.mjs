import { defineConfig } from "vitest/config";
import { transformWithOxc } from "vite";

// This project follows the Next.js convention of writing JSX inside plain
// ".js" files for client components (e.g. app/management/portal.js). Vite's
// built-in "vite:oxc" transform infers the parser "lang" strictly from the
// file extension and refuses JSX syntax in ".js" files. This small pre-pass
// plugin re-transforms such files explicitly as JSX before the default
// pipeline runs, so the existing source files do not need to be renamed.
function jsxInJsFiles() {
  return {
    name: "jsx-in-js-files",
    enforce: "pre",
    async transform(code, id) {
      if (!id.endsWith(".js") || id.includes("node_modules")) return null;
      const result = await transformWithOxc(code, id, {
        lang: "jsx",
        jsx: { runtime: "automatic", importSource: "react" },
      });
      return { code: result.code, map: result.map };
    },
  };
}

export default defineConfig({
  plugins: [jsxInJsFiles()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.mjs"],
    include: ["app/**/*.test.{js,jsx,mjs}"],
    css: false,
  },
});
