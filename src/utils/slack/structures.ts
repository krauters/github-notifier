export enum SlackAppUrl {
	Prefix = 'https://api.slack.com/apps',
	SuffixDisplayInfo = 'general',
}

export interface GetUser {
	email?: string
	userId?: string
	username?: string
}

export interface SlackConfig {
	channels: string[]
	token: string
	userMappings?: UserMapping[]
}

export interface UserMapping {
	githubUsername: string
	slackUsername: string
}
