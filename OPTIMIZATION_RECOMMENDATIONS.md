# Supabase Resource Optimization

## ✅ Applied

- **Database Indexes & Query Optimization**: Added database indexes for frequently queried columns and limited SELECT projections.
- **1. Debounce Auth State Queries**: Implemented in `useAuth.ts` via `debounce(..., 500)` to debounce `checkAccess` calls.
- **2. Cached Profile Upsert**: Implemented in `useAuth.ts` using `localStorage` caching key (`profile_ensured_${userId}`) to avoid redundant writes.
- **3. Fixed Dependency Loops**: `refreshMemberships` in `TeamScopeContext.tsx` depends cleanly only on `[sessionUserId]`.
- **4. Eliminated Full Page Reload**: In `App.tsx`, invite handler cleans URL params via `history.replaceState` without triggering `window.location.reload()`.
- **5. Worker Database Client Lifecycle**: API (`apps/api/src/shared/db.ts` and handlers) uses transient `max: 1` connections with deterministic `closeDb` in `finally` blocks (ADR-016).

## 🟡 Important - Consider for Future

### 1. Managed Connection Pooling
Use Supabase's connection pooler for production workloads to mitigate connection limits.

### 2. Client-side Query Caching
Implement React Query or SWR to cache Supabase responses, reducing redundant fetches and improving route transition performance.

### 3. Auth Check Optimization
Cache `checkAccess` permissions in `localStorage` with a TTL (e.g., 5 minutes) to avoid redundant remote checks during rapid session state changes.

### 4. Cloudflare Hyperdrive
If traffic scales significantly, utilize Cloudflare Hyperdrive for low-latency pooled PostgreSQL access from Workers.

## 📊 Expected Impact

**Current Optimizations (Indexes + Query Optimization + Debouncing + Transient Pool):**
- 60-80% reduction in query execution time
- 30-40% reduction in bandwidth usage
- Prevention of connection pool exhaustion under concurrent traffic spikes on the Supabase free tier

## Next Steps

1. **Push current PR** and let CI apply the migration
2. **Monitor Supabase dashboard** for 24 hours
3. **If still exhausted**, apply recommendations #1-4
4. **If free tier limits hit**, consider upgrading to Pro ($25/mo)
