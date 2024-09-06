import type { context, GitHub } from '@actions/github/lib/utils.js'
import type { OctokitOptions } from '@octokit/core'
import type { GetResponseDataTypeFromEndpointMethod as GetType } from '@octokit/types'

import { Octokit } from '@octokit/rest'

export type Context = typeof context

export type GitHubClient = InstanceType<typeof GitHub>

export const octokit = new Octokit()

export type GitHubRepositories = GetType<typeof octokit.repos.listForOrg>
export type GitHubRepository = GitHubRepositories[number]
export type GitHubPulls = GetType<typeof octokit.pulls.list>
export type GitHubPull = GitHubPulls[number]
export type GitHubPullDetails = GetType<typeof octokit.pulls.get>
export type GitHubPullCommits = GetType<typeof octokit.pulls.listCommits>
export type GitHubPullRequestedReviewers = GetType<typeof octokit.pulls.listRequestedReviewers>
export type GitHubPullComments = GetType<typeof octokit.issues.listComments>
export type GitHubBranchRules = GetType<typeof octokit.repos.getBranchRules>
export type GitHubBranchRule = GitHubBranchRules[number]
export type GitHubPullReviews = GetType<typeof octokit.pulls.listReviews>
export type GitHubUser = GetType<typeof octokit.users.getByUsername>
export type GitHubOrgMemberships = GetType<typeof octokit.orgs.listMembershipsForAuthenticatedUser>
export type GitHubPullReview = GitHubPullReviews[number]

export enum GitHubReviewState {
	Approved = 'APPROVED',
	ChangesRequested = 'CHANGES_REQUESTED',
	Commented = 'COMMENTED',
	Dismissed = 'DISMISSED',
	Pending = 'PENDING',
}

export type GitHubRepositoryType = 'all' | 'forks' | 'member' | 'private' | 'public' | 'sources' | undefined
export enum RepositoryType {
	All = 'all',
	Forks = 'forks',
	Member = 'member',
	NonForks = 'sources',
	Owner = 'owner',
	Private = 'private',
	Public = 'public',
}

export const reviewText: Record<string, string> = {
	[GitHubReviewState.Approved]: 'approved this',
	[GitHubReviewState.ChangesRequested]: 'requested changes',
	[GitHubReviewState.Commented]: 'commented on this',
}

export interface Review {
	context: string
	email?: string
	login: string
	relativeHumanReadableAge: string
	state: string
	submittedAt: Date
}
export type Reviews = Record<string, Review>
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

export enum PullState {
	All = 'all',
	Closed = 'closed',
	Open = 'open',
}

export interface FilesAndChanges {
	changes: number
	files: number
}

export interface ReviewReport {
	approvals?: number
	approvalsRemaining?: number
	changesRequested?: number
	ghReviews: GitHubPullReviews
	requiredReviewers?: number
	reviews?: Reviews
}

export interface ReportItem {
	minutesUntilFirstReview: number[]
	minutesUntilMerged: number[]
}

export interface Organization {
	data: GitHubOrgMemberships[number]
	name: string
}

export interface ConfigurableGetPullsProps {
	state?: PullState
	withDrafts: boolean
}

export interface GetPullsProps extends ConfigurableGetPullsProps {
	oldest?: Date
	onlyGhReviews?: boolean
	repositories: GitHubRepositories
	withCommits?: boolean
	withFilesAndChanges?: boolean
	withUser?: boolean
}

export interface GetCommitsProps {
	number: number
	repo: string
}

export interface GitHubClientProps {
	options?: OctokitOptions
	token: string
}

export interface GetFilesAndChangesProps {
	number: number
	repo: string
}

export interface ConfigurableGetRepositoriesProps {
	repositoryFilter: string[]
	withArchived: boolean
	withPublic: boolean
}

export interface GetRepositoriesProps extends ConfigurableGetRepositoriesProps {
	type: GitHubRepositoryType
}
