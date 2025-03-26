import type {
	ConfigurableGetPullsProps,
	ConfigurableGetRepositoriesProps,
	GitHubConfig,
} from './utils/github/structures.js'
import type { SlackConfig } from './utils/slack/structures.js'

export interface InputProps extends ConfigurableGetPullsProps, ConfigurableGetRepositoriesProps {
	githubConfig: GitHubConfig
	slackConfig: SlackConfig
	withPullReport: boolean
	withTestData: boolean
	withUserMentions: boolean
}
