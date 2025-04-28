import { debug } from '@actions/core'
import { plural } from '@krauters/utils'
import type { Member } from '@slack/web-api/dist/types/response/UsersListResponse.js'

import type { UserMapping } from './structures.js'

export interface MatchParams {
	email?: string
	userId?: string
	userMappings?: UserMapping[]
	username?: string
}

export interface UserMatcher {
	check: (user: Member) => boolean
	description: string
	log: (user: Member) => void
}

function customMappingMatcher(githubUsername: string, slackUsername: string): UserMatcher {
	return {
		check: (user: Member) =>
			user.name?.toLowerCase() === slackUsername.toLowerCase() ||
			user.profile?.display_name?.toLowerCase() === slackUsername.toLowerCase() ||
			user.profile?.real_name?.toLowerCase() === slackUsername.toLowerCase(),
		description: 'custom user mapping',
		log: (user: Member) => {
			debug(
				`Match found by custom mapping: GitHub username [${githubUsername}] to Slack username [${slackUsername}] for user [${user.id}]`,
			)
		},
	}
}

function displayNameMatcher(username: string): UserMatcher {
	return {
		check: (user: Member) => user.profile?.display_name?.toLowerCase() === username.toLowerCase(),
		description: 'user.profile.display_name fields',
		log: (user: Member) => {
			debug(`Match found by username [${username}] matching Slack displayName [${user.profile?.display_name}]`)
		},
	}
}

function emailContainsMatcher(username: string): UserMatcher {
	return {
		check: (user: Member) =>
			String(user.profile?.email ?? '')
				.toLowerCase()
				.includes(username.toLowerCase()),
		description: 'user.profile.email contains check',
		log: (user: Member) => {
			debug(`Match found by username [${username}] contained in Slack email [${user.profile?.email}]`)
		},
	}
}

function emailMatcher(email: string): UserMatcher {
	return {
		check: (user: Member) => user.profile?.email?.toLowerCase() === email.toLowerCase(),
		description: 'user.profile.email fields',
		log: (user: Member) => {
			debug(`Match found by email [${email}] with Slack email [${user.profile?.email}]`)
		},
	}
}

function realNameMatcher(username: string): UserMatcher {
	return {
		check: (user: Member) => user.profile?.real_name?.toLowerCase() === username.toLowerCase(),
		description: 'user.profile.real_name fields',
		log: (user: Member) => {
			debug(`Match found by username [${username}] matching Slack realName [${user.profile?.real_name}]`)
		},
	}
}

function userIdMatcher(userId: string): UserMatcher {
	return {
		check: (user: Member) => user.id === userId,
		description: 'user.id fields',
		log: (user: Member) => {
			debug(`Match found by userId [${userId}] with Slack userId [${user.id}]`)
		},
	}
}

export const createUserMatchers = ({ email, userId, userMappings = [], username }: MatchParams): UserMatcher[] => {
	const matchers: UserMatcher[] = []

	// First, add the user mapping matchers if a username is provided in action.yaml
	if (username && userMappings.length > 0) {
		const matchingMappings = userMappings.filter((mapping) => mapping.githubUsername === username)

		if (matchingMappings.length > 0) {
			debug(`Found [${matchingMappings.length}] custom mappings for GitHub username [${username}]`)

			// Add a matcher for each mapping
			matchingMappings.forEach((mapping) => {
				matchers.push(customMappingMatcher(username, mapping.slackUsername))
			})
		}
	}

	// Next, add the standard matchers
	if (userId) {
		matchers.push(userIdMatcher(userId))
	}

	if (email) {
		matchers.push(emailMatcher(email))
	}

	if (username) {
		matchers.push(emailContainsMatcher(username))
		matchers.push(displayNameMatcher(username))
		matchers.push(realNameMatcher(username))
	}

	return matchers
}

export const logFailedMatches = (
	{ email, userId, userMappings = [], username }: MatchParams,
	usersCount: number,
): void => {
	console.log(
		`No user match found for [${username}] after checking against [${usersCount}] Slack ${plural('user', usersCount)}`,
	)

	// Log mapping failures
	if (username && userMappings.length > 0) {
		const matchingMappings = userMappings.filter((mapping) => mapping.githubUsername === username)
		if (matchingMappings.length > 0) {
			debug(
				`WARNING: Custom mappings for GitHub username [${username}] were defined but no matching Slack users were found:`,
			)

			// Show each mapping that failed
			matchingMappings.forEach((mapping) => {
				debug(
					`  - Mapped to Slack username [${mapping.slackUsername}] but no Slack user with this name/display_name/real_name was found`,
				)
			})

			debug(`Attempted to fall back to standard matching methods`)
		}
	}

	// Log standard matchers that were tried
	if (userId) debug(`Tried to match userId [${userId}] against Slack user.id fields`)
	if (email) debug(`Tried to match email [${email}] against Slack user.profile.email fields`)
	if (username)
		debug(
			`Tried to match username [${username}] against Slack user.profile.email (contains), display_name and real_name fields`,
		)

	debug(`Since no Slack user match found, unable to @mention user or use their profile image`)
}
