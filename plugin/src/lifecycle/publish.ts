import SemanticReleaseError from "@semantic-release/error";
import type { PublishContext } from "semantic-release";

import { DEFAULT_CONFIG, millenniumConfig, run, tmpDir } from "../shared.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DB_REPO = "SteamClientHomebrew/PluginDatabase";

function runGhCli(...args: readonly string[]) {
	return run("gh", args);
}

function runGitAsMe(login: string, args: readonly string[]) {
	return run("git", [
		"-c",
		"credential.helper=!gh auth git-credential",
		"-c",
		`user.name=${login}`,
		"-c",
		`user.email=${login}@users.noreply.github.com`,
		...args,
	]);
}

export async function publish(config = DEFAULT_CONFIG, ctx: PublishContext) {
	if (!config.openDatabasePr) {
		return;
	}

	// prepare semantic-release
	const { repositoryUrl } = ctx.options;
	const { notes, gitTag, version } = ctx.nextRelease;
	if (!repositoryUrl || !notes) {
		const obj = JSON.stringify({ notes, repositoryUrl });
		throw new SemanticReleaseError(
			`semantic-release did not pass one of: ${obj}`,
		);
	}

	// prepare git
	const [login, repoName] = new URL(repositoryUrl).pathname.slice(1).split("/");
	await runGhCli("repo", "fork", DB_REPO, "--clone", "--", tmpDir);
	process.chdir(tmpDir);

	// real shit
	const { stdout: defBranch } = await run("git", [
		"symbolic-ref",
		"--short",
		"refs/remotes/origin/HEAD",
	]);
	const [, databaseBranch] = defBranch.split("/");
	// TODO: useless?
	const upstreamRemote = await run("git", ["remote", "get-url", "upstream"], {
		// returns 2 when there's no "upstream" remote
		allowedExitCodes: [2],
	});
	const remoteGitCmd = upstreamRemote.code === 0 ? "set-url" : "add";
	const upstream = `https://github.com/${DB_REPO}.git`;
	await run("git", ["remote", remoteGitCmd, "upstream", upstream]);
	await run("git", ["fetch", "upstream", databaseBranch]);
	const prBranch = `${repoName}/v${version}`;
	await run("git", ["switch", "-c", prBranch, "FETCH_HEAD"]);

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
		// returns 1 when no submodule path matches
		{ allowedExitCodes: [1] },
	);
	const submodulePath = join("plugins", repoName);
	const hasSubmodule = submodules.stdout
		.split("\n")
		.some((e) => e.endsWith(` ${submodulePath}`));
	await runGitAsMe(
		"git",
		hasSubmodule
			? ["submodule", "update", "--init", submodulePath]
			: ["submodule", "add", repositoryUrl, submodulePath],
	);

	await run("git", ["-C", submodulePath, "fetch", "origin", "--tags"]);
	const { stdout: targetCommit } = await run("git", [
		"-C",
		submodulePath,
		"rev-parse",
		"--verify",
		`${gitTag}^{commit}`,
	]);
	await run("git", ["-C", submodulePath, "checkout", "--detach", targetCommit]);
	await runGitAsMe(login, ["add", ".gitmodules", submodulePath]);
	const diff = await run(
		"git",
		["diff", "--cached", "--quiet", ".gitmodules", submodulePath],
		// returns 1 when there are not staged changes
		{ allowedExitCodes: [1] },
	);
	if (diff.code === 0) {
		ctx.logger.log("PluginDatabase already references this release");
		return;
	}

	const firstRelease = !!ctx.lastRelease?.version;
	const { plugin } = millenniumConfig.content;
	const title = firstRelease
		? `Update ${plugin.name} to ${version}`
		: `Add ${plugin.name}`;
	const templatePath = firstRelease
		? join("PULL_REQUEST_TEMPLATE", "PLUGIN-UPDATE.md")
		: "pull_request_template.md";

	/*
	const { stdout: template } = await runGhCli(
		"api",
		`repos/${DB_REPO}/contents/.github/${templatePath}.md?ref=${databaseBranch}`,
		"--jq",
		".content",
	);
	*/
	const template = await readFile(join(".github", templatePath), "utf8");
	const body = template
		.replace("# REPLACE_WITH_PLUGIN_NAME", `# ${plugin.name}`)
		.replace(/REPLACE_WITH_UPDATE_SUMMARY/g, notes.replace(/^# [^\n]+/, ""));

	await runGitAsMe(login, ["commit", "-m", title]);
	await runGitAsMe(login, ["push", "-u", "origin", prBranch]);
	if (false) {
		await runGhCli(
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
		);
		ctx.logger.log(`Opened plugin database PR for ${plugin.name} ${version}`);
	}
}
