import type {
	ConfigurableGetPullsProps,
	ConfigurableGetRepositoriesProps,
	GitHubClientProps,
} from './utils/github/structures.js'
import type { SlackClientProps } from './utils/slack/structures.js'

export interface RunProps extends ConfigurableGetPullsProps, ConfigurableGetRepositoriesProps {
	githubProps: GitHubClientProps
	slackProps: SlackClientProps
	withPullReport: boolean
	withTestData: boolean
	withUserMentions: boolean
}
