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

/**
 * Redacts sensitive information for safe logging
 * Replaces characters with random alphanumeric chars of matching case
 * Preserves first and last character, special chars, and word structure
 */
export function redact(text: string): string {
	if (!text) {
		return ''
	}

	// Return very short strings as is
	if (text.length <= 2) {
		return text
	}

	// Handle email addresses by splitting at @
	if (text.includes('@')) {
		const [localPart, domainPart] = text.split('@')
		const redactedLocal = redact(localPart)

		// Redact each part of the domain separately
		const domainParts = domainPart.split('.')
		const redactedDomain = domainParts
			.map((part, index) => {
				// Preserve common TLDs and very short parts
				if (
					part.length <= 2 ||
					(index === domainParts.length - 1 &&
						['ai', 'app', 'co', 'com', 'dev', 'io', 'net', 'org'].includes(part.toLowerCase()))
				) {
					return part
				}

				return redactPart(part)
			})
			.join('.')

		return `${redactedLocal}@${redactedDomain}`
	}

	return redactPart(text)
}

function customMappingMatcher(githubUsername: string, slackUsername: string): UserMatcher {
	return {
		check: (user: Member) => {
			const name = user.name?.toLowerCase() ?? ''
			const displayName = user.profile?.display_name?.toLowerCase() ?? ''
			const realName = user.profile?.real_name?.toLowerCase() ?? ''
			const slackNameLower = slackUsername.toLowerCase()

			return (
				name.includes(slackNameLower) ||
				slackNameLower.includes(name) ||
				displayName.includes(slackNameLower) ||
				slackNameLower.includes(displayName) ||
				realName.includes(slackNameLower) ||
				slackNameLower.includes(realName)
			)
		},
		description: 'custom user mapping',
		log: (user: Member) => {
			debug(
				`Match found by custom mapping: GitHub username [${githubUsername}] to Slack username [${slackUsername}] for user [${user.id}]`,
			)
			debug(
				`Redacted debug info: GitHub username [${redact(githubUsername)}] to Slack username [${redact(slackUsername)}] matched with user name [${redact(user.name ?? '')}], display_name [${redact(user.profile?.display_name ?? '')}], real_name [${redact(user.profile?.real_name ?? '')}]`,
			)
		},
	}
}

function displayNameMatcher(username: string): UserMatcher {
	return {
		check: (user: Member) => {
			const displayName = user.profile?.display_name?.toLowerCase() ?? ''
			const usernameLower = username.toLowerCase()

			return displayName.includes(usernameLower) || usernameLower.includes(displayName)
		},
		description: 'user.profile.display_name fields',
		log: (user: Member) => {
			debug(`Match found by username [${username}] matching Slack displayName [${user.profile?.display_name}]`)
			debug(
				`Redacted debug info: username [${redact(username)}] matched with display_name [${redact(user.profile?.display_name ?? '')}]`,
			)
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
			debug(
				`Redacted debug info: username [${redact(username)}] matched with email [${redact(user.profile?.email ?? '')}]`,
			)
		},
	}
}

function emailMatcher(email: string): UserMatcher {
	return {
		check: (user: Member) => user.profile?.email?.toLowerCase() === email.toLowerCase(),
		description: 'user.profile.email fields',
		log: (user: Member) => {
			debug(`Match found by email [${email}] with Slack email [${user.profile?.email}]`)
			debug(
				`Redacted debug info: email [${redact(email)}] matched with Slack email [${redact(user.profile?.email ?? '')}]`,
			)
		},
	}
}

/**
 * Get a random character from a character set
 */
function getRandomChar(charSet: string): string {
	const randomIndex = Math.floor(Math.random() * charSet.length)

	return charSet[randomIndex]
}

