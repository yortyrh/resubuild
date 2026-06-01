import { describe, expect, it } from 'vitest';
import {
  mapVolunteerToWork,
  mapWorkToVolunteer,
  stripVolunteerHiddenStorage,
} from './work-volunteer-move';

describe('mapWorkToVolunteer', () => {
  it('maps organization from name and copies shared fields', () => {
    expect(
      mapWorkToVolunteer({
        name: 'Acme Corp',
        position: 'Engineer',
        url: 'https://acme.example',
        startDate: '2020-01',
        endDate: '2021-06',
        summary: 'Built things',
        highlights: ['Shipped v1'],
        location: 'Remote',
        description: 'Contract role',
      }),
    ).toEqual({
      organization: 'Acme Corp',
      position: 'Engineer',
      url: 'https://acme.example',
      startDate: '2020-01',
      endDate: '2021-06',
      summary: 'Built things',
      highlights: ['Shipped v1'],
      location: 'Remote',
      description: 'Contract role',
    });
  });
});

describe('mapVolunteerToWork', () => {
  it('maps name from organization and restores hidden storage', () => {
    expect(
      mapVolunteerToWork({
        organization: 'Open Source Foundation',
        position: 'Maintainer',
        url: 'https://osf.example',
        startDate: '2019-03',
        endDate: '2020-12',
        summary: 'Community work',
        highlights: ['Released 2.0'],
        location: 'Remote',
        description: 'Contract role',
      }),
    ).toEqual({
      name: 'Open Source Foundation',
      position: 'Maintainer',
      url: 'https://osf.example',
      startDate: '2019-03',
      endDate: '2020-12',
      summary: 'Community work',
      highlights: ['Released 2.0'],
      location: 'Remote',
      description: 'Contract role',
    });
  });

  it('leaves work-only fields unset when hidden storage is absent', () => {
    expect(
      mapVolunteerToWork({
        organization: 'Local Nonprofit',
        position: 'Coordinator',
        startDate: '2022-01',
      }),
    ).toEqual({
      name: 'Local Nonprofit',
      position: 'Coordinator',
      startDate: '2022-01',
    });
  });
});

describe('stripVolunteerHiddenStorage', () => {
  it('removes hidden location and description for preview/export', () => {
    expect(
      stripVolunteerHiddenStorage({
        id: 'v1',
        organization: 'Acme',
        location: 'Remote',
        description: 'Hidden',
        position: 'Dev',
      }),
    ).toEqual({
      id: 'v1',
      organization: 'Acme',
      position: 'Dev',
    });
  });
});
