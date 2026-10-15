import type { SuccessContext } from "semantic-release";

import { cleanup, DEFAULT_CONFIG } from "../shared.ts";

export async function success(_config = DEFAULT_CONFIG, _ctx: SuccessContext) {
	await cleanup();
}
