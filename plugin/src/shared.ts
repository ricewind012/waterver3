import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

export const DB_REPO = "SteamClientHomebrew/PluginDatabase";

const execFileAsync = promisify(execFile);

interface Options {
	cwd: string;
	env: Record<string, string>;
	allowedExitCodes: number[];
}

export async function run(
	command: string,
	args: readonly string[],
	options: Partial<Options> = {},
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
		return { code: 0, stdout: stdout.trim() };
	} catch (error) {
		if (options.allowedExitCodes?.includes(error.code)) {
			return { code: error.code, stdout: (error.stdout || "").trim() };
		}

		const details = error.stderr?.trim() || error.message;
		throw new Error(`${command} failed: ${details}`, { cause: error });
	}
}

function getPluginSection(contents: string) {
	const sectionStart = contents.search(/^\[plugin\]\s*$/m);
	if (sectionStart === -1) {
		throw new Error("millennium.toml is missing its [plugin] section.");
	}

	const nextSection = contents.indexOf("\n[", sectionStart);
	return {
		end: nextSection === -1 ? contents.length : nextSection + 1,
		start: sectionStart,
	};
}

export function updatePluginMetadata(contents: string, version: string) {
	const { start, end } = getPluginSection(contents);
	const section = contents.slice(start, end);
	const versionLine = /^version\s*=\s*"[^"]*"\s*$/gm;
	const matches = [...section.matchAll(versionLine)];
	if (matches.length !== 1) {
		throw new Error(
			"millennium.toml [plugin] section must contain one version field.",
		);
	}

	const updatedSection = section.replace(versionLine, `version = "${version}"`);
	return `${contents.slice(0, start)}${updatedSection}${contents.slice(end)}`;
}

export function repositoryName(repositoryUrl: string) {
	const match = repositoryUrl.match(/[:/]([^/:]+?)(?:\.git)?$/);
	if (!match) {
		throw new Error(
			`Cannot determine the repository name from ${repositoryUrl}.`,
		);
	}
	return match[1];
}

export async function readPluginMetadata(filePath: string) {
	const contents = await readFile(filePath, "utf8");
	const { start, end } = getPluginSection(contents);
	const section = contents.slice(start, end);
	const name = section.match(/^name\s*=\s*"([^"]+)"\s*$/m)?.[1];
	const id = section.match(/^id\s*=\s*"([^"]+)"\s*$/m)?.[1];
	if (!name || !id) {
		throw new Error(
			"millennium.toml [plugin] section must contain name and id fields.",
		);
	}
	return { id, name };
}

export function tokenEnvironment() {
	const token = process.env.GH_TOKEN;
	if (!token) {
		throw new Error(
			"GH_TOKEN is required to fork the PluginDatabase and open its update PR.",
		);
	}
	return { GH_TOKEN: token };
}
