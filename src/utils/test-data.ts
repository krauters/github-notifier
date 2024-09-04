import { context } from '@actions/github'

import type { Pull } from './github/structures.js'

import { getRelativeHumanReadableAge } from './misc.js'

/**
 * Get approved pull request as test data.
 */
export function getApprovedPullRequest(): Pull {
	console.log(`Getting test data for user [${context.actor}]`)

	return {
		age: getRelativeHumanReadableAge(48),
		ageInHours: 48,
		commits: 999,
		createdAt: new Date(Date.now() - 24 * 3600 * 1000),
		createdBy: context.actor,
		filesAndChanges: {
			changes: 8,
			files: 19,
		},
		number: 12345,
		org: 'krauters',
		repo: 'fake-repo',
		repoUrl: 'https://google.com/#fake-url',
		requestedReviewers: [context.actor],
		reviewReport: {
			approvals: 1,
			approvalsRemaining: 0,
			changesRequested: 0,
			ghReviews: [],
			requiredReviewers: 1,
			reviews: {},
		},
		title: 'Testing',
		url: 'https://google.com/#fake-url',
		user: undefined,
	}
}
