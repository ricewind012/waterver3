import SemanticReleaseError from "@semantic-release/error";
import type { PrepareContext } from "semantic-release";

import {
	cleanup,
	millenniumConfig,
	run,
	runGhCli,
	tmpDir,
	tokenEnvironment,
} from "../shared.js";
import { join } from "node:path";

const DB_REPO = "SteamClientHomebrew/PluginDatabase";

const env = tokenEnvironment;
const errors: Error[] = [];

function error(msg: string) {
	errors.push(new SemanticReleaseError(msg));
}

export async function openDatabasePr(ctx: PrepareContext, changelog: string) {
	const { repositoryUrl } = ctx.options;
	const branch = ctx.branch.name;
	const { gitTag, version } = ctx.nextRelease;

	const { stdout: login } = await runGhCli("api", "user", "--jq", ".login");
	const { stdout: databaseBranch } = await runGhCli(
		"api",
		`repos/${DB_REPO}`,
		"--jq",
		".default_branch",
	);
	await runGhCli("repo", "fork", DB_REPO, "--clone", "--", tmpDir);
	await run(
		"git",
		[
			"remote",
			"set-url",
			"origin",
			`https://github.com/${login}/PluginDatabase.git`,
		],
		{ cwd: tmpDir },
	);
	await run("git", ["config", "credential.helper", "!gh auth git-credential"], {
		cwd: tmpDir,
	});
	await run("git", ["config", "user.name", login], {
		cwd: tmpDir,
	});
	await run(
		"git",
		["config", "user.email", `${login}@users.noreply.github.com`],
		{ cwd: tmpDir },
	);

	const upstreamRemote = await run("git", ["remote", "get-url", "upstream"], {
		// Git returns 2 when there's no "upstream" remote
		allowedExitCodes: [2],
		cwd: tmpDir,
	});
	const remoteGitCmd = upstreamRemote.code === 0 ? "set-url" : "add";
	const upstream = `https://github.com/${DB_REPO}.git`;
	await run("git", ["remote", remoteGitCmd, "upstream", upstream], {
		cwd: tmpDir,
	});
	await run("git", ["fetch", "upstream", databaseBranch], {
		cwd: tmpDir,
	});
	const repoName = new URL(repositoryUrl).pathname.slice(1);
	const prBranch = `${repoName}/v${version}`;
	await run("git", ["switch", "--create", prBranch, "FETCH_HEAD"], {
		cwd: tmpDir,
	});

	const { plugin } = millenniumConfig.content;
	const submodulePath = join("plugins", plugin.id);
	const gitmodulesPath = join(tmpDir, ".gitmodules");
	const submodules = await run(
		"git",
		[
			"config",
			"--file",
			gitmodulesPath,
			"--get-regexp",
			"^submodule\\..*\\.path$",
		],
		// Git returns 1 when no submodule path matches
		{ allowedExitCodes: [1], cwd: tmpDir },
	);
	const hasSubmodule = submodules.stdout
		.split("\n")
		.some((e) => e.endsWith(` ${submodulePath}`));

	await run(
		"git",
		hasSubmodule
			? ["submodule", "update", "--init", "--", submodulePath]
			: ["submodule", "add", "--branch", branch, repositoryUrl, submodulePath],
		{ cwd: tmpDir },
	);

	await run("git", ["-C", submodulePath, "fetch", "origin", "--tags"], {
		cwd: tmpDir,
	});
	const targetCommit = await run(
		"git",
		["-C", submodulePath, "rev-parse", "--verify", `${gitTag}^{commit}`],
		{ cwd: tmpDir },
	);
	await run(
		"git",
		["-C", submodulePath, "checkout", "--detach", targetCommit.stdout],
		{ cwd: tmpDir },
	);
	await run("git", ["add", "--", ".gitmodules", submodulePath], {
		cwd: tmpDir,
	});
	const diff = await run(
		"git",
		["diff", "--cached", "--quiet", "--", ".gitmodules", submodulePath],
		// Git returns 1 when there are not staged changes
		{ allowedExitCodes: [1], cwd: tmpDir },
	);
	if (diff.code === 0) {
		ctx.logger.log("PluginDatabase already references this release");
		return;
	}

	const firstRelease = !!ctx.lastRelease?.version;
	const title = firstRelease
		? `Update ${plugin.name} to ${version}`
		: `Add ${plugin.name}`;
	const templatePath = firstRelease
		? "PULL_REQUEST_TEMPLATE/PLUGIN-UPDATE"
		: "pull_request_template";

	/*
	const {stdout:template} = await runGhCli(
		"api",
		`repos/${DB_REPO}/contents/.github/${templatePath}?ref=${encodeURIComponent(databaseBranch)}`,
		"--jq",
		".content",
	);
	*/
	const fetched = await fetch(
		`https://raw.githubusercontent.com/${DB_REPO}/refs/heads/${branch}/.github/${templatePath}`,
	);
	if (!fetched.ok) {
		error(`Template URL returned ${fetched.status}: ${fetched.statusText}`);
	}

	const body = (await fetched.text())
		.replace("REPLACE_WITH_PLUGIN_NAME", plugin.name)
		.replace("REPLACE_WITH_UPDATE_SUMMARY", changelog);

	if (errors.length > 0) {
		throw new AggregateError(errors);
	}

	await run("git", ["commit", "-m", title], { cwd: tmpDir });
	await run("git", ["push", "-u", "origin", prBranch], { cwd: tmpDir });
	await run(
		"gh",
		[
			"pr",
			"create",
			"--repo",
			DB_REPO,
			"--base",
			databaseBranch,
			"--head",
			`${login}:${prBranch}`,
			"--title",
			title,
			"--body",
			body,
		],
		{ cwd: tmpDir, env },
	);
	ctx.logger.log(`Opened plugin database PR for ${plugin.name} ${version}`);

	await cleanup();
}
