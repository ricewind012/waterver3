import { readFile, writeFile } from "node:fs/promises";

const [version] = process.argv.slice(2);
if (!version) {
	throw new Error("A release version is required.");
}

const jsrPath = new URL("../jsr.json", import.meta.url);
const jsr = JSON.parse(await readFile(jsrPath, "utf8"));
if (!jsr || typeof jsr !== "object" || Array.isArray(jsr)) {
	throw new TypeError("jsr.json must contain a JSON object.");
}

jsr.version = version;
await writeFile(jsrPath, `${JSON.stringify(jsr, null, "\t")}\n`);
