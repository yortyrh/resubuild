import type { ResumeVolunteer, ResumeWork } from '@resumind/types';

/** Volunteer item shape from the editor API, including hidden storage fields. */
export type VolunteerMoveSource = ResumeVolunteer & {
  location?: string;
  description?: string;
};

export function mapWorkToVolunteer(work: ResumeWork): Record<string, unknown> {
  return {
    organization: work.name,
    position: work.position,
    url: work.url,
    startDate: work.startDate,
    endDate: work.endDate,
    summary: work.summary,
    highlights: work.highlights,
    location: work.location,
    description: work.description,
  };
}

export function mapVolunteerToWork(volunteer: VolunteerMoveSource): Record<string, unknown> {
  return {
    name: volunteer.organization,
    position: volunteer.position,
    url: volunteer.url,
    startDate: volunteer.startDate,
    endDate: volunteer.endDate,
    summary: volunteer.summary,
    highlights: volunteer.highlights,
    location: volunteer.location,
    description: volunteer.description,
  };
}

/** Strip hidden volunteer storage fields before JSON Resume preview/export on the client. */
export function stripVolunteerHiddenStorage<T extends Record<string, unknown>>(item: T): T {
  const { location: _location, description: _description, ...rest } = item;
  return rest as T;
}
