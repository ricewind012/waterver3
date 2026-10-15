import { run, tokenEnvironment } from "../shared";

export async function verifyConditions(_pluginConfig, context) {
	const env = tokenEnvironment();
	await run("gh", ["api", "user", "--jq", ".login"], { env });
	context.logger.log("GitHub CLI authentication verified.");
}
