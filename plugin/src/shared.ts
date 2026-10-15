import { TomlFile } from "./toml";
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
	assets?: {
		resources: string[];
	};
	backend?: {
		entry: string;
		sources: string[];
	};
	compiler?: {
		output_path: string;
	};
	dev?: {
		plugin_name?: string;
		socket?: string;
		auto_restart?: boolean;
		reload_steamui_when?: "never" | "backend" | "frontend" | "both";
	};
	frontend: {
		entry: string;
		globals?: Record<string, string>;
	};
	inspect?: {
		depth?: number;
		colors?: boolean;
		show_hidden?: boolean;
	};
	logger?: {
		padding?: number;
		backend_prefix?: string;
		frontend_prefix?: string;
		webview_prefix?: string;
		webview_col?: [number, number, number];
		backend_col?: [number, number, number];
		frontend_col?: [number, number, number];
	};
	patches?: {
		debug: boolean;
	};
	plugin: {
		author: string;
		description: string;
		id: string;
		name: string;
		version: string;
	};
	webkit?: {
		entry: string;
		globals?: Record<string, string>;
	};
}

interface PluginConfig {
	/**
	 * Open a PR to the Millennium plugin database?
	 */
	openDatabasePr: boolean;
}

interface RunOptions {
	cwd: string;
	env: Record<string, string>;
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
		const { stdout } = await execFileAsync(command, args, {
			cwd: options.cwd,
			encoding: "utf8",
			env: {
				...process.env,
				...options.env,
			},
		});
		return { code: 0, stdout };
	} catch (ex) {
		const error = ex as ExecException;
		const code = Number(error.code);
		if (options.allowedExitCodes?.includes(code)) {
			return { code, stdout: error.stdout?.toString() };
		}

		const details = error.stderr?.toString() || error.message;
		throw new Error(`${command} ${args.join(" ")} failed: ${details}`);
	}
}

export const tokenEnvironment = (() => {
	const token = process.env.GH_TOKEN;
	if (!token) {
		throw new Error(
			"GH_TOKEN is required to fork the PluginDatabase and open its update PR.",
		);
	}

	return { GH_TOKEN: token };
})();

export function runGhCli(...args: readonly string[]) {
	return run("gh", args); //{ env: tokenEnvironment });
}
