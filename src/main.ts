import { debug, getBooleanInput, getInput } from '@actions/core'

import { run } from './app.js'
import { stringToArray } from './utils/misc.js'

/**
 * The main function that gets executed when the action is run.
 * @returns {undefined}
 */
export async function main(): Promise<void> {
	debug('Starting main...')
	debug('Parsing inputs...')
	const ghToken = getInput('github-token', { required: true })
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
		githubProps: {
			options: {
				baseUrl,
			},
			token: ghToken,
		},
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
