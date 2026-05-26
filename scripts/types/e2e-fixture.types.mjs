/**
 * @typedef {object} E2eFixtureUserRef
 * @property {string} email
 */

/**
 * @typedef {object} E2eFixtureUser
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {object} E2eFixtureProfilePhoto
 * @property {number} [randomSeed]
 * @property {string} [comment]
 */

/**
 * @typedef {object} E2eFixture
 * @property {number} version
 * @property {string} [description]
 * @property {E2eFixtureUserRef} developerUser
 * @property {E2eFixtureUserRef} e2eUser
 * @property {string} resumesDir
 * @property {string} mediaDir
 * @property {Record<string, string>} cvProfilePhotos
 * @property {string[]} resumes
 * @property {string[]} media
 */

/**
 * @typedef {object} E2eFixtureCvState
 * @property {string} id
 * @property {string} sourceFile
 * @property {string} title
 */

/**
 * @typedef {object} E2eFixtureMediaState
 * @property {string} id
 * @property {string} url
 * @property {string} sourceFile
 * @property {string} contentType
 */

/**
 * @typedef {object} E2eFixtureProfilePhotoAssignment
 * @property {string} cvId
 * @property {string} cvSourceFile
 * @property {string} mediaId
 * @property {string} mediaUrl
 * @property {string} mediaSourceFile
 */

/**
 * @typedef {object} E2eFixtureAccountState
 * @property {{ id: string; email: string }} user
 * @property {E2eFixtureCvState[]} cvs
 * @property {E2eFixtureMediaState[]} media
 * @property {E2eFixtureProfilePhotoAssignment[]} profilePhotoAssignments
 */

/**
 * @typedef {object} E2eFixtureState
 * @property {number} version
 * @property {string} seededAt
 * @property {string} apiBaseUrl
 * @property {E2eFixtureAccountState} e2e
 */

export {};
