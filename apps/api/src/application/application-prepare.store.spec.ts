import { ApplicationPrepareStore, createApplicationId } from './application-prepare.store';

describe('ApplicationPrepareStore', () => {
  it('tracks cancellation and intake snapshot', () => {
    const store = new ApplicationPrepareStore();
    store.init('app-1', 'user-1', {
      intake: { sourceType: 'text', text: 'Job description' },
    });

    expect(store.isCancelled('app-1')).toBe(false);
    store.markCancelled('app-1');
    expect(store.isCancelled('app-1')).toBe(true);

    store.clearCancelled('app-1');
    expect(store.isCancelled('app-1')).toBe(false);
    expect(store.get('app-1', 'user-1')?.intake?.text).toBe('Job description');
  });

  it('returns null for missing or foreign records', () => {
    const store = new ApplicationPrepareStore();
    store.init('app-1', 'user-1');

    expect(store.get('missing', 'user-1')).toBeNull();
    expect(store.get('app-1', 'other-user')).toBeNull();
    expect(store.update('missing', { progress: 'selecting_cv' })).toBeNull();
    expect(store.markCancelled('missing')).toBeNull();
  });

  it('prunes expired records on access', () => {
    jest.useFakeTimers();
    const store = new ApplicationPrepareStore(1000);
    store.init('app-1', 'user-1', { intake: { sourceType: 'text', text: 'Old job' } });

    jest.advanceTimersByTime(1500);
    expect(store.get('app-1', 'user-1')).toBeNull();

    jest.useRealTimers();
  });

  it('creates application ids', () => {
    expect(createApplicationId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
