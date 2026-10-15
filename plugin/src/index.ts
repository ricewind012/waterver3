/*
import { prepare } from "./lifecycle/prepare";
import { success } from "./lifecycle/success";
import { verifyConditions } from "./lifecycle/verify-conditions";

export { prepare, success, verifyConditions };
*/

export function prepare(config, context) {
	console.log("prepare", { context });
}

export function success(config, context) {
	console.log("success", { context });
}

export function verifyConditions(config, context) {
	console.log("verifyConditions", { context });
}
