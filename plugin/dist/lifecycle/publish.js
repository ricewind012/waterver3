import SemanticReleaseError from "@semantic-release/error";
import { cleanup, DEFAULT_CONFIG, millenniumConfig, run, runGhCli, tmpDir, tokenEnvironment, } from "../shared.js";
import { join } from "node:path";
const DB_REPO = "SteamClientHomebrew/PluginDatabase";
const env = tokenEnvironment;
export async function publish(config = DEFAULT_CONFIG, ctx) {
    if (!config.openDatabasePr) {
        return;
    }
    const { repositoryUrl } = ctx.options;
    const branch = ctx.branch.name;
    const { notes, gitTag, version } = ctx.nextRelease;
    if (!repositoryUrl || !notes) {
        const obj = JSON.stringify({ notes, repositoryUrl });
        throw new SemanticReleaseError(`semantic-release did not pass one of: ${obj}`);
    }
    const [login, repoName] = new URL(repositoryUrl).pathname.slice(1).split("/");
    const { stdout: databaseBranch } = await runGhCli("api", `repos/${DB_REPO}`, "--jq", ".default_branch");
    await runGhCli("repo", "fork", DB_REPO, "--clone", "--", tmpDir);
    process.chdir(tmpDir);
    await run("git", [
        "remote",
        "set-url",
        "origin",
        `https://github.com/${login}/PluginDatabase.git`,
    ]);
    await run("git", ["config", "credential.helper", "!gh auth git-credential"]);
    await run("git", ["config", "user.name", login]);
    await run("git", [
        "config",
        "user.email",
        `${login}@users.noreply.github.com`,
    ]);
    const upstreamRemote = await run("git", ["remote", "get-url", "upstream"], {
        // Git returns 2 when there's no "upstream" remote
        allowedExitCodes: [2],
    });
    const remoteGitCmd = upstreamRemote.code === 0 ? "set-url" : "add";
    const upstream = `https://github.com/${DB_REPO}.git`;
    await run("git", ["remote", remoteGitCmd, "upstream", upstream]);
    await run("git", ["fetch", "upstream", databaseBranch]);
    const prBranch = `${repoName}/v${version}`;
    await run("git", ["switch", "--create", prBranch, "FETCH_HEAD"]);
    const { plugin } = millenniumConfig.content;
    const submodulePath = join("plugins", plugin.id);
    const gitmodulesPath = join(tmpDir, ".gitmodules");
    const submodules = await run("git", [
        "config",
        "--file",
        gitmodulesPath,
        "--get-regexp",
        "^submodule\\..*\\.path$",
    ], 
    // Git returns 1 when no submodule path matches
    { allowedExitCodes: [1] });
    const hasSubmodule = submodules.stdout
        .split("\n")
        .some((e) => e.endsWith(` ${submodulePath}`));
    await run("git", hasSubmodule
        ? ["submodule", "update", "--init", "--", submodulePath]
        : ["submodule", "add", "--branch", branch, repositoryUrl, submodulePath]);
    await run("git", ["-C", submodulePath, "fetch", "origin", "--tags"]);
    const targetCommit = await run("git", [
        "-C",
        submodulePath,
        "rev-parse",
        "--verify",
        `${gitTag}^{commit}`,
    ]);
    await run("git", [
        "-C",
        submodulePath,
        "checkout",
        "--detach",
        targetCommit.stdout,
    ]);
    await run("git", ["add", "--", ".gitmodules", submodulePath]);
    const diff = await run("git", ["diff", "--cached", "--quiet", "--", ".gitmodules", submodulePath], 
    // Git returns 1 when there are not staged changes
    { allowedExitCodes: [1] });
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
    const fetched = await fetch(`https://raw.githubusercontent.com/${DB_REPO}/refs/heads/${branch}/.github/${templatePath}`);
    if (!fetched.ok) {
        throw new SemanticReleaseError(`Template URL returned ${fetched.status}: ${fetched.statusText}`);
    }
    const body = (await fetched.text())
        .replace("REPLACE_WITH_PLUGIN_NAME", plugin.name)
        .replace("REPLACE_WITH_UPDATE_SUMMARY", notes.slice(notes.indexOf("\n"), notes.length));
    console.log({ login, repoName });
    console.log({ body, firstRelease, prBranch, title });
    return;
    await run("git", ["commit", "-m", title]);
    await run("git", ["push", "-u", "origin", prBranch]);
    await runGhCli("pr", "create", "--repo", DB_REPO, "--base", databaseBranch, "--head", `${login}:${prBranch}`, "--title", title, "--body", body);
    ctx.logger.log(`Opened plugin database PR for ${plugin.name} ${version}`);
    await cleanup();
}
