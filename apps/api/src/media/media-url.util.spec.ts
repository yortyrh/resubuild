import { parseMediaIdFromViewerUrl } from './media-url.util';

describe('parseMediaIdFromViewerUrl', () => {
  it('extracts uuid from media viewer URL', () => {
    const id = 'aef8297a-2786-4575-9d6c-52d5c93c4c4c';
    expect(parseMediaIdFromViewerUrl(`http://localhost:3001/media/${id}`)).toBe(id);
    expect(parseMediaIdFromViewerUrl(`https://api.example.com/media/${id}?v=1`)).toBe(id);
  });

  it('returns null for external URLs and empty input', () => {
    expect(parseMediaIdFromViewerUrl('https://cdn.example.com/photo.jpg')).toBeNull();
    expect(parseMediaIdFromViewerUrl('')).toBeNull();
    expect(parseMediaIdFromViewerUrl(undefined)).toBeNull();
  });
});
