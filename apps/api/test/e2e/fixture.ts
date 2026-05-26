import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface E2eFixtureUser {
  email: string;
  password: string;
}

export interface E2eFixtureUserRef {
  email: string;
}

export interface E2eFixtureCvState {
  id: string;
  sourceFile: string;
  title: string;
}

export interface E2eFixtureMediaState {
  id: string;
  url: string;
  sourceFile: string;
  contentType: string;
}

export interface E2eFixtureProfilePhotoAssignment {
  cvId: string;
  cvSourceFile: string;
  mediaId: string;
  mediaUrl: string;
  mediaSourceFile: string;
}

export interface E2eFixtureAccountState {
  user: { id: string; email: string };
  cvs: E2eFixtureCvState[];
  media: E2eFixtureMediaState[];
  profilePhotoAssignments: E2eFixtureProfilePhotoAssignment[];
}

export interface E2eFixtureState {
  version: number;
  seededAt: string;
  apiBaseUrl: string;
  e2e: E2eFixtureAccountState;
}

export interface E2eFixtureFile {
  version: number;
  developerUser: E2eFixtureUserRef;
  e2eUser: E2eFixtureUserRef;
  resumesDir: string;
  mediaDir: string;
  cvProfilePhotos: Record<string, string>;
  resumes: string[];
  media: string[];
}

export interface LocalCredentials {
  generatedAt: string;
  appUrl: string;
  developerUser: E2eFixtureUser;
  e2eUser: E2eFixtureUser;
}

/** Resolved fixture with per-machine passwords from local-credentials.json */
export interface E2eFixture extends E2eFixtureFile {
  developerUser: E2eFixtureUser;
  e2eUser: E2eFixtureUser;
}

const repoRoot = path.resolve(__dirname, '../../../..');
const fixturePath = path.join(repoRoot, '.samples/e2e-fixture.json');
const credentialsPath = path.join(repoRoot, '.samples/local-credentials.json');
const statePath = path.join(repoRoot, '.samples/e2e-fixture.state.json');

function loadLocalCredentials(): LocalCredentials {
  if (!existsSync(credentialsPath)) {
    throw new Error(`Missing ${credentialsPath}. Run: pnpm samples:seed`);
  }
  return JSON.parse(readFileSync(credentialsPath, 'utf8')) as LocalCredentials;
}

export function loadFixture(): E2eFixture {
  const file = JSON.parse(readFileSync(fixturePath, 'utf8')) as E2eFixtureFile;
  const credentials = loadLocalCredentials();
  return {
    ...file,
    developerUser: credentials.developerUser,
    e2eUser: credentials.e2eUser,
  };
}

export function loadFixtureState(): E2eFixtureState {
  return JSON.parse(readFileSync(statePath, 'utf8')) as E2eFixtureState;
}

/** E2E tests assert against the dedicated e2e account, not the developer account. */
export function loadE2eAccountState(): E2eFixtureAccountState {
  const state = loadFixtureState();
  if (state.e2e) {
    return state.e2e;
  }
  const legacy = state as unknown as {
    user?: { id: string; email: string };
    cvs?: E2eFixtureCvState[];
    media?: E2eFixtureMediaState[];
    profilePhotoAssignment?: E2eFixtureProfilePhotoAssignment;
    profilePhotoAssignments?: E2eFixtureProfilePhotoAssignment[];
  };
  return {
    user: legacy.user!,
    cvs: legacy.cvs!,
    media: legacy.media!,
    profilePhotoAssignments:
      legacy.profilePhotoAssignments ??
      (legacy.profilePhotoAssignment ? [legacy.profilePhotoAssignment] : []),
  };
}

export function samplesPath(...segments: string[]): string {
  return path.join(repoRoot, '.samples', ...segments);
}
