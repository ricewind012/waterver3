import SemanticReleaseError from "@semantic-release/error";
import type { VerifyConditionsContext } from "semantic-release";

import { DEFAULT_CONFIG, MILLENNIUM_CONFIG_FILE, runGhCli } from "../shared";
import { existsSync } from "node:fs";

export async function verifyConditions(
	_config = DEFAULT_CONFIG,
	ctx: VerifyConditionsContext,
) {
	if (!existsSync(MILLENNIUM_CONFIG_FILE)) {
		throw new SemanticReleaseError(`${MILLENNIUM_CONFIG_FILE} was not found`);
	}

	await runGhCli("api", "user", "--jq", ".login");
	ctx.logger.log("GitHub CLI authentication verified");
}
