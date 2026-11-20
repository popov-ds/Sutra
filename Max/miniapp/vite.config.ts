import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: dir,
  base: "/miniapp/",
  assetsInclude: ["**/*.wasm"],
  build: {
    outDir: path.join(dir, "..", "dist", "miniapp-web"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.join(dir, "index.html"),
        cloud: path.join(dir, "cloud.html"),
      },
    },
  },
});