import { cleanup, DEFAULT_CONFIG } from "../shared.js";
export async function success(_config = DEFAULT_CONFIG, _ctx) {
    await cleanup();
}
