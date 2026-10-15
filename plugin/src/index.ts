import { fail } from "./lifecycle/fail.js";
import { prepare } from "./lifecycle/prepare.js";
import { success } from "./lifecycle/success.js";
import { verifyConditions } from "./lifecycle/verify-conditions.js";

export { fail, prepare, success, verifyConditions };

export function publish(config: any, ctx: any) {
	console.log("publish", { config });
	console.log("token", process.env.GITHUB_TOKEN);
}
