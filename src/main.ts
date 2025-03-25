import { debug, getBooleanInput, getInput } from '@actions/core'
import { stringToArray } from '@krauters/utils'

import { run } from './app.js'

/**
 * The main function that gets executed when the action is run.
 */
export async function main(): Promise<void> {
	debug('Starting main...')
	debug('Parsing inputs...')
	const ghTokens = stringToArray(getInput('github-tokens', { required: true }))
	const channels = stringToArray(getInput('channels', { required: true }))
	const slackToken = getInput('slack-token', { required: true })
	const withTestData = getBooleanInput('with-test-data')
	const withArchived = getBooleanInput('with-archived')
	const withPublic = getBooleanInput('with-public')
	const withDrafts = getBooleanInput('with-drafts')
	const withPullReport = false
	const withUserMentions = getBooleanInput('with-user-mentions')
	const repositoryFilter = stringToArray(getInput('repository-filter'))

	// https://github.com/actions/github-script/issues/436
	const baseUrl = getInput('base-url') || process.env.GITHUB_API_URL

	await run({
		githubProps: ghTokens.map((token) => ({
			options: {
				baseUrl,
			},
			token,
		})),
		repositoryFilter,
		slackProps: {
			channels,
			token: slackToken,
		},
		withArchived,
		withDrafts,
		withPublic,
		withPullReport,
		withTestData,
		withUserMentions,
	})
}
