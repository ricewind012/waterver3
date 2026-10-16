import { parse, stringify } from "smol-toml";

import { readFile, writeFile } from "node:fs/promises";

/**
 * Small wrapper for `smol-toml`.
 */
// biome-ignore lint/suspicious/noExplicitAny: TomlValue doesn't work :(
export class TomlFile<T extends Record<string, any>> {
	content = {} as T;
	private readonly file: string;

	constructor(file: string) {
		this.file = file;
		this.read().then((e) => {
			this.content = e;
		});
	}

	async edit<S extends keyof T, K extends keyof T[S], V extends T[S][K]>(
		section: S,
		key: K,
		value: V,
	) {
		this.content[section][key] = value;
		await writeFile(this.file, stringify(this.content));
	}

	private async read() {
		const content = await readFile(this.file, "utf8");
		return parse(content) as unknown as T;
	}
}
