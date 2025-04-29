/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/naming-convention */
import { describe, expect, it, jest } from '@jest/globals'
import type { Member } from '@slack/web-api/dist/types/response/UsersListResponse.js'

import { createUserMatchers, type MatchParams, redact } from '../../../src/utils/slack/user-matchers.js'
import { type UserMapping } from '../../../src/utils/slack/structures.js'

// Mock debug function to avoid test output noise
jest.mock('@actions/core', () => ({
	debug: jest.fn(),
}))

describe('user-matchers', () => {
	// Test the redact function
	describe('redact', () => {
		it('should redact email addresses correctly', () => {
			// Since redact now uses random characters, we can't test for specific outputs
			// Instead, check properties that should remain consistent
			const email = 'test@example.com'
			const redacted = redact(email)

			// Basic structure checks
			expect(redacted).toContain('@')
			expect(redacted).not.toBe(email)

			// Check parts
			const [localPart, domainPart] = redacted.split('@')

			// Local part checks
			expect(localPart[0]).toBe('t')
			expect(localPart[localPart.length - 1]).toBe('t')
			expect(localPart.length).toBe(4)

			// Domain part checks
			const domainParts = domainPart.split('.')
			expect(domainParts).toHaveLength(2)

			// TLD should be preserved exactly for common TLDs
			expect(domainParts[1]).toBe('com')

			// First part of domain - check first and last character preserved
			expect(domainParts[0][0]).toBe('e')
			expect(domainParts[0][domainParts[0].length - 1]).toBe('e')
		})

		it('should preserve common TLDs', () => {
			const tlds = ['com', 'org', 'net', 'io', 'co', 'ai', 'app', 'dev']

			for (const tld of tlds) {
				const email = `test@example.${tld}`
				const redacted = redact(email)
				const domain = redacted.split('@')[1]

				expect(domain.endsWith(`.${tld}`)).toBe(true)
				expect(domain.split('.')[1]).toBe(tld)
			}
		})

		it('should preserve case in redacted output', () => {
			const mixed = 'MixedCASE123'
			const redacted = redact(mixed)

			// Check first/last character preservation
			expect(redacted[0]).toBe('M')
			expect(redacted[redacted.length - 1]).toBe('3')
			expect(redacted.length).toBe(mixed.length)

			// Check case preservation (without exact pattern matching)
			// Original: MixedCASE123
			//           ^ ^   ^^^  ^
			// Check if same positions are uppercase/lowercase/numeric
			expect(/[A-Z]/.test(redacted[0])).toBe(true)
			expect(/[a-z]/.test(redacted[1])).toBe(true)
			expect(/[A-Z]/.test(redacted[5])).toBe(true)
			expect(/[A-Z]/.test(redacted[6])).toBe(true)
			expect(/[A-Z]/.test(redacted[7])).toBe(true)
			expect(/[A-Z]/.test(redacted[8])).toBe(true)
			expect(/[0-9]/.test(redacted[9])).toBe(true)
			expect(/[0-9]/.test(redacted[10])).toBe(true)
			expect(/[0-9]/.test(redacted[11])).toBe(true)
		})

		it('should preserve non-alphanumeric characters', () => {
			const special = 'a-b_c.d@e'
			const redacted = redact(special)

			expect(redacted[0]).toBe('a')
			expect(redacted[redacted.length - 1]).toBe('e')
			expect(redacted).toContain('-')
			expect(redacted).toContain('_')
			expect(redacted).toContain('.')
			expect(redacted).toContain('@')
		})

		it('should handle empty or undefined inputs', () => {
			expect(redact('')).toBe('')
			expect(redact(undefined as unknown as string)).toBe('')
		})

		it('should preserve short strings', () => {
			expect(redact('a')).toBe('a')
			expect(redact('ab')).toBe('ab')
		})
	})

	describe('createUserMatchers', () => {
		it('should create no matchers with no params', () => {
			const params: MatchParams = {}
			const matchers = createUserMatchers(params)

			// Should create no matchers when no parameters provided
			expect(matchers.length).toBe(0)
		})

		it('should create standard matchers when username is provided', () => {
			const params: MatchParams = { username: 'testuser' }
			const matchers = createUserMatchers(params)

			// Should create 3 standard matchers for username
			expect(matchers.length).toBe(3)

			// Check types of matchers
			expect(matchers[0].description).toBe('user.profile.email contains check')
			expect(matchers[1].description).toBe('user.profile.display_name fields')
			expect(matchers[2].description).toBe('user.profile.real_name fields')
		})

		it('should prioritize user mappings over standard matchers', () => {
			const userMappings: UserMapping[] = [{ githubUsername: 'github-user', slackUsername: 'slack-user' }]
			const params: MatchParams = { userMappings, username: 'github-user' }
			const matchers = createUserMatchers(params)

			// First matcher should be the user mapping matcher
			expect(matchers[0].description).toBe('custom user mapping')

			// Standard matchers should follow
			expect(matchers[1].description).toBe('user.profile.email contains check')
		})

		it('should match by userId when provided', () => {
			const params: MatchParams = { userId: 'U123' }
			const matchers = createUserMatchers(params)

			const userMatch: Member = { id: 'U123' } as Member
			const userNoMatch: Member = { id: 'U456' } as Member

			// Test the userId matcher (single matcher)
			expect(matchers.length).toBe(1)
			expect(matchers[0].check(userMatch)).toBe(true)
			expect(matchers[0].check(userNoMatch)).toBe(false)
		})

		it('should match by email when provided', () => {
			const params: MatchParams = { email: 'test@example.com' }
			const matchers = createUserMatchers(params)

			const userMatch: Member = {
				profile: { email: 'test@example.com' },
			} as Member
			const userNoMatch: Member = {
				profile: { email: 'other@example.com' },
			} as Member

			// Test the email matcher (single matcher)
			expect(matchers.length).toBe(1)
			expect(matchers[0].check(userMatch)).toBe(true)
			expect(matchers[0].check(userNoMatch)).toBe(false)
		})

		it('should match case-insensitively by email when provided', () => {
			const params: MatchParams = { email: 'test@example.com' }
			const matchers = createUserMatchers(params)

			const userMatch: Member = {
				profile: { email: 'TEST@EXAMPLE.COM' },
			} as Member
			const userNoMatch: Member = {
				profile: { email: 'other@example.com' },
			} as Member

			// Test the email matcher with case differences
			expect(matchers.length).toBe(1)
			expect(matchers[0].check(userMatch)).toBe(true)
			expect(matchers[0].check(userNoMatch)).toBe(false)
		})

		it('should match by username in email when provided', () => {
			const params: MatchParams = { username: 'testuser' }
			const matchers = createUserMatchers(params)

			const userMatch: Member = {
				profile: { email: 'testuser@example.com' },
			} as Member
			const userNoMatch: Member = {
				profile: { email: 'other@example.com' },
			} as Member

			// Test the username in email matcher (first of username matchers)
			expect(matchers[0].check(userMatch)).toBe(true)
			expect(matchers[0].check(userNoMatch)).toBe(false)
		})

		it('should match case-insensitively by username in email when provided', () => {
			const params: MatchParams = { username: 'testuser' }
			const matchers = createUserMatchers(params)

			const userMatch: Member = {
				profile: { email: 'TESTUSER@example.com' },
			} as Member
			const userNoMatch: Member = {
				profile: { email: 'other@example.com' },
			} as Member

			// Test the username in email matcher with case differences
			expect(matchers[0].check(userMatch)).toBe(true)
			expect(matchers[0].check(userNoMatch)).toBe(false)
		})

		it('should match by display_name when username provided', () => {
			const params: MatchParams = { username: 'displayuser' }
			const matchers = createUserMatchers(params)

			const userMatch: Member = {
				profile: { display_name: 'displayuser' },
			} as Member
			const userNoMatch: Member = {
				profile: { display_name: 'otherdisplay' },
			} as Member

			// Test the display_name matcher (second of username matchers)
			expect(matchers[1].check(userMatch)).toBe(true)
			expect(matchers[1].check(userNoMatch)).toBe(false)
		})

		it('should match case-insensitively by display_name when username provided', () => {
			const params: MatchParams = { username: 'displayuser' }
			const matchers = createUserMatchers(params)

			const userMatch: Member = {
				profile: { display_name: 'DISPLAYUSER' },
			} as Member
			const userNoMatch: Member = {
				profile: { display_name: 'otherdisplay' },
			} as Member

			// Test the display_name matcher with case differences
			expect(matchers[1].check(userMatch)).toBe(true)
			expect(matchers[1].check(userNoMatch)).toBe(false)
		})

		it('should match partially by display_name using contains logic', () => {
			const params: MatchParams = { username: 'display' }
			const matchers = createUserMatchers(params)

			const userMatch1: Member = {
				profile: { display_name: 'displayuser' },
			} as Member
			const userMatch2: Member = {
				profile: { display_name: 'user-display' },
			} as Member
			const userNoMatch: Member = {
				profile: { display_name: 'something-else' },
			} as Member

			// Should match both ways - username contains display_name or vice versa
			expect(matchers[1].check(userMatch1)).toBe(true)
			expect(matchers[1].check(userMatch2)).toBe(true)
			expect(matchers[1].check(userNoMatch)).toBe(false)
		})

		it('should match by real_name when username provided', () => {
			const params: MatchParams = { username: 'Real User' }
			const matchers = createUserMatchers(params)

			const userMatch: Member = {
				profile: { real_name: 'Real User' },
			} as Member
			const userNoMatch: Member = {
				profile: { real_name: 'Other Person' },
			} as Member

			// Test the real_name matcher (third of username matchers)
			expect(matchers[2].check(userMatch)).toBe(true)
			expect(matchers[2].check(userNoMatch)).toBe(false)
		})

		it('should match case-insensitively by real_name when username provided', () => {
			const params: MatchParams = { username: 'Real User' }
			const matchers = createUserMatchers(params)

			const userMatch: Member = {
				profile: { real_name: 'real user' },
			} as Member
			const userNoMatch: Member = {
				profile: { real_name: 'Other Person' },
			} as Member

			// Test the real_name matcher with case differences
			expect(matchers[2].check(userMatch)).toBe(true)
			expect(matchers[2].check(userNoMatch)).toBe(false)
		})

		it('should match partially by real_name using contains logic', () => {
			const params: MatchParams = { username: 'user' }
			const matchers = createUserMatchers(params)

			const userMatch1: Member = {
				profile: { real_name: 'Real User' },
			} as Member
			const userMatch2: Member = {
				profile: { real_name: 'username' },
			} as Member
			const userNoMatch: Member = {
				profile: { real_name: 'Someone Else' },
			} as Member

			// Should match both ways - username contains real_name or vice versa
			expect(matchers[2].check(userMatch1)).toBe(true)
			expect(matchers[2].check(userMatch2)).toBe(true)
			expect(matchers[2].check(userNoMatch)).toBe(false)
		})

		it('should create additional matchers for user mappings', () => {
			const userMappings: UserMapping[] = [{ githubUsername: 'github-user', slackUsername: 'slack-user' }]
			const params: MatchParams = { userMappings, username: 'github-user' }
			const matchers = createUserMatchers(params)

			// Should have 1 mapping matcher plus 3 username matchers
			expect(matchers.length).toBe(4)
		})

		it('should only create mapping matchers for the current username', () => {
			const userMappings: UserMapping[] = [
				{ githubUsername: 'github-user', slackUsername: 'slack-user' },
				{ githubUsername: 'other-user', slackUsername: 'other-slack' },
			]
			const params: MatchParams = { userMappings, username: 'github-user' }
			const matchers = createUserMatchers(params)

			// Should have 1 matching mapping plus 3 username matchers
			expect(matchers.length).toBe(4)

			// First matcher should be for the custom mapping
			expect(matchers[0].description).toBe('custom user mapping')
		})

		it('should match user mapping when names are similar', () => {
			// Using a unique string that doesn't have common substrings with other test values
			const userMappings: UserMapping[] = [{ githubUsername: 'github-user', slackUsername: 'unique-name-xyz' }]
			const params: MatchParams = { userMappings, username: 'github-user' }
			const matchers = createUserMatchers(params)

			// Using the exact same unique string
			const userMatch: Member = { name: 'unique-name-xyz' } as Member

			// Verify the match works
			expect(matchers[0].check(userMatch)).toBe(true)
		})

		it('should match case-insensitively through user mapping', () => {
			// Using a unique string that doesn't have common substrings with other test values
			const userMappings: UserMapping[] = [{ githubUsername: 'github-user', slackUsername: 'unique-name-abc' }]
			const params: MatchParams = { userMappings, username: 'github-user' }
			const matchers = createUserMatchers(params)

			// Using the exact same unique string with different case
			const userMatch: Member = { name: 'UNIQUE-NAME-ABC' } as Member

			// Verify the match works
			expect(matchers[0].check(userMatch)).toBe(true)
		})

		it('should match partially through user mapping using contains logic', () => {
			const userMappings: UserMapping[] = [{ githubUsername: 'github-user', slackUsername: 'slack' }]
			const params: MatchParams = { userMappings, username: 'github-user' }
			const matchers = createUserMatchers(params)

			const userMatch1: Member = { name: 'slack-name' } as Member
			const userMatch2: Member = { profile: { display_name: 'mr-slack' } } as Member
			const userMatch3: Member = { profile: { real_name: 'Slack User' } } as Member
			const userNoMatch: Member = {
				name: 'other',
				profile: {
					display_name: 'other-display',
					real_name: 'Other Person',
				},
			} as Member

			// Should match if any field contains the mapping
			expect(matchers[0].check(userMatch1)).toBe(true)
			expect(matchers[0].check(userMatch2)).toBe(true)
			expect(matchers[0].check(userMatch3)).toBe(true)
			expect(matchers[0].check(userNoMatch)).toBe(false)
		})
	})
})
