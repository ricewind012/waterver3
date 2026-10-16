import { TomlFile } from "./toml.js";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
export const DEFAULT_CONFIG = {
    openDatabasePr: false,
};
export const MILLENNIUM_CONFIG_FILE = "millennium.toml";
const execFileAsync = promisify(execFile);
export const millenniumConfig = new TomlFile(MILLENNIUM_CONFIG_FILE);
export const tmpDir = await mkdtemp(join(tmpdir(), "plugin-database-"));
export async function cleanup() {
    await rm(tmpDir, { force: true, recursive: true });
}
export async function run(command, args, options = {}) {
    try {
        const { stdout } = await execFileAsync(command, args, {
            encoding: "utf8",
            env: {
                ...process.env,
                ...options.env,
            },
        });
        return { code: 0, stdout };
    }
    catch (ex) {
        const error = ex;
        const code = Number(error.code);
        if (options.allowedExitCodes?.includes(code)) {
            return { code, stdout: error.stdout?.toString() || error.message };
        }
        const details = error.stderr?.toString() || error.message;
        throw new Error(`${command} ${args.join(" ")} failed: ${details}`);
    }
}
export const tokenEnvironment = (() => {
    const token = process.env.GH_TOKEN;
    /*
    if (!token) {
        throw new Error(
            "GH_TOKEN is required to fork the PluginDatabase and open its update PR.",
        );
    }
        */
    return { GH_TOKEN: token ?? "" };
})();
export function runGhCli(...args) {
    return run("gh", args); //{ env: tokenEnvironment });
}
