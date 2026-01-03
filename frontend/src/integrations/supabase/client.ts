// Lightweight stub to remove Supabase dependency; returns empty results and prevents network calls.
// TODO: replace with real backend endpoints or remove remaining callers.
// Lightweight stub that proxies audit log reads to the Express backend; other calls remain no-ops.
// TODO: replace remaining supabase usage with direct API calls.
import { api } from '@/lib/api';

type QueryResult<T = any> = { data: T; error: null };

const makeEmptyResponse = <T = any>(data: T = [] as unknown as T): QueryResult<T> => ({ data, error: null });

const fetchAuditLogs = async () => {
  try {
    const logs = await api.get<any[]>(`/api/admin/audit-logs`);
    return { data: logs, error: null } as const;
  } catch (error) {
    console.error('Failed to fetch audit logs from backend', error);
    return { data: [] as any[], error: error as any } as const;
  }
};

const createQueryBuilder = <T = any>(table: string) => {
  const builder: any = {
    select: (_cols?: string) => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    eq: (_field: string, _value: any) => builder,
    ilike: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => builder,
    gte: () => builder,
    lte: () => builder,
    rpc: () => builder,
    then: (resolve: any) => {
      if (table === 'audit_logs') {
        return fetchAuditLogs().then(resolve);
      }
      return resolve(makeEmptyResponse<T>());
    },
    catch: (_reject: any) => builder,
    // Support direct await usage
    async *[Symbol.asyncIterator]() {},
    async [Symbol.asyncDispose]() {},
  };

  // Allow `await query` to work by making it thenable
  builder[Symbol.toStringTag] = 'SupabaseQueryBuilder';
  return builder;
};

export const supabase = {
  from: <T = any>(table: string) => createQueryBuilder<T>(table),
  auth: {
    signUp: async () => makeEmptyResponse({ user: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
  },
  functions: {
    invoke: async () => makeEmptyResponse(),
  },
  rpc: async () => makeEmptyResponse(),
};