// https://github.com/actions/github-script

import type { KnownBlock } from '@slack/web-api'

import { context } from '@actions/github'
import { formatStringList, plural, snapDate, SnapType } from '@krauters/utils'

import type { RunProps } from './structures.js'

import pkg from '../package.json' with { type: 'json' }
import { workflowLogsUrl, workflowUrl } from './defaults.js'
import { GitHubClient } from './utils/github/github-client.js'
import { Pull, PullState, RepositoryType } from './utils/github/structures.js'
import { getFirstBlocks, getLastBlocks, getPullBlocks } from './utils/slack/blocks.js'
import { SlackClient } from './utils/slack/slack-client.js'
import { getApprovedPullRequest } from './utils/test-data.js'

const { homepage, name, version } = pkg

/**
 * Runs the GitHub Notifier to query GitHub for open pull requests and then post messages to Slack channels.
 *
 * @param props Configurable properties of the GitHub Notifier.
 */
export async function run({
	githubProps,
	repositoryFilter,
	slackProps,
	withArchived,
	withDrafts,
	withPublic,
	withPullReport,
	withTestData,
	withUserMentions,
}: RunProps): Promise<void> {
	const slack = new SlackClient(slackProps)

	const openPulls: Pull[] = []
	githubProps.forEach(async (props) => {
		const client = new GitHubClient(props)
		const repositories = await client.getRepositories({
			repositoryFilter,
			type: RepositoryType.All,
			withArchived,
			withPublic,
		})
		openPulls.push(...(await client.getPulls({ repositories, state: PullState.Open, withDrafts })))
	})

	await slack.enforceAppNamePattern(/.*github[\s-_]?notifier$/i)

	let blocks: KnownBlock[] = []
	for (const openPull of openPulls) {
		console.log(`Building Slack blocks from pull request [${openPull.number}]`)

		blocks = [...blocks, ...(await getPullBlocks(openPull, slack, withUserMentions))]
	}

	if (withTestData) {
		console.log(`With test data: [${withTestData}]`)
		const testDataPullRequest = getApprovedPullRequest()
		for (let i = 1; i <= 2; i++) {
			blocks = [
				...blocks,
				...(await getPullBlocks({ ...testDataPullRequest, number: i }, slack, withUserMentions)),
			]
		}
	}

	const total = openPulls.length
	let header = `You've got ${total} open pull ${plural('request', total)}.`
	if (total === 0) {
		header = 'There are no open pull requests! :tada:'
	}

	let text
	if (repositoryFilter.length > 0) {
		text = `_<${workflowUrl}|Repository filter>: ${formatStringList(repositoryFilter)}_`
	}

	blocks = [...getFirstBlocks('fake-org', header, text), ...blocks]

	blocks = [
		...blocks,
		...getLastBlocks(
			[
				`Run from <${workflowUrl}|${context.repo.owner}`,
				`/${context.payload.repository?.name}> (<${workflowLogsUrl}|logs>) using <${homepage}|${name}>@<${homepage}/releases/tag/${version}|${version}>`,
			].join(''),
		),
	]

	await slack.postMessage(header, blocks)
}
