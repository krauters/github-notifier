/* eslint-disable @typescript-eslint/naming-convention */

import {
	createGitHubClient,
	type FilesAndChanges,
	type GetCommitsProps,
	type GetFilesAndChangesProps,
	type GetPullsProps,
	type GetRepositoriesProps,
	type GitHubBranchRule,
	type GitHubBranchRules,
	type GitHubProps,
	type GitHubPullCommits,
	type GitHubPullRequestedReviewers,
	type GitHubRepositories,
	type GitHubRepository,
	GitHubReviewState,
	type GitHubUser,
	type GitHubClient as OctokitClient,
	type Organization,
	type Pull,
	PullState,
	type ReportItem,
	RepositoryType,
	type ReviewReport,
	type Reviews,
	reviewText,
} from './structures.js'
import { debug } from '@actions/core'
import { average, getHoursAgo, minutesBetweenDates, plural, snapDate, SnapType } from '@krauters/utils'
import { ignoreFilenamesForChanges } from '../../constants.js'
import { getRelativeHumanReadableAge } from '../misc.js'

export class GitHubClient {
	public cacheOrganization!: Organization
	public cacheUser: Record<string, GitHubUser> = {}
	public client: OctokitClient

	/**
	 * Create a new GitHub client.
	 *
	 * @param props GitHub client configuration.
	 */
	constructor({ options = {}, token }: GitHubProps) {
		this.client = createGitHubClient(token, options)
	}

	/**
	 * Get commits for a pull request.
	 *
	 * @param props Pull request information.
	 */
	async getCommits({ number, repo }: GetCommitsProps): Promise<GitHubPullCommits> {
		return await this.client.paginate(this.client.rest.pulls.listCommits, {
			owner: await this.getOrgName(),
			pull_number: number,
			repo,
		})
	}

	/**
	 * Get a user's email from their GitHub username.
	 *
	 * @param username A GitHub username.
	 */
	async getEmail(username: string): Promise<string | undefined> {
		debug(`Getting email from GitHub for username [${username}]...`)
		const user = await this.getUser(username)
		debug(`User email for [${username}] is [${user?.email}]`)

		return user?.email ?? undefined
	}

	/**
	 * Get files and changes for a pull request.
	 *
	 * @param props Pull request information.
	 */
	async getFilesAndChanges({ number, repo }: GetFilesAndChangesProps): Promise<FilesAndChanges> {
		const { data: fileList } = await this.client.rest.pulls.listFiles({
			owner: await this.getOrgName(),
			pull_number: number,
			repo,
		})

		let changes = 0
		fileList.forEach((file) => {
			if (!ignoreFilenamesForChanges.includes(file.filename)) {
				changes += file.changes
			}
		})

		return {
			changes,
			files: fileList.length,
		}
	}

	/**
	 * Get organization information for the authenticated user.
	 */
	async getOrg(): Promise<Organization> {
		if (!this.cacheOrganization) {
			debug(`Getting organization associated with current token...`)
			const { data } = await this.client.rest.orgs.listMembershipsForAuthenticatedUser()

			if (data.length > 1) {
				console.error(data)
				throw new Error(
					'More than one organization associated with current token (Please ensure you are using fine-grained token)',
				)
			}

			if (data.length === 0) {
				throw new Error('No organization permissions on token')
			}

			this.cacheOrganization = {
				data: data[0],
				name: data[0].organization.login,
			}

			console.log(`The current token is associated with [${this.cacheOrganization.name}]`)
		}

		return this.cacheOrganization
	}

	/**
	 * Get the organization name for the authenticated user.
	 */
	async getOrgName(): Promise<string> {
		return (await this.getOrg()).name
	}

