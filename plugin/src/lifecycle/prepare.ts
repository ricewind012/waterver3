import { readFile, writeFile } from "node:fs/promises";

import type path from "node:path";

import { updatePluginMetadata } from ".";


export async function prepare(_pluginConfig, context) {
	const version = context.nextRelease?.version;
	if (!version) {
		throw new Error("semantic-release did not provide a next release version.");
	}

	const configPath = path.join(context.cwd, "millennium.toml");
	const contents = await readFile(configPath, "utf8");
	await writeFile(configPath, updatePluginMetadata(contents, version));
	context.logger.log(`Updated millennium.toml to ${version}.`);
}