function realNameMatcher(username: string): UserMatcher {
	return {
		check: (user: Member) => {
			const realName = user.profile?.real_name?.toLowerCase() ?? ''
			const usernameLower = username.toLowerCase()

			return realName.includes(usernameLower) || usernameLower.includes(realName)
		},
		description: 'user.profile.real_name fields',
		log: (user: Member) => {
			debug(`Match found by username [${username}] matching Slack realName [${user.profile?.real_name}]`)
			debug(
				`Redacted debug info: username [${redact(username)}] matched with real_name [${redact(user.profile?.real_name ?? '')}]`,
			)
		},
	}
}

/**
 * Redacts a single word or part by replacing characters with random
 * alphanumeric chars of the same case, preserving first and last character
 */
function redactPart(text: string): string {
	if (text.length <= 2) {
		return text
	}

	// Keep first and last characters intact
	const first = text[0]
	const last = text[text.length - 1]
	const middle = text.substring(1, text.length - 1)

	// Replace each middle character with a random one of the same case
	const redactedMiddle = Array.from(middle)
		.map((char) => {
			// Skip non-alphanumeric characters
			if (!/[a-zA-Z0-9]/.test(char)) {
				return char
			}

			// Generate substitutions based on character case
			if (/[a-z]/.test(char)) {
				return getRandomChar('abcdefghijklmnopqrstuvwxyz')
			}

			if (/[A-Z]/.test(char)) {
				return getRandomChar('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
			}

			if (/[0-9]/.test(char)) {
				return getRandomChar('0123456789')
			}

			return char
		})
		.join('')

	return `${first}${redactedMiddle}${last}`
}

function userIdMatcher(userId: string): UserMatcher {
	return {
		check: (user: Member) => user.id === userId,
		description: 'user.id fields',
		log: (user: Member) => {
			debug(`Match found by userId [${userId}] with Slack userId [${user.id}]`)
			debug(`Redacted debug info: userId matched with Slack userId [${redact(user.id ?? '')}]`)
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
			debug(
				`Redacted debug info: Found [${matchingMappings.length}] custom mappings for GitHub username [${redact(username)}]`,
			)

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

	// Redacted version
	console.log(
		`Redacted debug info: No user match found for [${redact(username ?? '')}] after checking against [${usersCount}] Slack ${plural('user', usersCount)}`,
	)

	// Log mapping failures
	if (username && userMappings.length > 0) {
		const matchingMappings = userMappings.filter((mapping) => mapping.githubUsername === username)
		if (matchingMappings.length > 0) {
			debug(
				`WARNING: Custom mappings for GitHub username [${username}] were defined but no matching Slack users were found:`,
			)

			debug(
				`Redacted debug info: WARNING: Custom mappings for GitHub username [${redact(username)}] were defined but no matching Slack users were found:`,
			)

			// Show each mapping that failed
			matchingMappings.forEach((mapping) => {
				debug(
					`  - Mapped to Slack username [${mapping.slackUsername}] but no Slack user with this name/display_name/real_name was found`,
				)
				debug(
					`  - Redacted debug info: Mapped to Slack username [${redact(mapping.slackUsername)}] but no Slack user with this name/display_name/real_name was found`,
				)
			})

			debug(`Attempted to fall back to standard matching methods`)
		}
	}

	// Log standard matchers that were tried
	if (userId) {
		debug(`Tried to match userId [${userId}] against Slack user.id fields`)
		debug(`Redacted debug info: Tried to match userId [${redact(userId)}] against Slack user.id fields`)
	}

	if (email) {
		debug(`Tried to match email [${email}] against Slack user.profile.email fields`)
		debug(`Redacted debug info: Tried to match email [${redact(email)}] against Slack user.profile.email fields`)
	}

	if (username) {
		debug(
			`Tried to match username [${username}] against Slack user.profile.email (contains), display_name and real_name fields`,
		)
		debug(
			`Redacted debug info: Tried to match username [${redact(username)}] against Slack user.profile.email (contains), display_name and real_name fields`,
		)
	}

	debug(`Since no Slack user match found, unable to @mention user or use their profile image`)
}
