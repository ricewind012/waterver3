import { cleanup, DEFAULT_CONFIG } from "../shared.js";
export async function fail(_config = DEFAULT_CONFIG, _ctx) {
    _ctx.logger.log("gfailed XD");
    await cleanup();
}
