import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import preact from "@astrojs/preact";

export default defineConfig({
  site: "https://palooza-kaida.github.io",
  base: "/ccbot/",
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
  },
});
