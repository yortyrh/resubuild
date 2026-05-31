import { ApplicationPrepareStore } from './application-prepare.store';

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
});
