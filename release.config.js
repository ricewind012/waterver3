/** biome-ignore-all lint/suspicious/noTemplateCurlyInString: NOPE */

/** @type {import("semantic-release").GlobalConfig} */
export default {
	plugins: [
		"@semantic-release/commit-analyzer",
		"@semantic-release/release-notes-generator",
		//"@sebbo2002/semantic-release-jsr",
		["@semantic-release/npm", { npmPublish: false }],
		[
			"@semantic-release/exec",
			{
				prepareCmd: "node scripts/update-jsr-version.js ${nextRelease.version}",
			},
		],
		[
			"@semantic-release/git",
			{
				assets: ["package.json", "jsr.json"],
				message: "chore(release): ${nextRelease.version} [skip ci]",
			},
		],
		"@semantic-release/github",
	],
};
