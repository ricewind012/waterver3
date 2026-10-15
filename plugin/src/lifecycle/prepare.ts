import type { PrepareContext } from "semantic-release";

import { openDatabasePr } from "../config/open-database-pr.js";
import {
	DEFAULT_CONFIG,
	MILLENNIUM_CONFIG_FILE,
	millenniumConfig,
} from "../shared.js";

export async function prepare(config = DEFAULT_CONFIG, ctx: PrepareContext) {
	const { version, notes } = ctx.nextRelease;
	await millenniumConfig.edit("plugin", "version", version);
	ctx.logger.log(`Updated ${MILLENNIUM_CONFIG_FILE} to ${version}`);

	if (config.openDatabasePr) {
		openDatabasePr(ctx, notes);
	}
}
