const fs = require("node:fs");
const path = require("node:path");
const folder = path.resolve(__dirname, "../apps/web/src/i18n");
const keys = JSON.parse(fs.readFileSync(path.join(folder, "jsx-keys.json"), "utf8"));
const translations = JSON.parse(fs.readFileSync(path.join(folder, "jsx-translations.json"), "utf8"));
let missing = 0;
for (const locale of ["hi", "gu"]) {
  const absent = keys.filter((key) => !translations[key]?.[locale]?.trim());
  console.log(`${locale}: ${keys.length - absent.length}/${keys.length} catalog strings translated`);
  if (absent.length) console.log(absent.slice(0, 25).map((key) => `  ${key}`).join("\n"));
  missing += absent.length;
}
if (missing) process.exitCode = 1;
