/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/naming-convention */
import { describe, expect, it, jest } from '@jest/globals'
import type { Member } from '@slack/web-api/dist/types/response/UsersListResponse.js'

import { type UserMapping } from '../../../src/utils/slack/structures.js'
import { createUserMatchers, type MatchParams } from '../../../src/utils/slack/user-matchers.js'

// Mock debug function to avoid test output noise
jest.mock('@actions/core', () => ({
	debug: jest.fn(),
}))

describe('user-matchers', () => {
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

		it('should match by name through user mapping', () => {
			const userMappings: UserMapping[] = [{ githubUsername: 'github-user', slackUsername: 'slack-name' }]
			const params: MatchParams = { userMappings, username: 'github-user' }
			const matchers = createUserMatchers(params)

			const userMatch: Member = { name: 'slack-name' } as Member
			const userNoMatch: Member = { name: 'other-name' } as Member

			// Test the mapping matcher (now at index 0)
			expect(matchers[0].check(userMatch)).toBe(true)
			expect(matchers[0].check(userNoMatch)).toBe(false)
		})

		it('should match by display_name through user mapping', () => {
			const userMappings: UserMapping[] = [{ githubUsername: 'github-user', slackUsername: 'slack-display' }]
			const params: MatchParams = { userMappings, username: 'github-user' }
			const matchers = createUserMatchers(params)

			const userMatch: Member = {
				profile: { display_name: 'slack-display' },
			} as Member
			const userNoMatch: Member = {
				profile: { display_name: 'other-display' },
			} as Member

			// Test the mapping matcher (now at index 0)
			expect(matchers[0].check(userMatch)).toBe(true)
			expect(matchers[0].check(userNoMatch)).toBe(false)
		})

		it('should match by real_name through user mapping', () => {
			const userMappings: UserMapping[] = [{ githubUsername: 'github-user', slackUsername: 'slack-real-name' }]
			const params: MatchParams = { userMappings, username: 'github-user' }
			const matchers = createUserMatchers(params)

			const userMatch: Member = {
				profile: { real_name: 'slack-real-name' },
			} as Member
			const userNoMatch: Member = {
				profile: { real_name: 'other-real-name' },
			} as Member

			// Test the mapping matcher (now at index 0)
			expect(matchers[0].check(userMatch)).toBe(true)
			expect(matchers[0].check(userNoMatch)).toBe(false)
		})

		it('should create multiple matchers for multiple mappings', () => {
			const userMappings: UserMapping[] = [
				{ githubUsername: 'github-user', slackUsername: 'slack-name-1' },
				{ githubUsername: 'github-user', slackUsername: 'slack-name-2' },
			]
			const params: MatchParams = { userMappings, username: 'github-user' }
			const matchers = createUserMatchers(params)

			// Should have 2 mapping matchers plus 3 username matchers
			expect(matchers.length).toBe(5)

			const userMatch1: Member = { name: 'slack-name-1' } as Member
			const userMatch2: Member = { name: 'slack-name-2' } as Member
			const userNoMatch: Member = { name: 'other-name' } as Member

			// Test the mapping matchers (now at indices 0 and 1)
			expect(matchers[0].check(userMatch1)).toBe(true)
			expect(matchers[0].check(userMatch2)).toBe(false)
			expect(matchers[0].check(userNoMatch)).toBe(false)

			expect(matchers[1].check(userMatch1)).toBe(false)
			expect(matchers[1].check(userMatch2)).toBe(true)
			expect(matchers[1].check(userNoMatch)).toBe(false)
		})
	})
})
