import type { ObjectStorageService } from './object-storage.service';

interface StoredObject {
  body: Buffer;
  contentType: string;
}

/**
 * Test double for {@link ObjectStorageService}: same public surface, objects
 * kept in a Map keyed by `bucket/key`. Presigned URLs are deterministic fakes.
 */
export class InMemoryObjectStorage implements Pick<
  ObjectStorageService,
  'isConfigured' | 'put' | 'get' | 'remove' | 'presignGet' | 'ensureBucket'
> {
  readonly objects = new Map<string, StoredObject>();
  configured = true;

  private id(bucket: string, key: string): string {
    return `${bucket}/${key}`;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async put(bucket: string, key: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(this.id(bucket, key), { body: Buffer.from(body), contentType });
  }

  async get(bucket: string, key: string): Promise<Buffer | null> {
    return this.objects.get(this.id(bucket, key))?.body ?? null;
  }

  async remove(bucket: string, keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of new Set(keys)) {
      if (this.objects.delete(this.id(bucket, key))) removed++;
    }
    return removed;
  }

  async presignGet(bucket: string, key: string, ttlSeconds: number): Promise<string> {
    return `https://storage.test/${bucket}/${key}?X-Amz-Expires=${ttlSeconds}`;
  }

  async ensureBucket(): Promise<void> {}

  keys(bucket: string): string[] {
    const prefix = `${bucket}/`;
    return [...this.objects.keys()]
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length))
      .sort();
  }

  asService(): ObjectStorageService {
    return this as unknown as ObjectStorageService;
  }
}
