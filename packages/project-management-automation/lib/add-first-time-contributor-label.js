/**
 * External dependencies
 */
const got = /** @type {*} */ ( require( 'got' ) ); // See: https://github.com/sindresorhus/got/issues/1137

/**
 * Internal dependencies
 */
const debug = require( './debug' );
const getAssociatedPullRequest = require( './get-associated-pull-request' );

/** @typedef {import('@actions/github').GitHub} GitHub */
/** @typedef {import('@octokit/webhooks').WebhookPayloadPush} WebhookPayloadPush */
/** @typedef {import('./get-associated-pull-request').WebhookPayloadPushCommit} WebhookPayloadPushCommit */

/**
 * Base endpoint URL for WordPress.org profile lookup by GitHub username.
 *
 * @type {string}
 */
const BASE_PROFILE_LOOKUP_API_URL =
	'https://profiles.wordpress.org/wp-json/wporg-github/v1/lookup/';

/**
 * Message of comment prompting contributor to link their GitHub account from
 * their WordPress.org profile for props credit.
 *
 * @type {string}
 */
const ACCOUNT_LINK_PROMPT =
	'Congratulations on your first merged pull request! We would like to ' +
	'give you credit for your contribution in the next WordPress release, but ' +
	'we were unable to find a WordPress.org profile associated with your ' +
	'GitHub account. At your convenience, please visit the following URL and ' +
	'click "link your GitHub account" under "GitHub Username" to initiate ' +
	'the process to link your accounts:\n\nhttps://profiles.wordpress.org/me/profile/edit/\n\n' +
	'If you do not have a WordPress.org account, you can create one at the ' +
	'following page:\n\nhttps://login.wordpress.org/register';

/**
 * Adds the 'First Time Contributor' label to PRs merged on behalf of
 * contributors that have not yet made a commit.
 *
 * @param {WebhookPayloadPush} payload Push event payload.
 * @param {GitHub}             octokit Initialized Octokit REST client.
 */
async function addFirstTimeContributorLabel( payload, octokit ) {
	if ( payload.ref !== 'refs/heads/master' ) {
		debug(
			'add-first-time-contributor-label: Commit is not to `master`. Aborting'
		);
		return;
	}

	const commit =
		/** @type {WebhookPayloadPushCommit} */ ( payload.commits[ 0 ] );
	const pullRequest = getAssociatedPullRequest( commit );
	if ( ! pullRequest ) {
		debug(
			'add-first-time-contributor-label: Cannot determine pull request associated with commit. Aborting'
		);
		return;
	}

	const repo = payload.repository.name;
	const owner = payload.repository.owner.login;
	const author = commit.author.username;
	debug(
		`add-first-time-contributor-label: Searching for commits in ${ owner }/${ repo } by @${ author }`
	);

	const {
		data: { total_count: totalCount },
	} = await octokit.search.commits( {
		q: `repo:${ owner }/${ repo }+author:${ author }`,
	} );

	if ( totalCount !== 0 ) {
		debug(
			`add-first-time-contributor-label: ${ totalCount } commits found. Aborting`
		);
		return;
	}

	debug(
		`add-first-time-contributor-label: Adding 'First Time Contributor' label to issue #${ pullRequest }`
	);

	await octokit.issues.addLabels( {
		owner,
		repo,
		issue_number: pullRequest,
		labels: [ 'First-time Contributor' ],
	} );

	debug(
		`add-first-time-contributor-label: Checking for WordPress username associated with @${ author }`
	);

	let dotOrgUsername;
	try {
		const response = await got(
			BASE_PROFILE_LOOKUP_API_URL + author,
			/** @type {import('got').Options} */ ( {
				responseType: 'json',
			} )
		);
		dotOrgUsername = response.body.slug;
	} catch ( error ) {
		debug(
			`add-first-time-contributor-label: Error retrieving from profile API:\n\n${ error.toString() }`
		);
		return;
	}

	if ( dotOrgUsername ) {
		debug(
			`add-first-time-contributor-label: User already known as ${ dotOrgUsername }. No need to prompt for account link!`
		);
		return;
	}

	await octokit.issues.createComment( {
		owner,
		repo,
		issue_number: pullRequest,
		body: ACCOUNT_LINK_PROMPT,
	} );
}

module.exports = addFirstTimeContributorLabel;
