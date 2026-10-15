//import { prepare } from "./lifecycle/prepare";
//import { success } from "./lifecycle/success";
//import { verifyConditions } from "./lifecycle/verify-conditions";

//export { prepare, success, verifyConditions };

export function analyzeCommits(config, context) {
	//console.log({ config, context });
}

export function prepare(config, context) {
	console.log("HELLO XD", context.nextRelease);
}
