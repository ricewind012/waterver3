import { TomlFile } from "./toml.js";
import { type ExecException, execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

export const DEFAULT_CONFIG: PluginConfig = {
	openDatabasePr: false,
};
export const MILLENNIUM_CONFIG_FILE = "millennium.toml";

const execFileAsync = promisify(execFile);

/** @see https://docs.steambrew.app/plugins/structure/config */
interface MillenniumPluginConfig {
	plugin: {
		author: string;
		description: string;
		id: string;
		name: string;
		version: string;
	};
}

interface PluginConfig {
	/**
	 * Whether to open a PR to the Millennium plugin database.
	 */
	openDatabasePr: boolean;
}

interface RunOptions {
	allowedExitCodes: number[];
}

export const millenniumConfig = new TomlFile<MillenniumPluginConfig>(
	MILLENNIUM_CONFIG_FILE,
);
export const tmpDir = await mkdtemp(join(tmpdir(), "plugin-database-"));

export async function cleanup() {
	await rm(tmpDir, { force: true, recursive: true });
}

export async function run(
	command: string,
	args: readonly string[],
	options: Partial<RunOptions> = {},
) {
	try {
		const { stdout } = await execFileAsync(command, args, { encoding: "utf8" });
		return { code: 0, stdout: stdout.trim() };
	} catch (ex) {
		const error = ex as ExecException;
		const code = Number(error.code);
		if (options.allowedExitCodes?.includes(code)) {
			return { code, stdout: error.stdout?.toString().trim() || error.message };
		}

		const details = error.stderr?.toString().trim() || error.message;
		throw new Error(`${command} ${args.join(" ")} failed: ${details}`);
	}
}
