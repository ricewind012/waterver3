# semantic-release-millennium

This plugin bumps your `millennium.toml` version and optionally opens a PR for your Millennium plugin in the [plugin database][plugin-db].

> [!NOTE]
> In the PR template, you will have to fill in the description when opening your first PR, and check the checkboxes both by yourself.

## Usage

### Config

```js
export default {
	plugins: [
		"@semantic-release/commit-analyzer",
		"@semantic-release/release-notes-generator",
		"@semantic-release/npm",
		"@ricewind012/semantic-release-millennium",
		[
			"@semantic-release/git",
			{
				assets: ["millennium.toml", "package.json", "package-lock.json"],
			},
		],
		"@semantic-release/github",
	],
};
```

The [@semantic-release/commit-analyzer][sr-commit-analyzer] and [@semantic-release/release-notes-generator][sr-release-notes-generator] plugins need to go _before_ this plugin in order to get the changelog for the PR template.

The [@semantic-release/git][sr-git] plugin has to go _after_ this plugin in order to bump the version in `millennium.toml`.

### CI

Provide `GH_TOKEN` for GitHub CLI authentication in CI:

```yaml
- name: Release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GH_TOKEN: ${{ secrets.GH_TOKEN }}
  run: npx semantic-release
```

## Options

| Option         | Description                                               | Default |
| -------------- | --------------------------------------------------------- | ------- |
| openDatabasePr | Open a PR to the Millennium [plugin database][plugin-db]? | false   |

[plugin-db]: https://github.com/SteamClientHomebrew/PluginDatabase
[sr-commit-analyzer]: https://github.com/semantic-release/commit-analyzer
[sr-git]: https://github.com/semantic-release/git
[sr-release-notes-generator]: https://github.com/semantic-release/release-notes-generator
