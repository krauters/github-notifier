// https://github.com/actions/github-script

import type { KnownBlock } from '@slack/web-api'

import { context } from '@actions/github'
import { debug, error as logError } from '@actions/core'
import { formatStringList, plural } from '@krauters/utils'

import pkg from '../package.json' with { type: 'json' }
import { workflowLogsUrl, workflowUrl } from './constants.js'
import { GitHubClient } from './utils/github/client.js'
import type { Pull } from './utils/github/structures.js'
import { PullState, RepositoryType } from './utils/github/structures.js'
import { getFirstBlocks, getLastBlocks, getPullBlocks } from './utils/slack/blocks.js'
import { SlackClient } from './utils/slack/client.js'
import { getApprovedPullRequest } from './utils/test-data.js'
import { parseInputs as getInputs } from './input-parser.js'

const { homepage, name, version } = pkg

/**
 * The main function that gets executed when the action is run.
 */
async function main(): Promise<void> {
	try {
		debug('Starting main...')
		const {
			githubConfig,
			repositoryFilter,
			slackConfig,
			withArchived,
			withDrafts,
			withPublic,
			withTestData,
			withUserMentions,
		} = getInputs()

		const slack = new SlackClient(slackConfig)
		const results = await githubConfig.tokens.reduce(
			async (accPromise, token) => {
				const acc = await accPromise
				try {
					// TODO - Consider making this thread safe so requests can be made in parallel
					const client = new GitHubClient({
						options: githubConfig.options,
						token,
					})

					const repositories = await client.getRepositories({
						repositoryFilter,
						type: RepositoryType.All,
						withArchived,
						withPublic,
					})

					const org = await client.getOrg()
					const pulls = await client.getPulls({ repositories, state: PullState.Open, withDrafts })
					console.log(`Found ${pulls.length} pulls for ${org.name}`)

					return [...acc, { client, org: org.name, pulls }]
				} catch (error: unknown) {
					logError(
						`Failed to call to GitHub [${githubConfig.options?.baseUrl}] with last 4 chars of token [${token.slice(-4)}] with error [${error}]. Skipping this requests with this token.`,
					)

					return acc
				}
			},
			Promise.resolve([] as { client: GitHubClient; org: string; pulls: Pull[] }[]),
		)

		if (results.length === 0) {
			throw new Error('All GitHub tokens failed to process')
		}

		console.log(`Successfully processed ${results.length} out of ${githubConfig.tokens.length} tokens`)

		await slack.enforceAppNamePattern(/.*github[\s-_]?notifier$/i)

		const pulls: Pull[] = results.flatMap((result) => result.pulls)
		console.log(`Found ${pulls.length} pulls`)
		console.log(pulls)

		// Multiple tokens may have overlapping repository access, deduplicate PRs by org/repo/number
		const dedupedPulls = [...new Map(pulls.map((pull) => [`${pull.org}/${pull.repo}/${pull.number}`, pull]))].map(
			// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
			([_, pull]) => pull,
		)

		let blocks: KnownBlock[] = []
		for (const pull of dedupedPulls) {
			console.log(`Building Slack blocks from pull request [${pull.number}]`)

			blocks = [...blocks, ...(await getPullBlocks(pull, slack, withUserMentions))]
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

		const total = dedupedPulls.length
		let header = `You've got ${total} open pull ${plural('request', total)}.`
		if (total === 0) {
			header = 'There are no open pull requests! :tada:'
		}

		let text
		if (repositoryFilter.length > 0) {
			text = `_<${workflowUrl}|Repository filter>: ${formatStringList(repositoryFilter)}_`
		}

		const orgs = [...new Set(results.map((result) => result.org))]
		blocks = [...getFirstBlocks(orgs, header, text), ...blocks]

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
	} catch (err) {
		console.error('Fatal error:', err)
		process.exit(1)
	}
}

// This is required for the GitHub Action to execute main() when it invokes app.ts as specified in action.yaml
await main()
