

<div align="center">

<a href="https://www.linkedin.com/in/coltenkrauter/" target="_blank"><img src="https://img.shields.io/badge/LinkedIn-%230077B5.svg?&style=flat-square&logo=linkedin&logoColor=white" alt="LinkedIn"></a>
![GitHub Action Status](https://github.com/krauters/github-notifier/workflows/Tests/badge.svg)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-GitHub%20Notifier-blue)](https://github.com/marketplace/actions/github-notifier-by-krauters)
![License](https://img.shields.io/github/license/krauters/github-notifier)
![visitors](https://visitor-badge.laobi.icu/badge?page_id=krauters.github-notifier)

![Version](https://img.shields.io/github/v/release/krauters/github-notifier)
[![npm version](https://img.shields.io/npm/v/@krauters/github-notifier.svg?style=flat-square)](https://www.npmjs.org/package/@krauters/github-notifier)
![GitHub Stars](https://img.shields.io/github/stars/krauters/github-notifier)
![Forks](https://img.shields.io/github/forks/krauters/github-notifier)

![GitHub Issues](https://img.shields.io/github/issues/krauters/github-notifier)
![Open PRs](https://img.shields.io/github/issues-pr/krauters/github-notifier)
![Commits per Month](https://img.shields.io/github/commit-activity/m/krauters/github-notifier)
![Contributors](https://img.shields.io/github/contributors/krauters/github-notifier)
![Last Commit](https://img.shields.io/github/last-commit/krauters/github-notifier)

[![install size](https://img.shields.io/badge/dynamic/json?url=https://packagephobia.com/v2/api.json?p=@krauters/github-notifier&query=$.install.pretty&label=install%20size&style=flat-square)](https://packagephobia.now.sh/result?p=@krauters/github-notifier)
![Code Size](https://img.shields.io/github/languages/code-size/krauters/github-notifier)
![Repo Size](https://img.shields.io/github/repo-size/krauters/github-notifier)

</div>

# GitHub Notifier

Post Open Pull Requests to Slack.

![GitHub Notifier Example](./images/example.png)

[Simple Usage Example](https://github.com/krauters/github-slack-notifier)

**GitHub Notifier** is a _TypeScript_ [GitHub Action](https://docs.github.com/en/actions) that posts open pull requests to Slack channels based on a [scheduled job](https://crontab.guru/) to remind team members to review pull requests.

## Overview

This _GitHub Action_ will query the GitHub (or GitHub Enterprise) org for all repositories (based on token permissions) and then, for each repository it will check for open pull requests. Then, it will attempt to match any related GitHub users to Slack users before building [Slack blocks](https://app.slack.com/block-kit-builder/T025EE5RS#%7B%22blocks%22:%5B%5D%7D) and posting a message (or multiple messages in the case of many PRs) to the designated Slack channels. 

## Quick start

1. (Optional) Start by creating a repository called `github-notifier`.
    1. Whatever repo you use to host this workflow needs to be able to use GitHub Runners.
1. [Generate a GitHub token](https://github.com/settings/tokens?type=beta) – You’ll need a fine-grained GitHub token with resource owner being an organization that allows access to either all your repositories or just the ones you want notifications about.

    Here are the specific permissions the token needs:

    - **Repository Administration: read** – This lets the token list repositories within the organization.
    - **Repository Pull Requests: read** – Required to fetch details about pull requests.
    - **Repository Contents: read** – Allows the token to check the status of repository branch protections.
    - **Organization Members: read** – Required to retrieve GitHub email addresses for matching them with Slack users.

    Make sure the token is created by an organization owner, as it must belong to the organization where the relevant repositories and pull requests live.


    1. Save the token in your repository by going to `Settings` > `Secrets and variables` > `Actions` > `New repository secret`, and name it **GH_TOKEN_GH_NOTIFIER**.

1. [Create a Slack App](https://api.slack.com/apps) either _from scratch_ or by using a pre-defined [manifest file](./manafest.json).

    - To create from scratch: Start a new app called `GitHub Notifier` and add it to your Slack workspace.
    - To use the manifest: On the Slack App creation page, select "From an app manifest" and upload your `manifest.json` file to quickly set up the app.

    1. On the **OAuth & Permissions** page, assign the following scopes to the bot,

        - **chat:write** – So the bot can post messages in Slack channels.
        - **users:read** – To look up Slack users for matching with GitHub accounts.
        - **users:read.email** – Allows the bot to retrieve Slack user emails for matching with GitHub accounts.
        - **chat:write.customize** – This enables the bot to modify its display name and avatar when posting.

    1. On the **OAuth & Permissions** page, click `Install To Workspace`, then copy the `User OAuth Token`.
    1. Save this token in your repository at `Settings` > `Secrets and variables` > `Actions` > `New repository secret`, naming it **SLACK_TOKEN_GH_NOTIFIER**.
    1. Add the Slack app you just created to the relevant Slack channel(s) and note down the channel IDs for the workflow.

1. Set up a workflow similar to this:
    ```yaml
    # .github/workflows/github-notifier.yaml

    name: GitHub Notifier

    on:
      schedule:
      - cron: 0 15,17,19,21,23 * * 1-5
      workflow_dispatch:

    jobs:
      github-notifier:
        runs-on: ubuntu-latest
        steps:
        - uses: krauters/github-notifier@main
          with:
            github-tokens: ${{ secrets.GH_TOKEN_GH_NOTIFIER }}, ${{ secrets.GH_TOKEN_GH_NOTIFIER_FOR_ANOTHER_ORG }}
            channels: C07L8EWB389
            slack-token: ${{ secrets.SLACK_TOKEN_GH_NOTIFIER }}
    ```
    
    For more details about available inputs, you can check out the [action definition file, action.yaml](./action.yaml).

## Input Variables

See [action.yaml](./action.yaml) for more detailed information.

| Name                  | Description                                                                                 | Required | Default  |
|-----------------------|---------------------------------------------------------------------------------------------|----------|----------|
| `github-tokens`       | Comma Comma-separated list of fine grained Github tokens (one per GitHub organization) with scopes for administration, PR details, and members.| Yes      |          |
| `slack-token`         | Permissions to post to Slack and perform user lookups.                                       | Yes      |          |
| `channels`            | Comma-separated list of Slack channel IDs to post to.                                        | Yes      |          |
| `with-archived`       | Include PRs from archived repositories.                                                      | No       | `false`  |
| `with-public`         | Include PRs from public repositories.                                                        | No       | `true`   |
| `with-drafts`         | Include draft PRs.                                                                           | No       | `false`  |                   | No       | `false`  |
| `with-user-mentions`  | Allow Slack user mentions.                                                                   | No       | `true`   |
| `repository-filter`   | Comma-separated list of repositories to scan.                                                | No       |          |
| `base-url`            | Base GitHub API URL (e.g., https://api.github.com).                                          | No       |          |

## Troubleshooting

```
Error: An API error occurred: channel_not_found
```


This error means the Slack app probably wasn’t added to the channel you’re trying to post in.

## Husky

Husky helps manage Git hooks easily, automating things like running tests or linting before a commit is made. This ensures your code is in good shape.

Pre-commit hooks run scripts before a commit is finalized to catch issues or enforce standards. With Husky, setting up these hooks across your team becomes easy, keeping your codebase clean and consistent.

### Our Custom Pre-Commit Hook

This project uses a custom pre-commit hook to run `npm run bundle`. This ensures that our bundled assets are always up to date before any commit (which is especially important for TypeScript GitHub Actions). Husky automates this, so no commits will go through without a fresh bundle, keeping everything streamlined.

## Contributing

The goal of this project is to continually evolve and improve its core features, making it more efficient and easier to use. Development happens openly here on GitHub, and we’re thankful to the community for contributing bug fixes, enhancements, and fresh ideas. Whether you're fixing a small bug or suggesting a major improvement, your input is invaluable.

## License

This project is licensed under the ISC License. Please see the [LICENSE](./LICENSE) file for more details.

## 🥂 Thanks Contributors

Thanks for spending time on this project.

<a href="https://github.com/krauters/github-notifier/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=krauters/github-notifier" />
</a>

## References to this project

- [Stack Overflow / Customizing slack notification for Github pull requests](https://stackoverflow.com/questions/66948900/customizing-slack-notification-for-github-pull-requests/78949579#78949579)

- [Reddit / Recommended slack app to post github pull requests notifications?](https://www.reddit.com/r/Slack/comments/1e3pdfr/comment/llhfu11/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button)

- [GitHub Discussions / Best way to send slack to developers notifications daily about new PRs, new issues or new comments?](https://github.com/orgs/community/discussions/70288)

<br />
<br />
<a href="https://www.buymeacoffee.com/coltenkrauter"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=coltenkrauter&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>
