/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { GitHubClient } from '../../../src/utils/github/github-client.js'
import { describe, expect, it, jest } from '@jest/globals'
import { RepositoryType } from '../../../src/utils/github/structures.js'

describe('GitHubClient', () => {
	describe('getOrg', () => {
		it('should get organization information', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			const mockResponse = {
				data: [
					{
						organization: {
							login: 'test-org',
						},
					},
				],
			}

			const mockOctokitClient = {
				rest: {
					orgs: {
						listMembershipsForAuthenticatedUser: jest.fn().mockResolvedValue(mockResponse),
					},
				},
			}

			client.client = mockOctokitClient as unknown as typeof client.client
			client.cacheOrganization = undefined as any

			const result = await client.getOrg()

			expect(result).toEqual({
				data: mockResponse.data[0],
				name: 'test-org',
			})
		})

		it('should throw error if no organization permissions', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			const mockResponse = {
				data: [],
			}

			const mockOctokitClient = {
				rest: {
					orgs: {
						listMembershipsForAuthenticatedUser: jest.fn().mockResolvedValue(mockResponse),
					},
				},
			}

			client.client = mockOctokitClient as unknown as typeof client.client
			client.cacheOrganization = undefined as any

			await expect(client.getOrg()).rejects.toThrow('No organization permissions on token')
		})

		it('should throw error if multiple organizations found', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			const mockResponse = {
				data: [
					{
						organization: {
							login: 'test-org-1',
						},
					},
					{
						organization: {
							login: 'test-org-2',
						},
					},
				],
			}

			const mockOctokitClient = {
				rest: {
					orgs: {
						listMembershipsForAuthenticatedUser: jest.fn().mockResolvedValue(mockResponse),
					},
				},
			}

			client.client = mockOctokitClient as unknown as typeof client.client
			client.cacheOrganization = undefined as any

			await expect(client.getOrg()).rejects.toThrow('More than one organization')
		})
	})

	describe('getOrgName', () => {
		it('should return organization name', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			const mockCacheOrg = {
				data: { organization: { login: 'test-org' } },
				name: 'test-org',
			}

			client.cacheOrganization = mockCacheOrg as any

			const result = await client.getOrgName()

			expect(result).toEqual('test-org')
		})

		it('should call getOrg if cache is not present', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			const mockResponse = {
				data: [
					{
						organization: {
							login: 'test-org',
						},
					},
				],
			}

			const mockOctokitClient = {
				rest: {
					orgs: {
						listMembershipsForAuthenticatedUser: jest.fn().mockResolvedValue(mockResponse),
					},
				},
			}

			client.client = mockOctokitClient as unknown as typeof client.client
			client.cacheOrganization = undefined as any

			const getOrgSpy = jest.spyOn(client, 'getOrg')

			const result = await client.getOrgName()

			expect(result).toEqual('test-org')
			expect(getOrgSpy).toHaveBeenCalled()
		})
	})

	describe('getEmail', () => {
		it('should get user email', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			const mockUserData = {
				email: 'test@example.com',
				login: 'test-user',
			}

			client.getUser = jest.fn().mockResolvedValue(mockUserData) as any

			const result = await client.getEmail('test-user')

			expect(result).toEqual('test@example.com')
			expect(client.getUser).toHaveBeenCalledWith('test-user')
		})

		it('should return undefined if email is not found', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			const mockUserData = {
				login: 'test-user',
			}

			client.getUser = jest.fn().mockResolvedValue(mockUserData) as any

			const result = await client.getEmail('test-user')

			expect(result).toBeUndefined()
			expect(client.getUser).toHaveBeenCalledWith('test-user')
		})
	})

	describe('getUser', () => {
		it('should get user data from GitHub', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			const mockUserResponse = {
				data: {
					email: 'test@example.com',
					id: 123,
					login: 'test-user',
				},
			}

			const mockOctokitClient = {
				rest: {
					users: {
						getByUsername: jest.fn().mockResolvedValue(mockUserResponse),
					},
				},
			}

			client.client = mockOctokitClient as unknown as typeof client.client

			const result = await client.getUser('test-user')

			expect(result).toEqual(mockUserResponse.data)
			expect(mockOctokitClient.rest.users.getByUsername).toHaveBeenCalledWith({ username: 'test-user' })
		})

		it('should use cache if available', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			const mockCachedUser = {
				email: 'test@example.com',
				id: 123,
				login: 'test-user',
			}

			client.cacheUser = {
				'test-user': mockCachedUser,
			}

			const mockOctokitClient = {
				rest: {
					users: {
						getByUsername: jest.fn(),
					},
				},
			}

			client.client = mockOctokitClient as unknown as typeof client.client

			const result = await client.getUser('test-user')

			expect(result).toEqual(mockCachedUser)
			expect(mockOctokitClient.rest.users.getByUsername).not.toHaveBeenCalled()
		})
	})

	describe('getFilesAndChanges', () => {
		it('should get files and changes for a pull request', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			client.getOrgName = jest.fn().mockResolvedValue('test-org') as any

			const mockFileListResponse = {
				data: [
					{ changes: 10, filename: 'file1.js' },
					{ changes: 20, filename: 'file2.js' },
					{ changes: 1000, filename: 'package-lock.json' },
				],
			}

			const mockOctokitClient = {
				rest: {
					pulls: {
						listFiles: jest.fn().mockResolvedValue(mockFileListResponse),
					},
				},
			}

			client.client = mockOctokitClient as unknown as typeof client.client

			const result = await client.getFilesAndChanges({ number: 123, repo: 'test-repo' })

			expect(result).toEqual({
				changes: 30,
				files: 3,
			})

			expect(mockOctokitClient.rest.pulls.listFiles).toHaveBeenCalledWith({
				owner: 'test-org',
				pull_number: 123,
				repo: 'test-repo',
			})
		})
	})

	describe('getCommits', () => {
		it('should get commits for a pull request', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			client.getOrgName = jest.fn().mockResolvedValue('test-org') as any

			const mockCommits = [
				{ commit: { message: 'First commit' }, sha: 'abc123' },
				{ commit: { message: 'Second commit' }, sha: 'def456' },
			]

			const mockPaginate = jest.fn().mockResolvedValue(mockCommits)

			const mockOctokitClient = {
				paginate: mockPaginate,
				rest: {
					pulls: {
						listCommits: jest.fn(),
					},
				},
			}

			client.client = mockOctokitClient as unknown as typeof client.client

			const result = await client.getCommits({ number: 123, repo: 'test-repo' })

			expect(result).toEqual(mockCommits)

			expect(mockPaginate).toHaveBeenCalledWith(mockOctokitClient.rest.pulls.listCommits, {
				owner: 'test-org',
				pull_number: 123,
				repo: 'test-repo',
			})
		})
	})

	describe('getRepositories', () => {
		it('should get repositories with filters', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			client.getOrgName = jest.fn().mockResolvedValue('test-org') as any

			const mockRepos = [
				{ archived: false, name: 'repo1', visibility: 'private' },
				{ archived: true, name: 'repo2', visibility: 'private' },
				{ archived: false, name: 'repo3', visibility: 'public' },
				{ archived: false, name: 'repo4', visibility: 'private' },
			]

			const mockPaginate = jest.fn().mockResolvedValue(mockRepos)

			const mockOctokitClient = {
				paginate: mockPaginate,
				rest: {
					repos: {
						listForOrg: jest.fn(),
					},
				},
			}

			client.client = mockOctokitClient as unknown as typeof client.client

			const result = await client.getRepositories({
				repositoryFilter: [],
				type: RepositoryType.All,
				withArchived: false,
				withPublic: false,
			})

			expect(result).toEqual([
				{ archived: false, name: 'repo1', visibility: 'private' },
				{ archived: false, name: 'repo4', visibility: 'private' },
			])

			expect(mockPaginate).toHaveBeenCalledWith(mockOctokitClient.rest.repos.listForOrg, {
				org: 'test-org',
				per_page: 100,
				type: RepositoryType.All,
			})
		})

		it('should filter by repository name', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			client.getOrgName = jest.fn().mockResolvedValue('test-org') as any

			const mockRepos = [
				{ archived: false, name: 'repo1', visibility: 'private' },
				{ archived: false, name: 'repo2', visibility: 'private' },
				{ archived: false, name: 'specific-repo', visibility: 'private' },
				{ archived: false, name: 'repo4', visibility: 'private' },
			]

			const mockPaginate = jest.fn().mockResolvedValue(mockRepos)

			const mockOctokitClient = {
				paginate: mockPaginate,
				rest: {
					repos: {
						listForOrg: jest.fn(),
					},
				},
			}

			client.client = mockOctokitClient as unknown as typeof client.client

			const result = await client.getRepositories({
				repositoryFilter: ['specific-repo'],
				type: RepositoryType.All,
				withArchived: true,
				withPublic: true,
			})

			expect(result).toEqual([{ archived: false, name: 'specific-repo', visibility: 'private' }])
		})
	})

	describe('getPullReport', () => {
		it('should generate a report of pull request metrics', () => {
			const client = new GitHubClient({ token: 'test-token' })

			const mockPulls = [
				{
					createdAt: new Date('2023-01-01T00:00:00Z'),
					mergedAt: new Date('2023-01-01T10:00:00Z'),
					reviewReport: {
						ghReviews: [{ submitted_at: '2023-01-01T02:00:00Z' }],
					},
				},
				{
					createdAt: new Date('2023-01-02T00:00:00Z'),
					mergedAt: new Date('2023-01-02T08:00:00Z'),
					reviewReport: {
						ghReviews: [{ submitted_at: '2023-01-02T03:00:00Z' }],
					},
				},
				{
					createdAt: new Date('2023-01-03T00:00:00Z'),
					reviewReport: {
						ghReviews: [],
					},
				},
			]

			const result = client.getPullReport(mockPulls)

			expect(result).toHaveProperty('report')
			expect(result).toHaveProperty('reportString')

			const jan2023Key = 'Jan 2023'
			expect(result.report).toHaveProperty(jan2023Key)

			expect(result.report[jan2023Key].minutesUntilMerged).toBeInstanceOf(Array)
			expect(result.report[jan2023Key].minutesUntilMerged.length).toBeGreaterThan(0)

			expect(result.report[jan2023Key].minutesUntilFirstReview).toBeInstanceOf(Array)
			expect(result.report[jan2023Key].minutesUntilFirstReview.length).toBeGreaterThan(0)

			expect(result.reportString).toContain('GitHub Notifier Pull Report')
			expect(result.reportString).toContain('Jan 2023')
			expect(result.reportString).toContain('Hours Until Merged')
			expect(result.reportString).toContain('Hours Until First Review')
			expect(result.reportString).toContain('Total PRs:')
		})
	})

	describe('getReviewReport', () => {
		it('should get review report for a pull request', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			client.getOrgName = jest.fn().mockResolvedValue('test-org') as any
			client.getEmail = jest.fn().mockResolvedValue('test@example.com') as any
			client.getRequiredReviewers = jest.fn().mockResolvedValue(2) as any

			const mockReviews = [
				{ id: 1, state: 'APPROVED', submitted_at: '2023-01-01T05:00:00Z', user: { login: 'reviewer1' } },
				{
					id: 2,
					state: 'CHANGES_REQUESTED',
					submitted_at: '2023-01-01T06:00:00Z',
					user: { login: 'reviewer2' },
				},
			]

			const mockPaginate = jest.fn().mockResolvedValue(mockReviews)

			const mockOctokitClient = {
				paginate: mockPaginate,
				rest: {
					pulls: {
						listReviews: jest.fn(),
					},
				},
			}

			client.client = mockOctokitClient as unknown as typeof client.client

			const result = await client.getReviewReport('test-repo', 123, 'main', [], false)

			expect(result).toHaveProperty('ghReviews')
			expect(result).toHaveProperty('approvals')
			expect(result).toHaveProperty('changesRequested')
			expect(result.ghReviews).toEqual(mockReviews)

			expect(mockPaginate).toHaveBeenCalledWith(mockOctokitClient.rest.pulls.listReviews, {
				owner: 'test-org',
				pull_number: 123,
				repo: 'test-repo',
			})
		})
	})

	describe('getRequiredReviewers', () => {
		it('should get required reviewers for a branch', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			client.getOrgName = jest.fn().mockResolvedValue('test-org') as any

			const mockBranchRules = [
				{
					parameters: {
						required_approving_review_count: 2,
					},
				},
			]

			const mockBranchData = {
				data: {
					protection: {
						enabled: false,
					},
				},
			}

			const mockPaginate = jest.fn().mockResolvedValue(mockBranchRules)

			const mockOctokitClient = {
				paginate: mockPaginate,
				request: jest.fn(),
				rest: {
					repos: {
						getBranch: jest.fn().mockResolvedValue(mockBranchData),
						getBranchRules: jest.fn(),
					},
				},
			}

			client.client = mockOctokitClient as unknown as typeof client.client

			const result = await client.getRequiredReviewers('test-repo', 'main')

			expect(result).toEqual(2)

			expect(mockPaginate).toHaveBeenCalledWith(mockOctokitClient.rest.repos.getBranchRules, {
				branch: 'main',
				owner: 'test-org',
				repo: 'test-repo',
			})
		})
	})

	describe('getPulls', () => {
		it('should get pull requests from repositories', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			client.getOrgName = jest.fn().mockResolvedValue('test-org') as any
			client.getFilesAndChanges = jest.fn().mockResolvedValue({ changes: 20, files: 2 })
			client.getCommits = jest.fn().mockResolvedValue([{ sha: 'abc123' }])
			client.getRequestedReviewers = jest.fn().mockResolvedValue({ users: [{ login: 'reviewer1' }] })
			client.getReviewReport = jest.fn().mockResolvedValue({ ghReviews: [] })
			client.getUser = jest.fn().mockResolvedValue({ login: 'test-user' })

			const mockPull = {
				base: { ref: 'main' },
				closed_at: '2023-01-02T00:00:00Z',
				created_at: '2023-01-01T00:00:00Z',
				draft: false,
				html_url: 'https://github.com/test-org/test-repo/pull/123',
				merged_at: '2023-01-02T00:00:00Z',
				number: 123,
				title: 'Test Pull Request',
				user: { login: 'test-user' },
			}

			const mockRepos = [
				{
					fork: false,
					full_name: 'test-org/test-repo',
					html_url: 'https://github.com/test-org/test-repo',
					id: 123,
					name: 'test-repo',
					node_id: 'node123',
					owner: {
						avatar_url: 'https://example.com/avatar',
						events_url: 'https://example.com',
						followers_url: 'https://example.com',
						following_url: 'https://example.com',
						gists_url: 'https://example.com',
						html_url: 'https://example.com',
						id: 456,
						login: 'test-org',
						node_id: 'node456',
						organizations_url: 'https://example.com',
						received_events_url: 'https://example.com',
						repos_url: 'https://example.com',
						site_admin: false,
						starred_url: 'https://example.com',
						subscriptions_url: 'https://example.com',
						type: 'User',
						url: 'https://example.com',
					},
					private: false,
				},
			] as any

			const mockPaginate = jest.fn().mockImplementation((apiMethod, params, callback) => {
				if (apiMethod === mockOctokitClient.rest.pulls.list) {
					const response = {
						data: [mockPull],
						status: 200,
					}

					return callback(response, jest.fn())
				}

				return []
			})

			const mockOctokitClient = {
				paginate: mockPaginate,
				request: jest.fn(),
				rest: {
					pulls: {
						list: jest.fn(),
						listFiles: jest.fn().mockResolvedValue({ data: [] }),
						listRequestedReviewers: jest.fn().mockResolvedValue({ data: { users: [] } }),
					},
					repos: {
						getBranch: jest.fn().mockResolvedValue({
							data: {
								protection: { enabled: false },
							},
						}),
						getBranchRules: jest.fn(),
					},
					users: {
						getByUsername: jest.fn().mockResolvedValue({ data: { login: 'test-user' } }),
					},
				},
			}

			client.client = mockOctokitClient as unknown as typeof client.client

			const result = await client.getPulls({
				onlyGhReviews: true,
				repositories: mockRepos,
				withDrafts: true,
			})

			expect(result).toHaveLength(1)
			expect(result[0]).toHaveProperty('number', 123)
			expect(result[0]).toHaveProperty('title', 'Test Pull Request')

			expect(mockPaginate).toHaveBeenCalledWith(
				mockOctokitClient.rest.pulls.list,
				{
					owner: 'test-org',
					repo: 'test-repo',
					state: 'all',
				},
				expect.any(Function),
			)
		})

		it('should handle draft pull requests based on withDrafts flag', async () => {
			const client = new GitHubClient({ token: 'test-token' })

			client.getOrgName = jest.fn().mockResolvedValue('test-org') as any

			const mockDraftPull = {
				base: { ref: 'main' },
				created_at: '2023-01-01T00:00:00Z',
				draft: true,
				html_url: 'https://github.com/test-org/test-repo/pull/123',
				number: 123,
				title: 'Draft Pull Request',
				user: { login: 'test-user' },
			}

			const mockRepos = [
				{
					fork: false,
					full_name: 'test-org/test-repo',
					html_url: 'https://github.com/test-org/test-repo',
					id: 123,
					name: 'test-repo',
					node_id: 'node123',
					owner: {
						avatar_url: 'https://example.com/avatar',
						events_url: 'https://example.com',
						followers_url: 'https://example.com',
						following_url: 'https://example.com',
						gists_url: 'https://example.com',
						html_url: 'https://example.com',
						id: 456,
						login: 'test-org',
						node_id: 'node456',
						organizations_url: 'https://example.com',
						received_events_url: 'https://example.com',
						repos_url: 'https://example.com',
						site_admin: false,
						starred_url: 'https://example.com',
						subscriptions_url: 'https://example.com',
						type: 'User',
						url: 'https://example.com',
					},
					private: false,
				},
			] as any

			const mockPaginate = jest.fn().mockImplementation((apiMethod) => {
				if (apiMethod === mockOctokitClient.rest.pulls.list) {
					return [mockDraftPull]
				}

				return []
			})

			const mockOctokitClient = {
				paginate: mockPaginate,
				request: jest.fn(),
				rest: {
					pulls: {
						list: jest.fn(),
						listFiles: jest.fn().mockResolvedValue({ data: [] }),
						listRequestedReviewers: jest.fn().mockResolvedValue({ data: { users: [] } }),
					},
					repos: {
						getBranch: jest.fn().mockResolvedValue({
							data: {
								protection: { enabled: false },
							},
						}),
						getBranchRules: jest.fn(),
					},
					users: {
						getByUsername: jest.fn().mockResolvedValue({ data: { login: 'test-user' } }),
					},
				},
			}

			client.client = mockOctokitClient as unknown as typeof client.client

			const resultWithoutDrafts = await client.getPulls({
				repositories: mockRepos,
				withDrafts: false,
			})
			expect(resultWithoutDrafts).toHaveLength(0)

			const resultWithDrafts = await client.getPulls({
				repositories: mockRepos,
				withDrafts: true,
			})
			expect(resultWithDrafts).toHaveLength(1)
			expect(resultWithDrafts[0]).toHaveProperty('draft', true)
		})
	})
})