	/**
	 * Generate a report of pull request metrics.
	 *
	 * @param pulls List of pull requests to analyze.
	 */
	getPullReport(pulls: Pull[]) {
		const report: Record<string, ReportItem> = {}
		for (const pull of pulls) {
			if (!pull.mergedAt) {
				continue
			}

			const sortedReviews = pull.reviewReport.ghReviews.sort(
				(a, b) => new Date(String(a.submitted_at)).getTime() - new Date(String(b.submitted_at)).getTime(),
			)
			const firstReview = sortedReviews[0]
			const createdAt = pull.createdAt
			const key = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(createdAt)
			if (!(key in report)) {
				report[key] = {
					minutesUntilFirstReview: [],
					minutesUntilMerged: [],
				}
			}

			const minutesUntilMerged = minutesBetweenDates(pull.createdAt, pull.mergedAt)
			if (minutesUntilMerged) {
				report[key].minutesUntilMerged.push(minutesUntilMerged / 60)
			}

			const minutesUntilFirstReview = firstReview
				? minutesBetweenDates(pull.createdAt, new Date(String(firstReview.submitted_at)))
				: undefined
			if (minutesUntilFirstReview) {
				report[key].minutesUntilFirstReview.push(minutesUntilFirstReview / 60)
			}
		}

		let reportString = 'GitHub Notifier Pull Report (Averages)\n'
		for (const [key, item] of Object.entries(report).sort(
			([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
		)) {
			reportString += `${key}:\tHours Until Merged: [${String(average(item.minutesUntilMerged)).padStart(
				5,
				'0',
			)}],\tHours Until First Review: [${String(average(item.minutesUntilFirstReview)).padStart(
				5,
				'0',
			)}],\tTotal PRs: [${item.minutesUntilMerged.length}]\n`
		}

		return {
			report,
			reportString,
		}
	}

	/**
	 * Get pull requests from repositories.
	 *
	 * @param props Configuration for retrieving pull requests.
	 */
	async getPulls({
		oldest = snapDate(new Date(), { months: -36, snap: SnapType.Month }),
		onlyGhReviews = false,
		repositories,
		state = PullState.All,
		withCommits = true,
		withDrafts,
		withFilesAndChanges = true,
		withUser = true,
	}: GetPullsProps): Promise<Pull[]> {
		const startTime = Date.now()
		const org = await this.getOrgName()
		if (state === PullState.Open) {
			debug(`Getting [${state}] ${plural('pull', 2)} in org [${org}]...`)
		} else {
			debug(`Getting [${state}] ${plural('pull', 2)} in org [${org}] that are newer than [${oldest}]...`)
		}

		const pullRequests = []
		let apiRequestCount = 0
		for (const repo of repositories) {
			debug(`Getting [${state}] pulls in repository [${repo.name}]...`)
			const repoStartTime = Date.now()
			const pulls = await this.client.paginate(
				this.client.rest.pulls.list,
				{
					owner: org,
					repo: repo.name,
					state,
				},
				(response, done) => {
					apiRequestCount++
					debug(
						`Paginated response for repository [${repo.name}], status [${response.status}], items [${response.data.length}]`,
					)
					const found = response.data.find((pull) => new Date(pull.created_at) < oldest)
					if (found && state !== PullState.Open) {
						debug(`Done due to #${found.number} / ${found.html_url}`)
						done()
					}

					return response.data.filter((pull) => new Date(pull.created_at) > oldest)
				},
			)

			const repoDuration = (Date.now() - repoStartTime) / 1000
			debug(`Found [${pulls.length}] pull in repository [${repo.name}] in [${repoDuration.toFixed(2)}] seconds`)
			for (const pull of pulls) {
				const { base, closed_at, created_at, draft, html_url, merged_at, number, title, user } = pull
				debug(`Processing pull [${number}]...`)
				if (!withDrafts && draft) {
					debug(`withDrafts is [${withDrafts}]`)
					continue
				}

				const createdAt = new Date(created_at)
				const ageInHours = getHoursAgo(createdAt)
				const filesAndChanges = withFilesAndChanges
					? await this.getFilesAndChanges({ number, repo: repo.name })
					: undefined
				const commits = withCommits ? await this.getCommits({ number, repo: repo.name }) : undefined
				const requestedReviewers = (await this.getRequestedReviewers(repo.name, number)).users.map(
					(user) => user.login,
				)
				const reviewReport = await this.getReviewReport(
					repo.name,
					number,
					base.ref,
					requestedReviewers,
					onlyGhReviews,
				)
				pullRequests.push({
					age: getRelativeHumanReadableAge(ageInHours),
					ageInHours,
					closedAt: closed_at ? new Date(closed_at) : undefined,
					commits: commits?.length,
					createdAt: new Date(created_at),
					createdBy: String(user?.login),
					draft,
					filesAndChanges,
					mergedAt: merged_at ? new Date(merged_at) : undefined,
					number,
					org,
					repo: repo.name,
					repoUrl: repo.html_url,
					requestedReviewers,
					reviewReport,
					title,
					url: html_url,
					user: withUser ? await this.getUser(String(user?.login)) : undefined,
				})
				debug(`Added pull [${number}] to response`)
			}
		}

		const totalDuration = (Date.now() - startTime) / 1000
		console.log(
			`Completed processing [${pullRequests.length}] pull requests in [${totalDuration.toFixed(2)}] seconds with [${apiRequestCount}] API calls`,
		)

		return pullRequests
	}

	/**
	 * Get repositories for the organization.
	 *
	 * @param props Configuration for retrieving repositories.
	 */
	async getRepositories({
		repositoryFilter = [],
		type = RepositoryType.All,
		withArchived,
		withPublic,
	}: GetRepositoriesProps): Promise<GitHubRepositories> {
		const org = await this.getOrgName()
		debug(`Getting all repositories in org [${org}]...`)
		const response = await this.client.paginate(this.client.rest.repos.listForOrg, {
			org,
			per_page: 100,
			type,
		})
		let filteredRepos = response
		if (repositoryFilter.length > 0) {
			filteredRepos = filteredRepos.filter((repo: GitHubRepository) => repositoryFilter.includes(repo.name))
		}
		if (!withArchived) {
			filteredRepos = filteredRepos.filter((repo: GitHubRepository) => repo.archived === false)
		}
		if (!withPublic) {
			filteredRepos = filteredRepos.filter((repo: GitHubRepository) => repo.visibility !== RepositoryType.Public)
		}
		debug(`Found [${filteredRepos.length}] repositories in org [${org}]`)
		debug(
			JSON.stringify(
				filteredRepos.map((repo) => repo.name),
				null,
				2,
			),
		)

		return filteredRepos
	}

	/**
	 * Get requested reviewers for a pull request.
	 *
	 * @param repo Repository name.
	 * @param number Pull request number.
	 */
	async getRequestedReviewers(repo: string, number: number): Promise<GitHubPullRequestedReviewers> {
		const response = await this.client.rest.pulls.listRequestedReviewers({
			owner: await this.getOrgName(),
			pull_number: number,
			repo,
		})

		return response.data
	}

	/**
	 * Get the number of required reviewers for a branch.
	 *
	 * @param repo Repository name.
	 * @param branchName Branch name.
	 */
	async getRequiredReviewers(repo: string, branchName: string): Promise<number> {
		const org = await this.getOrgName()
		debug(`Getting branch rules for repository [${repo}] branch [${branchName}]...`)
		try {
			const rules: GitHubBranchRules = await this.client.paginate(this.client.rest.repos.getBranchRules, {
				branch: branchName,
				owner: org,
				repo,
			})
			const branch = await this.client.rest.repos.getBranch({
				branch: branchName,
				owner: org,
				repo,
			})
			let branchRequiredReviewers = 0
			if (branch.data.protection.enabled) {
				debug(`
					The "rest.repos.getBranchRules" endpoint doesn't reliably return 
					repository-level branch protections, so we are also checking the
					"branch.data.protection_url" endpoint.
				`)
				const branchProtections = await this.client.request(branch.data.protection_url)
				branchRequiredReviewers =
					branchProtections.data?.required_pull_request_reviews?.required_approving_review_count ?? 0
			}
			const requiredReviewers: number[] = rules
				.filter(
					(rule): rule is { parameters: { required_approving_review_count: number } } & GitHubBranchRule =>
						'parameters' in rule &&
						typeof rule.parameters === 'object' &&
						rule.parameters !== null &&
						'required_approving_review_count' in rule.parameters,
				)
				.map((rule) => Number(rule.parameters.required_approving_review_count))
			debug(`Required reviewers for repository [${repo}] branch [${branchName}] is [${requiredReviewers}]`)

			return Math.max(...requiredReviewers, branchRequiredReviewers)
		} catch (error: unknown) {
			console.error(`Non-blocking error getting required reviewers, [${error}]`)

			return 0
		}
	}

	/**
	 * Get review report for a pull request.
	 *
	 * @param repo Repository name.
	 * @param number Pull request number.
	 * @param baseRef Base reference branch.
	 * @param requestedReviewers List of requested reviewer usernames.
	 * @param onlyGhReviews Whether to only include GitHub reviews.
	 */
	async getReviewReport(
		repo: string,
		number: number,
		baseRef: string,
		requestedReviewers: string[],
		onlyGhReviews = false,
	): Promise<ReviewReport> {
		const ghReviews = await this.client.paginate(this.client.rest.pulls.listReviews, {
			owner: await this.getOrgName(),
			pull_number: number,
			repo,
		})
		if (onlyGhReviews) {
			return { ghReviews }
		}
		const allowedStates = [
			GitHubReviewState.Approved,
			GitHubReviewState.ChangesRequested,
			GitHubReviewState.Commented,
		]
		const reviews: Reviews = {}
		for (const ghReview of ghReviews ?? []) {
			const login = ghReview?.user?.login
			if (!login || !allowedStates.includes(ghReview.state as GitHubReviewState)) {
				debug(`Ignoring review because state [${ghReview.state}] is not one of [${allowedStates.join(', ')}]`)
				continue
			}
			if (requestedReviewers.includes(login)) {
				debug(
					`Ignoring review with state [${ghReview.state}] because user with login [${login}] was requested as a reviewer so previous reviews are no longer valid`,
				)
				continue
			}
			const email = await this.getEmail(login)
			const submittedAt = new Date(String(ghReview.submitted_at))
			if (login in reviews && reviews[login].submittedAt.valueOf() > submittedAt.valueOf()) {
				debug('Ignoring old review')
				continue
			}
			reviews[login] = {
				context: reviewText[ghReview.state],
				email,
				login,
				relativeHumanReadableAge: getRelativeHumanReadableAge(getHoursAgo(submittedAt)),
				state: ghReview.state,
				submittedAt,
			}
			debug(`Adding/overwriting reviewer [${login}] with state [${ghReview.state}] for pull [${number}]`)
		}
		const approvals = Object.values(reviews).filter(
			(review) => (review.state as GitHubReviewState) === GitHubReviewState.Approved,
		).length
		const changesRequested = Object.values(reviews).filter(
			(review) => (review.state as GitHubReviewState) === GitHubReviewState.ChangesRequested,
		).length
		const requiredReviewers = await this.getRequiredReviewers(repo, baseRef)
		const approvalsRemaining = Math.max(requiredReviewers - approvals, 0)

		return {
			approvals,
			approvalsRemaining,
			changesRequested,
			ghReviews,
			requiredReviewers,
			reviews,
		}
	}

	/**
	 * Get a GitHub user object from a username.
	 *
	 * @param username A GitHub username.
	 */
	async getUser(username: string): Promise<GitHubUser> {
		debug(`Getting user from GitHub for username [${username}]...`)
		if (username in this.cacheUser) {
			debug('Found cache hit!')

			return this.cacheUser[username]
		}
		debug('No hit in cache, making request...')
		const { data: user } = await this.client.rest.users.getByUsername({ username })
		debug('Storing result in cache...')
		this.cacheUser[username] = user

		return user
	}
}
