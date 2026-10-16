import type { PrepareContext } from "semantic-release";

import {
	DEFAULT_CONFIG,
	MILLENNIUM_CONFIG_FILE,
	millenniumConfig,
} from "../shared.js";

export async function prepare(_config = DEFAULT_CONFIG, ctx: PrepareContext) {
	const { version } = ctx.nextRelease;
	await millenniumConfig.edit("plugin", "version", version);
	ctx.logger.log(`Write version ${version} to ${MILLENNIUM_CONFIG_FILE}`);
}
