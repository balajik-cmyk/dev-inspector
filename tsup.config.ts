import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig } from "tsup";
import cssPlugin from "esbuild-plugin-react18-css";

const STYLE_ID = "dev-inspector-styles";

function injectStyleLoader(jsFile: string, cssFile: string) {
  const css = readFileSync(cssFile, "utf8");
  const snippet = `(function(){try{if(typeof document==="undefined")return;if(document.getElementById(${JSON.stringify(STYLE_ID)}))return;var s=document.createElement("style");s.id=${JSON.stringify(STYLE_ID)};s.textContent=${JSON.stringify(css)};document.head.appendChild(s);}catch(e){}})();\n`;
  const js = readFileSync(jsFile, "utf8");
  writeFileSync(jsFile, snippet + js);
}

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "firebase", /^firebase\//],
  esbuildPlugins: [cssPlugin({ inject: true })],
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
  onSuccess: async () => {
    injectStyleLoader("dist/index.js", "dist/index.css");
    injectStyleLoader("dist/index.cjs", "dist/index.css");
  },
});
