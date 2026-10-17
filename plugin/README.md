# semantic-release-millennium

This plugin bumps your `millennium.toml` version and optionally opens a PR for your Millennium plugin in the [plugin database][plugin-db].

> [!NOTE]
> You will still have to do these things by yourself:
>
> - filling in the description for the PR template _on first release_
> - checking the checkboxes for the PR template

## Usage

First of all, you will have to fork the [plugin database][plugin-db] repository in order for CI to be able to use it.

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

The [@semantic-release/commit-analyzer][sr-commit-analyzer] and [@semantic-release/release-notes-generator][sr-release-notes-generator] plugins need to go _before_ this plugin in order to get the changelog for the PR template.

The [@semantic-release/git][sr-git] plugin has to go _after_ this plugin in
order to bump the version in `millennium.toml`.

TODO: ^ real?

### CI

Provide `GH_TOKEN` for GitHub CLI authentication in CI:

```yaml
- name: Release
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
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
