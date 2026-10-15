import {
	DB_REPO,
	readPluginMetadata,
	repositoryName,
	run,
	tokenEnvironment,
} from "../shared";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function success(_pluginConfig: any, context: any) {
	const env = tokenEnvironment();
	const repositoryUrl = context.options.repositoryUrl;
	const branch = context.branch?.name;
	const version = context.nextRelease?.version;
	const gitTag = context.nextRelease?.gitTag;
	if (!repositoryUrl || !branch || !version || !gitTag) {
		throw new Error(
			"semantic-release did not provide the repository, branch, version, or git tag.",
		);
	}

	const cwd = context.cwd;
	const configPath = path.join(cwd, "millennium.toml");
	const { id, name } = await readPluginMetadata(configPath);
	const repoName = repositoryName(repositoryUrl);
	const submodulePath = path.posix.join("plugins", id);
	const tempDirectory = await mkdtemp(
		path.join(os.tmpdir(), "plugin-database-"),
	);

	try {
		const login = await run("gh", ["api", "user", "--jq", ".login"], { env });
		const databaseBranchResult = await run(
			"gh",
			["api", `repos/${DB_REPO}`, "--jq", ".default_branch"],
			{ env },
		);
		const databaseBranch = databaseBranchResult.stdout;
		await run("gh", ["repo", "fork", DB_REPO, "--clone", "--", tempDirectory], {
			env,
		});
		await run(
			"git",
			[
				"remote",
				"set-url",
				"origin",
				`https://github.com/${login.stdout}/PluginDatabase.git`,
			],
			{ cwd: tempDirectory },
		);
		await run(
			"git",
			["config", "credential.helper", "!gh auth git-credential"],
			{ cwd: tempDirectory },
		);
		await run("git", ["config", "user.name", login.stdout], {
			cwd: tempDirectory,
		});
		await run(
			"git",
			["config", "user.email", `${login.stdout}@users.noreply.github.com`],
			{ cwd: tempDirectory },
		);
		const upstream = `https://github.com/${DB_REPO}.git`;
		const upstreamRemote = await run("git", ["remote", "get-url", "upstream"], {
			allowedExitCodes: [2],
			cwd: tempDirectory,
		});
		if (upstreamRemote.code === 0) {
			await run("git", ["remote", "set-url", "upstream", upstream], {
				cwd: tempDirectory,
			});
		} else {
			await run("git", ["remote", "add", "upstream", upstream], {
				cwd: tempDirectory,
			});
		}
		await run("git", ["fetch", "upstream", databaseBranch], {
			cwd: tempDirectory,
		});
		const pullRequestBranch = `${repoName}/v${version}`;
		await run("git", ["switch", "--create", pullRequestBranch, "FETCH_HEAD"], {
			cwd: tempDirectory,
		});

		const gitmodulesPath = path.join(tempDirectory, ".gitmodules");
		const submodules = await run(
			"git",
			[
				"config",
				"--file",
				gitmodulesPath,
				"--get-regexp",
				"^submodule\\..*\\.path$",
			],
			{ allowedExitCodes: [1], cwd: tempDirectory },
		);
		const hasSubmodule = submodules.stdout
			.split("\n")
			.some((entry) => entry.endsWith(` ${submodulePath}`));

		if (hasSubmodule) {
			await run("git", ["submodule", "update", "--init", "--", submodulePath], {
				cwd: tempDirectory,
			});
		} else {
			await run(
				"git",
				["submodule", "add", "--branch", branch, repositoryUrl, submodulePath],
				{ cwd: tempDirectory },
			);
		}

		await run("git", ["-C", submodulePath, "fetch", "origin", "--tags"], {
			cwd: tempDirectory,
		});
		const targetCommit = await run(
			"git",
			["-C", submodulePath, "rev-parse", "--verify", `${gitTag}^{commit}`],
			{ cwd: tempDirectory },
		);
		await run(
			"git",
			["-C", submodulePath, "checkout", "--detach", targetCommit.stdout],
			{ cwd: tempDirectory },
		);
		await run("git", ["add", "--", ".gitmodules", submodulePath], {
			cwd: tempDirectory,
		});
		const diff = await run(
			"git",
			["diff", "--cached", "--quiet", "--", ".gitmodules", submodulePath],
			{ allowedExitCodes: [1], cwd: tempDirectory },
		);
		if (diff.code === 0) {
			context.logger.log("PluginDatabase already references this release.");
			return;
		}

		const title = context.lastRelease?.version
			? `Update ${name} to ${version}`
			: `Add ${name}`;
		const templatePath = context.lastRelease?.version
			? "PULL_REQUEST_TEMPLATE/PLUGIN-UPDATE"
			: "pull_request_template";
		const template = await run(
			"gh",
			[
				"api",
				`repos/${DB_REPO}/contents/.github/${templatePath}?ref=${encodeURIComponent(databaseBranch)}`,
				"--jq",
				".content",
			],
			{ env },
		);
		const body = Buffer.from(template.stdout, "base64").toString("utf8").trim();

		await run("git", ["commit", "-m", title], { cwd: tempDirectory });
		await run("git", ["push", "--set-upstream", "origin", pullRequestBranch], {
			cwd: tempDirectory,
		});
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
				`${login.stdout}:${pullRequestBranch}`,
				"--title",
				title,
				"--body",
				body,
			],
			{ cwd: tempDirectory, env },
		);
		context.logger.log(
			`Opened PluginDatabase update PR for ${name} ${version}.`,
		);
	} finally {
		await rm(tempDirectory, { force: true, recursive: true });
	}
}
