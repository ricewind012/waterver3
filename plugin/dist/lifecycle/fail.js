import { cleanup, DEFAULT_CONFIG } from "../shared";
export async function fail(_config = DEFAULT_CONFIG, _ctx) {
    await cleanup();
}
