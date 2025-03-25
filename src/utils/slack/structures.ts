export enum SlackAppUrl {
	Prefix = 'https://api.slack.com/apps',
	SuffixDisplayInfo = 'general#display_info_form',
}

export interface GetUser {
	email?: string
	userId?: string
	username?: string
}

export interface SlackClientProps {
	channels: string[]
	token: string
}
