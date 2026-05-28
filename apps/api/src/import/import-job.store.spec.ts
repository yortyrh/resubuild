import { ImportJobStore } from './import-job.store';

describe('ImportJobStore', () => {
  it('creates and retrieves jobs scoped to user', () => {
    const store = new ImportJobStore();
    const job = store.create('user-1');

    expect(store.get(job.id, 'user-1')).toMatchObject({ status: 'queued' });
    expect(store.get(job.id, 'user-2')).toBeNull();
  });

  it('updates job state', () => {
    const store = new ImportJobStore();
    const job = store.create('user-1');
    const updated = store.update(job.id, { status: 'running', progress: 'drafting' });

    expect(updated).toMatchObject({ status: 'running', progress: 'drafting' });
  });

  it('expires jobs after ttl', () => {
    jest.useFakeTimers();
    const store = new ImportJobStore(1000);
    const job = store.create('user-1');

    jest.advanceTimersByTime(2000);
    expect(store.get(job.id, 'user-1')).toBeNull();
    jest.useRealTimers();
  });

  it('returns null when updating unknown jobs', () => {
    const store = new ImportJobStore();
    expect(store.update('missing', { status: 'failed' })).toBeNull();
  });
});
