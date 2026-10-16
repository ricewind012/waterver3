import { parse, stringify } from "smol-toml";
import { readFile, writeFile } from "node:fs/promises";
/**
 * Small wrapper for `smol-toml`.
 */
// biome-ignore lint/suspicious/noExplicitAny: TomlValue doesn't work :(
export class TomlFile {
    content = {};
    file;
    constructor(file) {
        this.file = file;
        this.read().then((e) => {
            this.content = e;
        });
    }
    async edit(section, key, value) {
        this.content[section][key] = value;
        await writeFile(this.file, stringify(this.content));
    }
    async read() {
        const content = await readFile(this.file, "utf8");
        return parse(content);
    }
}
