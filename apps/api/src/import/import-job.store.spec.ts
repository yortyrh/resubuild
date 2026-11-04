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
    expect(store.fail('missing', ['x'])).toBeNull();
  });

  it('fail() records the running step as failedStep and clears progress', () => {
    const store = new ImportJobStore();
    const job = store.create('user-1');
    store.update(job.id, { status: 'running', progress: 'drafting' });

    const failed = store.fail(job.id, ['LLM returned malformed JSON']);

    expect(failed).toMatchObject({
      status: 'failed',
      failedStep: 'drafting',
      errors: ['LLM returned malformed JSON'],
    });
    expect(failed).not.toHaveProperty('progress');
  });

  it('fail() before any step leaves failedStep unset', () => {
    const store = new ImportJobStore();
    const job = store.create('user-1');
    expect(store.fail(job.id, ['boom'])).not.toHaveProperty('failedStep');
  });
});
