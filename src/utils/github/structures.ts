import type { context } from '@actions/github/lib/utils.js'
import type { OctokitOptions } from '@octokit/core'
import type { GetResponseDataTypeFromEndpointMethod as GetType } from '@octokit/types'
import { getOctokit } from '@actions/github'

export type Context = typeof context
export type GitHubClient = ReturnType<typeof getOctokit>

export const createGitHubClient = (token: string, options = {} as OctokitOptions): GitHubClient =>
	getOctokit(token, options)

export enum GitHubReviewState {
	Approved = 'APPROVED',
	ChangesRequested = 'CHANGES_REQUESTED',
	Commented = 'COMMENTED',
	Dismissed = 'DISMISSED',
	Pending = 'PENDING',
}

export enum RepositoryType {
	All = 'all',
	Forks = 'forks',
	Member = 'member',
	NonForks = 'sources',
	Owner = 'owner',
	Private = 'private',
	Public = 'public',
}

// Type alias for client endpoints
export type Endpoints = GitHubClient['rest']

export type GitHubBranchRule = GitHubBranchRules[number]

// Simplified GitHub API response types
export type GitHubBranchRules = GetType<Endpoints['repos']['getBranchRules']>
export type GitHubOrgMemberships = GetType<Endpoints['orgs']['listMembershipsForAuthenticatedUser']>
export type GitHubPull = GitHubPulls[number]
export type GitHubPullComments = GetType<Endpoints['issues']['listComments']>
export type GitHubPullCommits = GetType<Endpoints['pulls']['listCommits']>
export type GitHubPullDetails = GetType<Endpoints['pulls']['get']>
export type GitHubPullRequestedReviewers = GetType<Endpoints['pulls']['listRequestedReviewers']>
export type GitHubPullReview = GitHubPullReviews[number]
export type GitHubPullReviews = GetType<Endpoints['pulls']['listReviews']>
export type GitHubPulls = GetType<Endpoints['pulls']['list']>
export type GitHubRepositories = GetType<Endpoints['repos']['listForOrg']>
export type GitHubRepository = GitHubRepositories[number]
export type GitHubRepositoryType = 'all' | 'forks' | 'member' | 'private' | 'public' | 'sources' | undefined

export type GitHubUser = GetType<Endpoints['users']['getByUsername']>

export const reviewText: Record<string, string> = {
	[GitHubReviewState.Approved]: 'approved this',
	[GitHubReviewState.ChangesRequested]: 'requested changes',
	[GitHubReviewState.Commented]: 'commented on this',
}

export enum PullState {
	All = 'all',
	Closed = 'closed',
	Open = 'open',
}

export interface ConfigurableGetPullsProps {
	state?: PullState
	withDrafts: boolean
}

export interface ConfigurableGetRepositoriesProps {
	repositoryFilter: string[]
	withArchived: boolean
	withPublic: boolean
}

export interface FilesAndChanges {
	changes: number
	files: number
}

export interface GetCommitsProps {
	number: number
	repo: string
}

export interface GetFilesAndChangesProps {
	number: number
	repo: string
}

export interface GetPullsProps extends ConfigurableGetPullsProps {
	oldest?: Date
	onlyGhReviews?: boolean
	repositories: GitHubRepositories
	withCommits?: boolean
	withFilesAndChanges?: boolean
	withUser?: boolean
}

export interface GetRepositoriesProps extends ConfigurableGetRepositoriesProps {
	type: GitHubRepositoryType
}

export interface GitHubClientProps {
	options?: OctokitOptions
	token: string
}

export interface Organization {
	data: GitHubOrgMemberships[number]
	name: string
}

export interface Pull {
	age: string
	ageInHours: number
	closedAt?: Date
	commits?: number
	createdAt: Date
	createdBy: string
	draft?: boolean
	filesAndChanges?: FilesAndChanges
	mergedAt?: Date
	number: number
	org: string
	repo: string
	repoUrl: string
	requestedReviewers: string[]
	reviewReport: ReviewReport
	title: string
	url: string
	user?: GitHubUser
}

export interface ReportItem {
	minutesUntilFirstReview: number[]
	minutesUntilMerged: number[]
}

export interface Review {
	context: string
	email?: string
	login: string
	relativeHumanReadableAge: string
	state: string
	submittedAt: Date
}

export interface ReviewReport {
	approvals?: number
	approvalsRemaining?: number
	changesRequested?: number
	ghReviews: GitHubPullReviews
	requiredReviewers?: number
	reviews?: Reviews
}

export type Reviews = Record<string, Review>
