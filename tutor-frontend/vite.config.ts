import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "src"),
        },
        dedupe: ["react", "react-dom"],
    },
    build: {
        outDir: "dist",
        emptyOutDir: true,
    },
    server: {
        port: 5174,
    },
});
