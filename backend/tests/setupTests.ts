/* eslint-disable @typescript-eslint/require-await */
type RedisValue = string;

interface StoredValue {
  value: RedisValue;
  expiresAt?: number;
}

interface SortedSetValue {
  score: number;
  member: string;
}

const stringStore = new Map<string, StoredValue>();
const setStore = new Map<string, Set<string>>();
const sortedSetStore = new Map<string, SortedSetValue[]>();

const isExpired = (entry: StoredValue | undefined): boolean => {
  return Boolean(entry?.expiresAt && entry.expiresAt <= Date.now());
};

const getLiveEntry = (key: string): StoredValue | undefined => {
  const entry = stringStore.get(key);

  if (isExpired(entry)) {
    stringStore.delete(key);
    return undefined;
  }

  return entry;
};

class RedisMock {
  public status = 'ready';

  public on(): this {
    return this;
  }

  public off(): this {
    return this;
  }

  public once(event: string, callback: () => void): this {
    if (event === 'ready') {
      queueMicrotask(callback);
    }

    return this;
  }

  public async get(key: string): Promise<string | null> {
    return getLiveEntry(key)?.value ?? null;
  }

  public async set(key: string, value: string, ...args: Array<string | number>): Promise<'OK' | null> {
    const hasNx = args.includes('NX');

    if (hasNx && getLiveEntry(key)) {
      return null;
    }

    const exIndex = args.findIndex((arg) => arg === 'EX');
    const expiresAt =
      exIndex >= 0 && typeof args[exIndex + 1] === 'number'
        ? Date.now() + Number(args[exIndex + 1]) * 1000
        : undefined;

    stringStore.set(key, expiresAt ? { value, expiresAt } : { value });
    return 'OK';
  }

  public async del(...keys: string[]): Promise<number> {
    let deleted = 0;

    for (const key of keys) {
      if (stringStore.delete(key)) {
        deleted += 1;
      }

      setStore.delete(key);
      sortedSetStore.delete(key);
    }

    return deleted;
  }

  public async incr(key: string): Promise<number> {
    const currentEntry = getLiveEntry(key);
    const current = Number(currentEntry?.value ?? '0') + 1;
    stringStore.set(
      key,
      currentEntry?.expiresAt
        ? { value: String(current), expiresAt: currentEntry.expiresAt }
        : { value: String(current) }
    );
    return current;
  }

  public async expire(key: string, seconds: number): Promise<number> {
    const entry = getLiveEntry(key);

    if (!entry) {
      return 0;
    }

    stringStore.set(key, { ...entry, expiresAt: Date.now() + seconds * 1000 });
    return 1;
  }

  public async ttl(key: string): Promise<number> {
    const entry = getLiveEntry(key);

    if (!entry) {
      return -2;
    }

    if (!entry.expiresAt) {
      return -1;
    }

    return Math.max(Math.ceil((entry.expiresAt - Date.now()) / 1000), 0);
  }

  public async sadd(key: string, member: string): Promise<number> {
    const set = setStore.get(key) ?? new Set<string>();
    const sizeBefore = set.size;
    set.add(member);
    setStore.set(key, set);
    return set.size > sizeBefore ? 1 : 0;
  }

  public async sismember(key: string, member: string): Promise<number> {
    return setStore.get(key)?.has(member) ? 1 : 0;
  }

  public async zadd(key: string, score: number, member: string): Promise<number> {
    const values = sortedSetStore.get(key) ?? [];
    const existing = values.find((item) => item.member === member);

    if (existing) {
      existing.score = score;
      return 0;
    }

    values.push({ score, member });
    sortedSetStore.set(key, values);
    return 1;
  }

  public async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    const values = sortedSetStore.get(key) ?? [];
    const retained = values.filter((item) => item.score < min || item.score > max);
    sortedSetStore.set(key, retained);
    return values.length - retained.length;
  }

  public async zcard(key: string): Promise<number> {
    return sortedSetStore.get(key)?.length ?? 0;
  }

  public async quit(): Promise<'OK'> {
    return 'OK';
  }

  public async flushall(): Promise<'OK'> {
    stringStore.clear();
    setStore.clear();
    sortedSetStore.clear();
    return 'OK';
  }
}

jest.mock('ioredis', () => ({
  __esModule: true,
  default: RedisMock
}));
