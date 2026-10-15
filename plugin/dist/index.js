import { fail } from "./lifecycle/fail";
import { prepare } from "./lifecycle/prepare";
import { success } from "./lifecycle/success";
import { verifyConditions } from "./lifecycle/verify-conditions";
export { fail, prepare, success, verifyConditions };
export function publish(config, ctx) {
    console.log("publish", { config });
}
