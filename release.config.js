/** biome-ignore-all lint/suspicious/noTemplateCurlyInString: semantic-release */

/** @type {import("semantic-release").GlobalConfig} */
export default {
	plugins: [
		"@semantic-release/commit-analyzer",
		"@semantic-release/release-notes-generator",
		"@semantic-release/npm",
		[
			"@semantic-release/git",
			{
				assets: ["millennium.toml"],
				message: "chore(release): ${nextRelease.version} [skip ci]",
			},
		],
		"@semantic-release/github",
		"./plugin/src/index.ts",
	],
};
