import SemanticReleaseError from "@semantic-release/error";
import { DEFAULT_CONFIG, MILLENNIUM_CONFIG_FILE } from "../shared.js";
import { existsSync } from "node:fs";
export async function verifyConditions(config = DEFAULT_CONFIG, _ctx) {
    if (!existsSync(MILLENNIUM_CONFIG_FILE)) {
        throw new SemanticReleaseError(`${MILLENNIUM_CONFIG_FILE} was not found`);
    }
    if (config.openDatabasePr && !process.env.GH_TOKEN) {
        throw new SemanticReleaseError("GH_TOKEN is required to fork the PluginDatabase repo and open the PR");
    }
}
