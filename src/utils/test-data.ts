import { context } from '@actions/github'
import { debug } from '@actions/core'

import type { Pull } from './github/structures.js'

import { getRelativeHumanReadableAge } from './misc.js'

export function getApprovedPullRequest(): Pull {
	debug(`Getting test data for user [${context.actor}]`)

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

export function getChangesRequestedPullRequest(): Pull {
	debug(`Getting changes requested test data for user [${context.actor}]`)

	// Create a reviewer name different from the current user
	const reviewerName = 'reviewer1'

	return {
		age: getRelativeHumanReadableAge(24),
		ageInHours: 24,
		commits: 5,
		createdAt: new Date(Date.now() - 24 * 3600 * 1000),
		createdBy: context.actor,
		filesAndChanges: {
			changes: 15,
			files: 4,
		},
		number: 54321,
		org: 'krauters',
		repo: 'feedback-repo',
		repoUrl: 'https://github.com/krauters/feedback-repo',
		requestedReviewers: [],
		reviewReport: {
			approvals: 0,
			approvalsRemaining: 1,
			changesRequested: 1,
			ghReviews: [],
			requiredReviewers: 1,
			reviews: {
				[reviewerName]: {
					context: 'requested changes',
					email: `${reviewerName}@example.com`,
					login: reviewerName,
					relativeHumanReadableAge: getRelativeHumanReadableAge(2),
					state: 'CHANGES_REQUESTED',
					submittedAt: new Date(Date.now() - 2 * 3600 * 1000),
				},
			},
		},
		title: 'Feature with requested changes',
		url: 'https://github.com/krauters/feedback-repo/pull/54321',
		user: undefined,
	}
}

export function getMultipleReviewsPullRequest(): Pull {
	debug(`Getting multiple reviews test data for user [${context.actor}]`)

	return {
		age: getRelativeHumanReadableAge(72),
		ageInHours: 72,
		commits: 12,
		createdAt: new Date(Date.now() - 72 * 3600 * 1000),
		createdBy: context.actor,
		filesAndChanges: {
			changes: 47,
			files: 8,
		},
		number: 9876,
		org: 'krauters',
		repo: 'complex-repo',
		repoUrl: 'https://github.com/krauters/complex-repo',
		requestedReviewers: ['waiting-reviewer'],
		reviewReport: {
			approvals: 1,
			approvalsRemaining: 1,
			changesRequested: 1,
			ghReviews: [],
			requiredReviewers: 2,
			reviews: {
				reviewer1: {
					context: 'approved',
					email: 'reviewer1@example.com',
					login: 'reviewer1',
					relativeHumanReadableAge: getRelativeHumanReadableAge(10),
					state: 'APPROVED',
					submittedAt: new Date(Date.now() - 10 * 3600 * 1000),
				},
				reviewer2: {
					context: 'requested changes',
					email: 'reviewer2@example.com',
					login: 'reviewer2',
					relativeHumanReadableAge: getRelativeHumanReadableAge(5),
					state: 'CHANGES_REQUESTED',
					submittedAt: new Date(Date.now() - 5 * 3600 * 1000),
				},
				reviewer3: {
					context: 'commented',
					email: 'reviewer3@example.com',
					login: 'reviewer3',
					relativeHumanReadableAge: getRelativeHumanReadableAge(1),
					state: 'COMMENTED',
					submittedAt: new Date(Date.now() - 1 * 3600 * 1000),
				},
			},
		},
		title: 'Complex feature with multiple reviews',
		url: 'https://github.com/krauters/complex-repo/pull/9876',
		user: undefined,
	}
}
