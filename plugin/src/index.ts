import { fail } from "./lifecycle/fail.ts";
import { prepare } from "./lifecycle/prepare.ts";
import { success } from "./lifecycle/success.ts";
import { verifyConditions } from "./lifecycle/verify-conditions.ts";

export { fail, prepare, success, verifyConditions };

export function publish(config, ctx) {
	console.log("publish", { config });
}
