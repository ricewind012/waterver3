# semantic-release-millennium

This plugin updates the version in your `millennium.toml` and optionally opens a pull request for your Millennium plugin in the [plugin database][plugin-db].

> [!NOTE]
> You must still do the following yourself:
>
> - Fill in the PR template's description for the first release
> - Check the boxes in the PR template

## Usage

First, fork the [plugin database][plugin-db] repository so that CI can use it.

### Config

```js
export default {
	plugins: [
		"@semantic-release/commit-analyzer",
		"@semantic-release/release-notes-generator",
		"@semantic-release/npm",
		"@semantic-release/github",
		"@ricewind012/semantic-release-millennium",
		[
			"@semantic-release/git",
			{
				assets: ["millennium.toml", "package.json", "package-lock.json"],
			},
		],
	],
};
```

The [@semantic-release/commit-analyzer][sr-commit-analyzer] and [@semantic-release/release-notes-generator][sr-release-notes-generator] plugins _before_ this plugin to generate the release notes used in the PR template.

The [@semantic-release/git][sr-git] plugin has to go _after_ this plugin so it can commit the updated version in `millennium.toml`.

### CI

Make a personal access token with the `public_repo` (to fork repos) and `workflow` (to ) scopes, then set `GH_TOKEN` to authenticate the GitHub CLI:

```yaml
- name: Release
  env:
    GH_TOKEN: ${{ secrets.PAT_TOKEN }}
  run: npx semantic-release
```

## Options

| Option           | Description                                                          | Default |
| ---------------- | -------------------------------------------------------------------- | ------- |
| `openDatabasePr` | Whether to open a PR in the Millennium [plugin database][plugin-db]. | `false` |

[plugin-db]: https://github.com/SteamClientHomebrew/PluginDatabase
[sr-commit-analyzer]: https://github.com/semantic-release/commit-analyzer
[sr-git]: https://github.com/semantic-release/git
[sr-release-notes-generator]: https://github.com/semantic-release/release-notes-generator
