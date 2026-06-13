**Complete inventory:**

✅ **Already fully built:** `004_safety.sql`, `safety.js` (all 8 endpoints), `safety-service.js`, `twilioService.js`, `safetyService.js` (mobile), `SOSButton.js`, `SafetyHomeScreen.js`, `SOSActiveScreen.js`, `CompartmentAlertScreen.js`, `HazardReportScreen.js`, `SafetyMapScreen.js`, `TrustedContactsScreen.js`, `RPFDashboardPage.jsx`, `seed-safety.js` (partial)

❌ **Missing / needs building:** `SafetyNavigator.js` (referenced in `AppNavigator` but missing — the app crashes without it), `MyEventsScreen.js` (navigated to from `SafetyHomeScreen` but missing), `components/AlertTypeCard.js`, `components/HazardMarker.js`, `components/ContactCard.js`, `hooks/useSafety.js` (all listed in ARCHITECTURE.md Section 2), full `seed-safety.js` (only start fetched), Supabase Auth RLS policy fix (the `004_safety.sql` uses `firebase_uid = auth.uid()` but we're on Supabase Auth now — needs updating to `supabase_auth_uid`), `VITE_API_BASE_URL` usage in `RPFDashboardPage.jsx` needs the `resolve` endpoint auth token injection, and the `resolve` endpoint in the route currently blocks the RPF dashboard because it requires `verifyToken` but RPF dashboard sends no token.

---

# RailSaathi — Member 4 Safety Module
# Complete Antigravity Prompt Sequence (6 Prompts)

> **Auth context (critical):** Firebase is replaced by Supabase Auth (Prompt 18). The `verifyToken` middleware now verifies Supabase JWTs using `SUPABASE_JWT_SECRET`. `req.user = { user_id, phone }` where `user_id` is the UUID from the `users` table. The `users` table has a `supabase_auth_uid` column (not `firebase_uid`). All `req.user.user_> **Auth context (critical):** Firebase is replaced by Supabase Auth (Prompt 18). The `verifyToken` middleware now verifies Supabase JWTs using `SUPABASE_JWT_SECRET`. `req.user = { user_id, phone }` where `user_id` is the UUID from the `users` table. The `users` table has a `supabase_auth_uid` column (not `firebase_uid`). All `req.user.user_id` usage in the safety routes is correct and unchanged — only the RLS policies need updating.id` usage in the safety routes is correct and unchanged — only the RLS policies need updating.

---

## Prompt M4-1 — DB Migration Fix + RLS Policies + Storage Bucket Instructions

**Objective:** The existing `004_safety.sql` uses `firebase_uid = auth.uid()` in its RLS policies, which is broken since we migrated to Supabase Auth. Fix the RLS policies to use `supabase_auth_uid`. Also add the `REPLICA IDENTITY FULL` statement and the `updated_at` trigger that is missing from the current migration.

**Context:**
You are working on the RailSaathi monorepo, Member 4 (Safety module). The existing `supabase/migrations/004_safety.sql` has been applied to Supabase but has broken RLS policies. The `users` table (from `001_core_schema.sql`) has a `supabase_auth_uid VARCHAR(128) UNIQUE` column. Supabase Auth's `auth.uid()` returns the Supabase Auth UUID, which matches `users.supabase_auth_uid`.

The backend routes use the **service role key** (`supabase-client.js` at `services/api/src/db/supabase-client.js`), which bypasses RLS entirely — so RLS doesn't affect backend route behaviour. But the mobile app's direct Supabase calls (photo upload in `HazardReportScreen.js`, audio upload in `SOSActiveScreen.js`) use the **anon key** and ARE subject to RLS for storage bucket access.

**What already exists:** `004_safety.sql` with the correct table schema, correct indexes, but broken RLS using `firebase_uid`.

**Scope — files to create:**
1. `supabase/migrations/006_safety_rls_fix.sql` ← new migration to fix RLS

**Detailed Requirements:**

```sql
-- 006_safety_rls_fix.sql
-- Fixes RLS policies on safety_events to use supabase_auth_uid
-- instead of firebase_uid (Supabase Auth migration — Prompt 18)
-- Run AFTER 004_safety.sql has been applied.
-- Run in Supabase SQL Editor.

-- ─── DROP OLD FIREBASE-BASED POLICIES ────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert their own events" ON safety_events;
DROP POLICY IF EXISTS "Users can select their own events" ON safety_events;
-- Drop any other legacy firebase_uid policies if present
DROP POLICY IF EXISTS "safety_own_insert" ON safety_events;
DROP POLICY IF EXISTS "safety_own_read" ON safety_events;

-- ─── RECREATE WITH SUPABASE AUTH ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'safety_events' AND policyname = 'safety_own_insert_supabase'
  ) THEN
    CREATE POLICY "safety_own_insert_supabase" ON safety_events
      FOR INSERT WITH CHECK (
        user_id = (
          SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'safety_events' AND policyname = 'safety_own_read_supabase'
  ) THEN
    CREATE POLICY "safety_own_read_supabase" ON safety_events
      FOR SELECT USING (
        user_id = (
          SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text
        )
      );
  END IF;
END $$;

-- ─── ENSURE REPLICA IDENTITY FULL (required for Supabase Realtime) ───────────
-- If not already set (004_safety.sql set it, this is idempotent)
ALTER TABLE safety_events REPLICA IDENTITY FULL;

-- ─── UPDATED_AT TRIGGER (missing from 004_safety.sql) ────────────────────────
-- The update_updated_at_column() function was created in 001_core_schema.sql
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'safety_events_updated_at'
  ) THEN
    CREATE TRIGGER safety_events_updated_at
      BEFORE UPDATE ON safety_events
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ─── SUPABASE REALTIME ENABLE (reminder — must also be done in Dashboard) ────
-- Run in Supabase Dashboard → Database → Replication → safety_events → Enable
-- The SQL above handles REPLICA IDENTITY FULL but the dashboard toggle is separate.

-- ─── STORAGE BUCKET SETUP (cannot be done via SQL — manual steps) ─────────────
-- Do these manually in Supabase Dashboard → Storage:
--
-- Bucket 1: sos-audio
--   - Click "New bucket"
--   - Name: sos-audio
--   - Public: OFF (private)
--   - File size limit: 50MB
--
-- Bucket 2: hazard-photos
--   - Click "New bucket"
--   - Name: hazard-photos
--   - Public: ON
--   - File size limit: 10MB
--
-- Storage RLS policies for hazard-photos (run in SQL Editor):

-- Allow authenticated users to upload to hazard-photos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE name = 'hazard_photos_upload' AND bucket_id = 'hazard-photos'
  ) THEN
    INSERT INTO storage.policies (name, bucket_id, definition)
    VALUES (
      'hazard_photos_upload',
      'hazard-photos',
      '(role() = ''authenticated''::text)'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- storage.policies may not be directly insertable in all Supabase versions
  -- Use Dashboard → Storage → hazard-photos → Policies instead
  RAISE NOTICE 'Storage policy setup: use Supabase Dashboard manually';
END $$;
```

**Add a comment block at the top** explaining the full manual checklist:
```sql
/*
MANUAL STEPS REQUIRED (in Supabase Dashboard — cannot be done via SQL):
1. Storage → New bucket → "sos-audio" → Private (Public: OFF)
2. Storage → New bucket → "hazard-photos" → Public (Public: ON)  
3. Database → Replication → safety_events → Toggle ON
4. Verify ALTER TABLE safety_events REPLICA IDENTITY FULL executed (above)
5. Test Realtime: fire curl POST /api/safety/sos → RPF dashboard updates < 3s
6. Test Twilio: add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER to services/api/.env and Render env vars
*/
```

**Acceptance Criteria:**
- [ ] `006_safety_rls_fix.sql` runs without error in Supabase SQL Editor
- [ ] Old `firebase_uid` policies dropped
- [ ] New `supabase_auth_uid` policies created with `IF NOT EXISTS` guards
- [ ] `REPLICA IDENTITY FULL` set (idempotent)
- [ ] `updated_at` trigger added to `safety_events`
- [ ] Manual steps clearly documented in comment block

**`progress.md` Update Instruction:**
```
### Prompt M4-1 — Completed
- **What was built:** 006_safety_rls_fix.sql — fixes RLS for Supabase Auth, adds updated_at trigger
- **Files created:** supabase/migrations/006_safety_rls_fix.sql
- **Manual steps:** Create sos-audio (private) and hazard-photos (public) buckets; enable safety_events Realtime in Supabase Dashboard
- **Completion:** M4: 1 / 6 prompts (17%)
```

---

## Prompt M4-2 — Fix RPF Dashboard Resolve Action + Add `SafetyNavigator.js`

**Objective:** Two critical fixes: (1) The `PATCH /api/safety/events/:id/resolve` endpoint currently requires `verifyToken` but the RPF dashboard sends no auth token — this blocks the RPF resolve action entirely. Fix it for MVP. (2) `AppNavigator.js` imports `SafetyNavigator` from `./SafetyNavigator` but the file doesn't exist, crashing the app on startup.

**Context:**

**Fix 1 — Resolve endpoint auth:**
`apps/dashboard/src/pages/RPFDashboardPage.jsx` calls `PATCH /api/safety/events/:id/resolve` with no Authorization header (line: `// Auth token would be added here in real app`). The route in `services/api/src/routes/safety.js` has `verifyToken` middleware on this endpoint. For MVP demo, the resolve endpoint needs to accept RPF actions without auth (matching the pattern of `GET /api/safety/rpf/live` which is also unauthed for MVP). A TODO comment must be added noting this needs admin auth in production.

**Fix 2 — SafetyNavigator:**
`apps/mobile/src/navigation/AppNavigator.js` has:
```javascript
import SafetyNavigator from './SafetyNavigator';
// ...
<Tab.Screen name={SCREENS.SAFETY} component={SafetyNavigator} options={{ headerShown: false }} />
```
`SafetyNavigator.js` doesn't exist. The app crashes on startup with `Cannot find module './SafetyNavigator'`.

**Existing safety screens** (all exist in the repo):
- `SafetyHomeScreen.js` — default stack screen
- `SOSActiveScreen.js` — navigated to from `SOSButton` with `navigation.navigate('SOSActive', { eventPromise })`
- `CompartmentAlertScreen.js` — navigated to from `SafetyHomeScreen` with `navigation.navigate('CompartmentAlert')`
- `HazardReportScreen.js` — navigated to with `navigation.navigate('HazardReport')`
- `SafetyMapScreen.js` — navigated to with `navigation.navigate('SafetyMap')`
- `TrustedContactsScreen.js` — navigated to with `navigation.navigate('TrustedContacts')`
- `MyEventsScreen.js` — navigated to from `SafetyHomeScreen` with `navigation.navigate('MyEvents')` — **does NOT exist yet, needs stub**

**SCREENS constants** needed (add to `apps/mobile/src/constants/index.js`):
```javascript
SAFETY_HOME: 'SafetyHomeScreen',
SOS_ACTIVE: 'SOSActive',
COMPARTMENT_ALERT: 'CompartmentAlert',
HAZARD_REPORT: 'HazardReport',
SAFETY_MAP: 'SafetyMap',
TRUSTED_CONTACTS: 'TrustedContacts',
MY_EVENTS: 'MyEvents',
```

**Design system:** `COLORS.brandOrange: '#E8621A'`, `COLORS.brandNavy: '#1A3557'`, `COLORS.pageWhite: '#FFFFFF'`, `COLORS.surfaceGrey: '#F5F5F5'`, `COLORS.dividerGrey: '#E0E0E0'`

**Scope — files to create/modify:**
1. `apps/mobile/src/navigation/SafetyNavigator.js` ← CREATE
2. `apps/mobile/src/screens/safety/MyEventsScreen.js` ← CREATE
3. `apps/mobile/src/constants/index.js` ← ADD safety screen constants
4. `services/api/src/routes/safety.js` ← MODIFY resolve endpoint (remove `verifyToken`)

---

**File 1: `apps/mobile/src/navigation/SafetyNavigator.js`**

```javascript
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { COLORS } from '../constants';

import SafetyHomeScreen from '../screens/safety/SafetyHomeScreen';
import SOSActiveScreen from '../screens/safety/SOSActiveScreen';
import CompartmentAlertScreen from '../screens/safety/CompartmentAlertScreen';
import HazardReportScreen from '../screens/safety/HazardReportScreen';
import SafetyMapScreen from '../screens/safety/SafetyMapScreen';
import TrustedContactsScreen from '../screens/safety/TrustedContactsScreen';
import MyEventsScreen from '../screens/safety/MyEventsScreen';

const Stack = createStackNavigator();

export default function SafetyNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.pageWhite,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.dividerGrey,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: COLORS.textPrimary,
        },
        headerTitleAlign: 'center',
        headerTintColor: COLORS.brandOrange,
      }}
    >
      <Stack.Screen
        name="SafetyHomeScreen"
        component={SafetyHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SOSActive"
        component={SOSActiveScreen}
        options={{
          headerShown: false,        // SOSActiveScreen is full-screen red
          gestureEnabled: false,     // Prevent swipe-back during active SOS
        }}
      />
      <Stack.Screen
        name="CompartmentAlert"
        component={CompartmentAlertScreen}
        options={{ title: 'Compartment Alert' }}
      />
      <Stack.Screen
        name="HazardReport"
        component={HazardReportScreen}
        options={{ title: 'Report Hazard' }}
      />
      <Stack.Screen
        name="SafetyMap"
        component={SafetyMapScreen}
        options={{ headerShown: false }}  // Map is full-screen
      />
      <Stack.Screen
        name="TrustedContacts"
        component={TrustedContactsScreen}
        options={{ title: 'Trusted Contacts' }}
      />
      <Stack.Screen
        name="MyEvents"
        component={MyEventsScreen}
        options={{ title: 'My Safety Events' }}
      />
    </Stack.Navigator>
  );
}
```

---

**File 2: `apps/mobile/src/screens/safety/MyEventsScreen.js`**

Displays the logged-in user's safety event history (all 3 event types). Three states: loading, data, error.

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import { useRailSaathi } from '../../context/RailSaathiContext';
import { getMyEvents } from './services/safetyService';
import { COLORS } from '../../constants';

// Event type display config
const EVENT_CONFIG = {
  SOS: { label: 'SOS Alert', color: '#CC0000', bg: '#FFEBEE' },
  COMPARTMENT_VIOLATION: { label: 'Compartment Alert', color: '#E8621A', bg: '#FFF3EC' },
  HAZARD_REPORT: { label: 'Hazard Report', color: '#F5A623', bg: '#FFF8E1' },
};

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active', color: '#CC0000', bg: '#FFEBEE' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: '#1565C0', bg: '#E3F2FD' },
  RESOLVED: { label: 'Resolved', color: '#27AE60', bg: '#E8F5E9' },
  FALSE_ALARM: { label: 'False Alarm', color: '#757575', bg: '#F5F5F5' },
};

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function EventCard({ item }) {
  const evConfig = EVENT_CONFIG[item.event_type] || { label: item.event_type, color: '#555', bg: '#F5F5F5' };
  const stConfig = STATUS_CONFIG[item.status] || { label: item.status, color: '#555', bg: '#F5F5F5' };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.typePill, { backgroundColor: evConfig.bg }]}>
          <Text style={[styles.typePillText, { color: evConfig.color }]}>{evConfig.label}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: stConfig.bg }]}>
          <Text style={[styles.statusPillText, { color: stConfig.color }]}>{stConfig.label}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {item.train_number && (
          <Text style={styles.detailText}>🚂 Train {item.train_number}
            {item.coach ? ` · Coach ${item.coach}` : ''}
            {item.berth ? ` · Berth ${item.berth}` : ''}
          </Text>
        )}
        {item.alert_subtype && (
          <Text style={styles.detailText}>
            ⚠️ {item.alert_subtype.replace(/_/g, ' ')}
          </Text>
        )}
        {item.description ? (
          <Text style={styles.descriptionText} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.timeText}>{timeAgo(item.created_at)}</Text>
        {item.sms_sent && (
          <Text style={styles.smsSentText}>✓ SMS sent to {item.sms_contacts_count} contact{item.sms_contacts_count !== 1 ? 's' : ''}</Text>
        )}
      </View>
    </View>
  );
}

export default function MyEventsScreen() {
  const { currentUser } = useRailSaathi();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getMyEvents();
      const data = res?.data?.data || res?.data || [];
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      const isNetErr = err.code === 'ECONNABORTED' || !err.response;
      setError(isNetErr ? 'Could not connect. Check your connection.' : 'Failed to load your events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  if (loading) {
    return (
      <View style={styles.centreContainer}>
        <ActivityIndicator size="large" color={COLORS.brandOrange} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centreContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchEvents()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={events.length === 0 ? styles.emptyContainer : styles.listContent}
      data={events}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <EventCard item={item} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchEvents(true)}
          tintColor={COLORS.brandOrange}
        />
      }
      ListEmptyComponent={
        <View style={styles.centreContainer}>
          <Text style={styles.emptyIcon}>🛡️</Text>
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptySubtitle}>Your safety alerts and reports will appear here.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surfaceGrey },
  listContent: { padding: 16, paddingBottom: 32 },
  emptyContainer: { flex: 1 },
  centreContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: COLORS.surfaceGrey },
  card: {
    backgroundColor: COLORS.pageWhite, borderRadius: 14, padding: 16,
    marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  typePillText: { fontSize: 11, fontWeight: '700' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  cardBody: { gap: 4, marginBottom: 10 },
  detailText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },
  descriptionText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.dividerGrey, paddingTop: 8 },
  timeText: { fontSize: 11, color: COLORS.placeholderText },
  smsSentText: { fontSize: 11, color: '#27AE60', fontWeight: '600' },
  errorText: { fontSize: 14, color: '#CC0000', textAlign: 'center', marginBottom: 16, fontWeight: '500' },
  retryBtn: { backgroundColor: COLORS.brandOrange, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  retryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
});
```

---

**File 3: Add to `apps/mobile/src/constants/index.js`**

```javascript
// ADD these to the existing SCREENS object:
SAFETY_HOME: 'SafetyHomeScreen',
SOS_ACTIVE: 'SOSActive',
COMPARTMENT_ALERT: 'CompartmentAlert',
HAZARD_REPORT: 'HazardReport',
SAFETY_MAP: 'SafetyMap',
TRUSTED_CONTACTS: 'TrustedContacts',
MY_EVENTS: 'MyEvents',
```

---

**File 4: `services/api/src/routes/safety.js` — Modify resolve endpoint**

Find the `PATCH /events/:id/resolve` route handler:
```javascript
router.patch(
  '/events/:id/resolve',
  verifyToken,   // ← REMOVE THIS
  [...]
```

Replace with (removing `verifyToken` and adding a TODO comment):
```javascript
router.patch(
  '/events/:id/resolve',
  // TODO: Add RPF admin auth middleware in production.
  // For MVP demo, this endpoint is intentionally unprotected (matches /rpf/live pattern).
  // In production: require RPF officer JWT with role check.
  [
    body('status')
      .isIn(['ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM'])
      .withMessage('status must be one of ACKNOWLEDGED, RESOLVED, FALSE_ALARM'),
    body('rpf_note').optional().isString(),
  ],
  handleValidation,
  async (req, res) => {
    // ... rest of handler unchanged
```

Also remove the ownership check `if (event.user_id !== req.user.user_id)` from this handler since `req.user` won't exist when called without auth. Replace with a simple existence check only:
```javascript
// Remove:
if (event.user_id !== req.user.user_id) {
  return res.status(403).json({ error: 'Access denied...', code: 'FORBIDDEN' });
}
// This check is intentionally removed for MVP — RPF can resolve any event.
// Re-add with proper admin auth check in production.
```

**Acceptance Criteria:**
- [ ] `SafetyNavigator.js` created — app starts without `Cannot find module` crash
- [ ] All 7 screen names registered in the stack navigator
- [ ] `SOSActive` screen has `gestureEnabled: false` (no swipe-back during SOS)
- [ ] `SafetyMap` screen has `headerShown: false` (full-screen map)
- [ ] `MyEventsScreen.js` created with loading/data/error states
- [ ] Pull-to-refresh works on `MyEventsScreen`
- [ ] Event type and status badges use correct colour configs
- [ ] Safety screen constants added to `constants/index.js`
- [ ] `PATCH /events/:id/resolve` no longer requires `verifyToken`
- [ ] TODO comment added noting production needs admin auth
- [ ] RPF dashboard "Resolve", "Acknowledge", "False Alarm" buttons work without auth token

**`progress.md` Update Instruction:**
```
### Prompt M4-2 — Completed
- **What was built:** SafetyNavigator (fixes app crash), MyEventsScreen, resolve endpoint auth fix
- **Files created:** SafetyNavigator.js, MyEventsScreen.js
- **Files modified:** safety.js (removed verifyToken from resolve), constants/index.js (added safety screen names)
- **Notes:** SOSActive screen has gestureEnabled: false to prevent accidental swipe-back during active SOS. Resolve endpoint intentionally unauthed for MVP with TODO comment.
- **Completion:** M4: 2 / 6 prompts (33%)
```

---

## Prompt M4-3 — Missing Component Files (ARCHITECTURE.md Section 2)

**Objective:** Build the three remaining component files listed in ARCHITECTURE.md Section 2 that are missing: `AlertTypeCard.js`, `HazardMarker.js`, `ContactCard.js`. Also build `useSafety.js` hook. These are imported or referenced in the existing screens.

**Context:**
The ARCHITECTURE.md Section 2 defines this component structure for the safety module:
```
apps/mobile/src/screens/safety/
├── components/
│   ├── SOSButton.js         ← exists
│   ├── AlertTypeCard.js     ← MISSING
│   ├── HazardMarker.js      ← MISSING
│   └── ContactCard.js       ← MISSING
└── hooks/
    └── useSafety.js         ← MISSING
```

None of the existing screens currently import these — they were meant to be used but the screens were built with inline implementations instead. These components make the codebase cleaner and complete the ARCHITECTURE.md contract.

**Design system:** Same tokens as established — `#E8621A` orange, `#1A3557` navy, `#CC0000` SOS red, `#F5F5F5` surface grey. All `StyleSheet.create()`, no inline styles.

**Scope — files to create:**
```
apps/mobile/src/screens/safety/components/
├── AlertTypeCard.js    ← new
├── HazardMarker.js     ← new
└── ContactCard.js      ← new
apps/mobile/src/screens/safety/hooks/
└── useSafety.js        ← new
```

---

**File 1: `components/AlertTypeCard.js`**

A tappable card for selecting alert/hazard type. Used in `CompartmentAlertScreen` and `HazardReportScreen`.

Props: `{ id, label, isSelected, onSelect, color? }`

```javascript
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants';

/**
 * AlertTypeCard — a selectable radio-style card for incident/hazard type selection.
 * Props:
 *   id         {string}   — unique identifier
 *   label      {string}   — display label
 *   isSelected {boolean}  — whether this card is currently selected
 *   onSelect   {function} — called with id when tapped
 *   color      {string}   — optional accent color (defaults to brandOrange)
 */
export default function AlertTypeCard({ id, label, isSelected, onSelect, color }) {
  const accentColor = color || COLORS.brandOrange;

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && { borderColor: accentColor, backgroundColor: accentColor + '10' }]}
      onPress={() => onSelect(id)}
      activeOpacity={0.75}
    >
      <View style={[styles.radio, { borderColor: accentColor }]}>
        {isSelected && <View style={[styles.radioFill, { backgroundColor: accentColor }]} />}
      </View>
      <Text style={[styles.label, isSelected && { color: accentColor, fontWeight: '700' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.pageWhite,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.dividerGrey,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
});
```

---

**File 2: `components/HazardMarker.js`**

A custom map marker for the safety map. Used in `SafetyMapScreen` as a custom marker view inside `react-native-maps` `<Marker>`.

Props: `{ eventType, size? }`

```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MARKER_CONFIG = {
  SOS: { backgroundColor: '#CC0000', icon: '!', borderColor: '#8B0000' },
  COMPARTMENT_VIOLATION: { backgroundColor: '#E8621A', icon: 'W', borderColor: '#B04000' },
  HAZARD_REPORT: { backgroundColor: '#F5A623', icon: '⚠', borderColor: '#C07800' },
  DEFAULT: { backgroundColor: '#757575', icon: '?', borderColor: '#424242' },
};

/**
 * HazardMarker — custom map pin for SafetyMapScreen.
 * Render inside a react-native-maps <Marker> component.
 * Props:
 *   eventType  {string}   — 'SOS' | 'COMPARTMENT_VIOLATION' | 'HAZARD_REPORT'
 *   size       {number}   — marker diameter in dp (default 28)
 */
export default function HazardMarker({ eventType, size = 28 }) {
  const config = MARKER_CONFIG[eventType] || MARKER_CONFIG.DEFAULT;
  const borderRadius = size / 2;
  const iconSize = size * 0.5;

  return (
    <View
      style={[
        styles.marker,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <Text style={[styles.icon, { fontSize: iconSize, color: '#FFFFFF' }]}>
        {config.icon}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 5,
  },
  icon: {
    fontWeight: 'bold',
    lineHeight: undefined, // let system handle
  },
});
```

---

**File 3: `components/ContactCard.js`**

A contact entry card for `TrustedContactsScreen`. Shows a single emergency contact with edit/delete actions.

Props: `{ contact, index, onUpdate, onRemove }`
`contact` shape: `{ id: string, name: string, phone: string }`

```javascript
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { COLORS } from '../../../constants';

/**
 * ContactCard — a single trusted contact entry in TrustedContactsScreen.
 * Props:
 *   contact   {object}   — { id, name, phone }
 *   index     {number}   — 1-based display index
 *   onUpdate  {function} — (id, field, value) => void
 *   onRemove  {function} — (id) => void
 */
export default function ContactCard({ contact, index, onUpdate, onRemove }) {
  const isPhoneValid = !contact.phone || /^\d{10}$/.test(contact.phone);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.indexLabel}>Contact {index}</Text>
        <TouchableOpacity onPress={() => onRemove(contact.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Trash2 color="#CC0000" size={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Name (Optional)</Text>
        <TextInput
          style={styles.input}
          value={contact.name}
          onChangeText={val => onUpdate(contact.id, 'name', val)}
          placeholder="e.g. Brother, Mother"
          placeholderTextColor={COLORS.placeholderText}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, !isPhoneValid && styles.inputError]}
          value={contact.phone}
          onChangeText={val => onUpdate(contact.id, 'phone', val.replace(/[^0-9]/g, '').substring(0, 10))}
          placeholder="10-digit mobile number"
          placeholderTextColor={COLORS.placeholderText}
          keyboardType="phone-pad"
          maxLength={10}
        />
        {!isPhoneValid && (
          <Text style={styles.validationMsg}>Must be exactly 10 digits</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.pageWhite,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  indexLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  required: { color: '#CC0000' },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.dividerGrey,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputError: { borderColor: '#CC0000' },
  validationMsg: {
    fontSize: 11,
    color: '#CC0000',
    marginTop: 4,
    fontWeight: '500',
  },
});
```

---

**File 4: `hooks/useSafety.js`**

A custom hook that provides safety event state and actions to any safety screen that needs it.

```javascript
import { useState, useCallback } from 'react';
import { getMyEvents } from '../services/safetyService';

/**
 * useSafety — provides safety event list state and fetch logic.
 * Returns: { events, loading, error, refresh }
 */
export function useSafety() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyEvents();
      const data = res?.data?.data || res?.data || [];
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      const isNetErr = err.code === 'ECONNABORTED' || !err.response;
      setError(isNetErr
        ? 'Could not connect. Check your connection.'
        : err.response?.data?.error || 'Failed to load safety events.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, loading, error, refresh };
}
```

**Acceptance Criteria:**
- [ ] `AlertTypeCard` renders with correct selected/unselected styles
- [ ] `AlertTypeCard` border and background use the `color` prop (default orange)
- [ ] `HazardMarker` renders correct colour per event type: red=SOS, orange=COMPARTMENT, amber=HAZARD
- [ ] `ContactCard` shows red border on invalid phone (not exactly 10 digits)
- [ ] `ContactCard` fires `onUpdate` and `onRemove` correctly
- [ ] `useSafety` hook returns `{ events, loading, error, refresh }`
- [ ] All files use `StyleSheet.create()`, no inline styles
- [ ] All files use `COLORS` from constants (no hardcoded hex except event-specific marker colours)

**`progress.md` Update Instruction:**
```
### Prompt M4-3 — Completed
- **What was built:** AlertTypeCard, HazardMarker, ContactCard components + useSafety hook
- **Files created:** AlertTypeCard.js, HazardMarker.js, ContactCard.js, useSafety.js
- **Notes:** HazardMarker is used inside react-native-maps <Marker> — it's a plain View, not an image. AlertTypeCard replaces inline radio row logic in CompartmentAlertScreen and HazardReportScreen.
- **Completion:** M4: 3 / 6 prompts (50%)
```

---

## Prompt M4-4 — Complete Seed Script (`seed-safety.js`)

**Objective:** Complete the `scripts/seed-safety.js` seed script. The file exists in the repo but is incomplete (only the setup/header was fetched). Build the full seeding logic for 100 safety events across all three event types.

**Context:**
- Supabase client: `services/api/src/db/supabase-client.js` (service role, bypasses RLS)
- Load env from `services/api/.env` using `dotenv`
- Run: `NODE_PATH=services/api/node_modules node scripts/seed-safety.js`
- The `station_coordinates` table exists with 50 station records (seeded by Member 3's `seed-stations.js`). Use those lat/lng values.
- The `users` table has demo users seeded by Member 1's `seed.js` (phones: `9999999999`, `9888888888`, `9777777777`).
- Auth context: Supabase Auth — `users.supabase_auth_uid` is the link column. Seed data doesn't need real Supabase Auth UIDs — the seed script uses the service role key which bypasses RLS, so `user_id` just needs to be a valid UUID from the `users` table.

**Scope — files to create/overwrite:**
1. `scripts/seed-safety.js` (overwrite the incomplete existing file)

**Detailed Requirements:**

Distribution (100 total):
- SOS: 30 events → 5 ACTIVE, 10 ACKNOWLEDGED, 15 RESOLVED
- COMPARTMENT_VIOLATION: 20 events → 3 ACTIVE, 7 ACKNOWLEDGED, 10 RESOLVED
- HAZARD_REPORT: 50 events → 10 ACTIVE, 15 ACKNOWLEDGED, 25 RESOLVED

Use these exact 20 stations with their lat/lng (subset of the 50 seeded stations):
```javascript
const STATIONS = [
  { code: 'NDLS', lat: 28.6419, lng: 77.2194 },
  { code: 'MMCT', lat: 18.9688, lng: 72.8195 },
  { code: 'HWH',  lat: 22.5839, lng: 88.3424 },
  { code: 'MAS',  lat: 13.0827, lng: 80.2707 },
  { code: 'SBC',  lat: 12.9767, lng: 77.5713 },
  { code: 'ADI',  lat: 23.0258, lng: 72.6017 },
  { code: 'LKO',  lat: 26.8352, lng: 80.9049 },
  { code: 'JP',   lat: 26.9124, lng: 75.7873 },
  { code: 'BPL',  lat: 23.2646, lng: 77.4139 },
  { code: 'PNBE', lat: 25.6102, lng: 85.1399 },
  { code: 'SC',   lat: 17.4344, lng: 78.5013 },
  { code: 'VSKP', lat: 17.6887, lng: 83.2185 },
  { code: 'CNB',  lat: 26.4498, lng: 80.3319 },
  { code: 'CSTM', lat: 18.9401, lng: 72.8357 },
  { code: 'GHY',  lat: 26.1842, lng: 91.7511 },
  { code: 'BSB',  lat: 25.3176, lng: 82.9739 },
  { code: 'GKP',  lat: 26.7606, lng: 83.3732 },
  { code: 'ASR',  lat: 31.6340, lng: 74.8723 },
  { code: 'NZM',  lat: 28.5877, lng: 77.2518 },
  { code: 'CBE',  lat: 11.0018, lng: 76.9629 },
];
```

Use these train numbers (rotate): `['12951', '12301', '12627', '12002', '12259', '12618', '12649', '12721', '12722', '12691']`

Coaches: `['B1','B2','B3','B4','S1','S2','S3','S4','S5','A1','A2','GEN']`

Dates: Spread over last 90 days using random offsets from today.

For each event, build a complete row:
- `user_id`: fetch demo users and rotate through them (use the 3 demo users)
- `masked_initials`: `deriveMaskedInitials(user.name)` — implement this inline in the seed script (same logic as `safety-service.js`)
- `priority`: CRITICAL for SOS, HIGH for COMPARTMENT, MEDIUM for HAZARD
- `status`: distribute per the counts above
- `resolved_at`: set to `created_at + random hours` if status is RESOLVED or FALSE_ALARM
- `sms_sent`: true for RESOLVED SOS events only
- `sms_contacts_count`: 2 for sms_sent events

SOS-specific fields:
- `alert_subtype` rotates: `['PERSONAL_SAFETY', 'MEDICAL', 'THEFT', 'OTHER']`

Compartment-specific fields:
- `alert_subtype` rotates: `['MALE_OCCUPANT', 'HARASSMENT', 'THREATENING_BEHAVIOUR']`

Hazard-specific fields:
- `alert_subtype` rotates: `['UNMANNED_CROSSING', 'BROKEN_PLATFORM', 'POOR_LIGHTING', 'FLOODING', 'TRACK_DAMAGE', 'OTHER']`
- Slightly fuzz the lat/lng (±0.05 degrees) so hazards appear near but not exactly at station coordinates (they're on the tracks, not the station)

**Script structure:**
```javascript
// 1. Load env from services/api/.env
// 2. Create supabase client (service role)
// 3. Fetch demo users — fail with clear message if none found
// 4. Idempotency check: if safety_events count > 50, log warning and exit unless --force
// 5. If --force: delete all existing safety events with masked_initials set
// 6. Generate event rows (100 total)
// 7. Insert in batches of 25
// 8. Log progress per batch: "Inserted batch 1/4 (SOS)..."
// 9. Final counts per type logged
```

**Acceptance Criteria:**
- [ ] Script runs without error
- [ ] 100 safety events inserted across 20 stations
- [ ] At least 5 ACTIVE SOS events (visible on RPF dashboard as red alerts)
- [ ] At least 3 ACTIVE COMPARTMENT_VIOLATION events
- [ ] HAZARD_REPORT events have slightly fuzzed coordinates (not exactly station lat/lng)
- [ ] All events have `masked_initials` set (e.g. "R.K.")
- [ ] RESOLVED events have `resolved_at` populated
- [ ] `GET /api/safety/public/map` returns 80+ events after seeding
- [ ] Safety map shows markers spread across India (not all at same point)
- [ ] Script is idempotent — running twice without `--force` logs warning and exits

**`progress.md` Update Instruction:**
```
### Prompt M4-4 — Completed
- **What was built:** Full seed-safety.js with 100 events across 3 types, 20 stations
- **Files created/overwritten:** scripts/seed-safety.js
- **Notes:** Run after Member 3's seed-stations.js. Idempotent — use --force to re-seed. At least 5 ACTIVE SOS events for RPF dashboard demo.
- **Completion:** M4: 4 / 6 prompts (67%)
```

---

## Prompt M4-5 — Integration: Wire Safety into AppNavigator + Supabase Auth Compatibility

**Objective:** Final integration pass for Member 4. Ensure `SafetyNavigator` is correctly wired into `AppNavigator`, verify no Firebase references exist in any safety file, verify `SOSButton` works on `HomeScreen`, and fix the Supabase client usage in `SOSActiveScreen` and `HazardReportScreen`.

**Context:**
`SOSActiveScreen.js` and `HazardReportScreen.js` both create their own Supabase client instances using `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`:
```javascript
const supabase = createClient(supabaseUrl, supabaseKey);
```
This is correct — the mobile app uses the Supabase client from `apps/mobile/src/services/supabaseClient.js` (created in Prompt 18 as part of the auth migration). The screens should import from that shared client rather than creating new instances to avoid inconsistent session state.

The `RPFDashboardPage.jsx` resolve action currently constructs the auth token with a comment `// Auth token would be added here in real app`. Since `verifyToken` was removed from the resolve endpoint in Prompt M4-2, this works now — but the `VITE_API_BASE_URL` env var may be missing, causing the fetch to fall back to `localhost:3000`.

**Scope — files to modify:**
1. `apps/mobile/src/screens/safety/SOSActiveScreen.js` — replace inline `createClient` with shared import
2. `apps/mobile/src/screens/safety/HazardReportScreen.js` — same
3. `apps/mobile/src/navigation/AppNavigator.js` — verify `SafetyNavigator` is correctly wired (it should already be — just confirm no placeholder)
4. `apps/dashboard/src/pages/RPFDashboardPage.jsx` — ensure `VITE_API_BASE_URL` fallback is robust

**Detailed Requirements:**

**Fix 1: `SOSActiveScreen.js` — Shared Supabase Client**

Find and replace:
```javascript
// REMOVE these 3 lines:
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// ADD this import instead:
import { supabase } from '../../services/supabaseClient';
```

The path `../../services/supabaseClient` resolves to `apps/mobile/src/services/supabaseClient.js` which was created in Prompt 18 (Supabase Auth migration). This is the shared Supabase client with `AsyncStorage` persistence and token refresh.

---

**Fix 2: `HazardReportScreen.js` — Same Supabase Client Fix**

Find and replace:
```javascript
// REMOVE:
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// ADD:
import { supabase } from '../../services/supabaseClient';
```

---

**Fix 3: Verify `AppNavigator.js` safety tab wiring**

Check that `AppNavigator.js` has this exact line (and NOT the old placeholder):
```javascript
import SafetyNavigator from './SafetyNavigator';
// ...
<Tab.Screen
  name={SCREENS.SAFETY}
  component={SafetyNavigator}
  options={{
    title: 'Safety & SOS',
    headerShown: false,
    tabBarIcon: ({ color, size }) => <ShieldPlus color={color} size={size} />,
  }}
/>
```
If it already has `SafetyNavigator` imported and used (it does — confirmed in the repo), no change needed. Just verify.

---

**Fix 4: `RPFDashboardPage.jsx` — robust API URL fallback**

Find the two occurrences of:
```javascript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
```

These are correct but add a note:
```javascript
// VITE_API_BASE_URL must be set in apps/dashboard/.env
// e.g. VITE_API_BASE_URL=https://railsaathi-z057.onrender.com/api
// Without this, the dashboard only works on localhost
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
```

No code change — just ensure the comment is present on both occurrences so the developer knows to set the env var.

**Also add: demo mode check** — when `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, the Supabase Realtime subscription silently fails. Add a visible warning in the RPF dashboard:
```jsx
// At the top of the RPFDashboardPage return:
{(!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) && (
  <div style={{
    backgroundColor: '#FFF8E1', border: '1px solid #F5A623',
    padding: '10px 20px', fontSize: '13px', color: '#7C5800',
    textAlign: 'center'
  }}>
    ⚠️ Realtime disabled — VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set in .env
  </div>
)}
```

**Acceptance Criteria:**
- [ ] `SOSActiveScreen.js` imports `supabase` from shared client (no inline `createClient`)
- [ ] `HazardReportScreen.js` imports `supabase` from shared client (no inline `createClient`)
- [ ] `AppNavigator.js` uses `SafetyNavigator` as the Safety tab component (not a placeholder)
- [ ] `RPFDashboardPage.jsx` has env var comments on both API_BASE lines
- [ ] Realtime missing-env warning banner present in RPF dashboard
- [ ] No `firebase_uid` references anywhere in any Member 4 file
- [ ] No `firebase-admin` imports in any Member 4 file
- [ ] Audio upload in `SOSActiveScreen` works with the shared Supabase client
- [ ] Photo upload in `HazardReportScreen` works with the shared Supabase client

**`progress.md` Update Instruction:**
```
### Prompt M4-5 — Completed
- **What was built:** Integration pass — shared Supabase client in SOSActiveScreen and HazardReportScreen, RPF dashboard env warning
- **Files modified:** SOSActiveScreen.js, HazardReportScreen.js, RPFDashboardPage.jsx
- **Notes:** Both upload screens now use the shared supabaseClient.js from Prompt 18 (Supabase Auth migration). No Firebase references remain in any M4 file.
- **Completion:** M4: 5 / 6 prompts (83%)
```

---

## Prompt M4-6 — Final Polish, Demo Verification, and Handoff

**Objective:** Final hardening pass for Member 4. Verify all screens have loading/error/data states, verify the SOS < 500ms requirement, verify Realtime works, and produce the complete demo-day handoff in `progress.md`.

**Context:**
All Member 4 code is complete. This is a verification and edge-case prompt only. No new features.

**Scope — files to review/modify (minor fixes only):**
- All files in `apps/mobile/src/screens/safety/`
- `services/api/src/routes/safety.js`
- `apps/dashboard/src/pages/RPFDashboardPage.jsx`
- `progress.md`

**Detailed Requirements:**

**1. All mobile screens — 3-state audit:**

Verify every safety screen has loading, data, and error states:
- [ ] `SafetyHomeScreen`: loading (from `useEffect` event fetch) ✓, data (event list) ✓, error (silently warns — **FIX**: add a visible non-blocking error banner if `getMyEvents()` fails)
- [ ] `SOSActiveScreen`: no loading state needed (it's active by definition) ✓
- [ ] `CompartmentAlertScreen`: loading (submit spinner) ✓, success (checkmark) ✓, error — **FIX**: add error display in the catch block (currently `console.warn` only)
- [ ] `HazardReportScreen`: loading (submit spinner + uploading) ✓, success ✓, error — **FIX**: show error message below submit button
- [ ] `SafetyMapScreen`: loading overlay ✓, data (markers) ✓, error — **VERIFY**: map renders empty on error (not crash)
- [ ] `TrustedContactsScreen`: loading (save spinner) ✓, success (Alert) ✓, error (Alert) ✓
- [ ] `MyEventsScreen`: loading ✓, data ✓, error ✓ (built in Prompt M4-2)

For each "FIX" item above, make the minimal code change:

**`CompartmentAlertScreen.js` error fix:**
```javascript
// Add state:
const [submitError, setSubmitError] = useState('');

// In catch block:
} catch (e) {
  console.warn('Failed to post compartment alert:', e);
  setSubmitError('Failed to send alert. Please try again.');
} finally {
  setLoading(false);
}

// In render, below the card, above the submit button:
{submitError ? (
  <Text style={styles.errorText}>{submitError}</Text>
) : null}

// Add to StyleSheet:
errorText: { color: '#CC0000', fontSize: 13, marginBottom: 16, fontWeight: '500', textAlign: 'center' }
```

**`HazardReportScreen.js` error fix:**
```javascript
// Add state:
const [submitError, setSubmitError] = useState('');

// In catch block:
} catch (e) {
  console.warn('Submit failed', e);
  setSubmitError('Failed to submit report. Please try again.');
} finally {
  setSubmitting(false);
  setUploading(false);
}

// Below submit button:
{submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

// Add to StyleSheet:
errorText: { color: '#CC0000', fontSize: 13, marginTop: 12, fontWeight: '500', textAlign: 'center' }
```

**`SafetyHomeScreen.js` event fetch error fix:**
```javascript
// Replace current useEffect:
const [fetchError, setFetchError] = useState('');

useEffect(() => {
  getMyEvents()
    .then(res => {
      if (res?.data?.data) setRecentEvents(res.data.data.slice(0, 3));
    })
    .catch(e => {
      console.warn('Failed to fetch events:', e);
      setFetchError('Could not load recent events.');
    });
}, [route.params]);

// In render, inside eventsSection, replace emptyEventsText condition:
{fetchError ? (
  <Text style={styles.emptyEventsText}>{fetchError}</Text>
) : recentEvents.length > 0 ? (
  // existing event rows...
) : (
  <Text style={styles.emptyEventsText}>No recent incidents.</Text>
)}
```

---

**2. SOS < 500ms verification checklist:**

Mentally walk through `POST /api/safety/sos` to confirm the 500ms requirement:
- `verifyToken` middleware: 1 DB call (select users by supabase_auth_uid) — ~20-50ms
- Route handler: 1 DB call (select user by user_id) — ~20-50ms
- 1 DB INSERT into safety_events — ~30-80ms
- `res.status(201).json(...)` — immediate
- `setImmediate(() => { await sendSOS(...) })` — fires AFTER response ✓

Total: ~70-180ms. Well under 500ms. ✓

If on Render free tier (cold start): first request may take 8+ seconds (Render waking up). The keep-alive ping in `index.js` prevents this. **Add a note in `progress.md` handoff**: run 2 warm-up requests before the demo.

---

**3. Realtime verification steps (add as comments to `RPFDashboardPage.jsx`):**

```javascript
/**
 * REALTIME SETUP VERIFICATION (do this before demo day):
 * 1. Supabase Dashboard → Database → Replication → safety_events → Toggle ON
 * 2. Run in SQL Editor: ALTER TABLE safety_events REPLICA IDENTITY FULL;
 * 3. Open RPF dashboard in browser
 * 4. In terminal: curl -X POST https://your-api.onrender.com/api/safety/sos \
 *      -H "Authorization: Bearer <valid_jwt>" \
 *      -H "Content-Type: application/json" \
 *      -d '{"lat":28.64,"lng":77.22,"alert_subtype":"PERSONAL_SAFETY","train_number":"12951","coach":"B4","berth":"32"}'
 * 5. Dashboard MUST update within 3 seconds WITHOUT a page refresh.
 *    If it doesn't: check Realtime toggle AND REPLICA IDENTITY FULL.
 */
```

---

**4. Demo script verification — walk through mentally:**

```
[0s]  Safety tab opens → SafetyHomeScreen → SOSButton pulsing red
[5s]  Press SOS → Alert.alert confirmation dialog
[9s]  Tap "Send Alert" → handleSendAlert fires:
      - Location.getCurrentPositionAsync (< 1s with Balanced accuracy)
      - postSOS(payload) called — does NOT await
      - navigation.navigate('SOSActive', { eventPromise })
[10s] SOSActiveScreen renders — countdown starts from 60
      eventPromise resolves in background → event.id set
[13s] RPF DASHBOARD: new card appears with beep
      Shows: Train 12951, Coach B4, Berth 32, masked_initials "A.S.", CRITICAL
[20s] Phone 2: SMS arrives (if Twilio verified number)
[35s] SOSActiveScreen: countdown at 25s remaining
      Audio still recording
[60s] Countdown hits 0 → finishRecording() called:
      - recording.stopAndUnloadAsync()
      - fetch(uri) → blob
      - supabase.storage.from('sos-audio').upload(...)
      - updateSOSAudio(event.id, publicUrl)
      - navigation.navigate('SafetyHomeScreen') after 2s
```

---

**5. Final `progress.md` handoff update:**

```markdown
## Status: COMPLETE ✅
### Prompts Completed: 6 / 6

## Member 4 Integration Handoff

### What Member 1 Needs From Me:
1. Line for `services/api/src/index.js` (already auto-loaded via safeRequire):
   `app.use('/api/safety', require('./routes/safety'))`
2. HomeScreen import for SOSButton:
   `import SOSButton from '../safety/components/SOSButton'`
3. Dashboard route (already in App.jsx):
   `<Route path="/rpf" element={<RPFDashboardPage />} />`

### Manual Steps Required Before Demo:
1. Run `006_safety_rls_fix.sql` in Supabase SQL Editor
2. Create `sos-audio` bucket (Private) in Supabase Storage
3. Create `hazard-photos` bucket (Public) in Supabase Storage
4. Enable safety_events Realtime: Dashboard → Database → Replication → safety_events → ON
5. Add Twilio env vars to Render: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
6. Verify 3 phone numbers in Twilio console (demo phone numbers)
7. Run seed: `NODE_PATH=services/api/node_modules node scripts/seed-safety.js`
8. Verify Realtime: curl SOS → RPF dashboard updates < 3 seconds
9. Run 2 warm-up requests to Render before demo (prevent cold start)

### All Member 4 Files:
- `supabase/migrations/004_safety.sql` ✅
- `supabase/migrations/006_safety_rls_fix.sql` ✅
- `services/api/src/routes/safety.js` ✅ (8 endpoints)
- `services/api/src/services/safety-service.js` ✅
- `services/api/src/services/twilioService.js` ✅
- `apps/mobile/src/navigation/SafetyNavigator.js` ✅
- `apps/mobile/src/screens/safety/SafetyHomeScreen.js` ✅
- `apps/mobile/src/screens/safety/SOSActiveScreen.js` ✅
- `apps/mobile/src/screens/safety/CompartmentAlertScreen.js` ✅
- `apps/mobile/src/screens/safety/HazardReportScreen.js` ✅
- `apps/mobile/src/screens/safety/SafetyMapScreen.js` ✅
- `apps/mobile/src/screens/safety/TrustedContactsScreen.js` ✅
- `apps/mobile/src/screens/safety/MyEventsScreen.js` ✅
- `apps/mobile/src/screens/safety/services/safetyService.js` ✅
- `apps/mobile/src/screens/safety/components/SOSButton.js` ✅
- `apps/mobile/src/screens/safety/components/AlertTypeCard.js` ✅
- `apps/mobile/src/screens/safety/components/HazardMarker.js` ✅
- `apps/mobile/src/screens/safety/components/ContactCard.js` ✅
- `apps/mobile/src/screens/safety/hooks/useSafety.js` ✅
- `apps/dashboard/src/pages/RPFDashboardPage.jsx` ✅
- `scripts/seed-safety.js` ✅
```

**Acceptance Criteria — Final Demo Checklist:**
- [ ] App starts without crash — SafetyNavigator found, all screens importable
- [ ] Safety tab → SafetyHomeScreen loads with pulsing red SOSButton
- [ ] Press SOS → confirmation dialog → SOSActive screen → RPF dashboard alert appears < 3 seconds
- [ ] RPF dashboard alert shows: masked initials, train number, coach, berth, CRITICAL priority
- [ ] Beep sound plays when new alert arrives on RPF dashboard
- [ ] Acknowledge / Resolve / False Alarm buttons update status immediately (optimistic)
- [ ] SMS log appears in server console: `[SMS] Sent to +91XXXXXXXXXX for event 12951`
- [ ] Compartment alert end-to-end in < 10 seconds
- [ ] Hazard report: GPS fills → submit → marker appears on safety map
- [ ] Safety map loads without login — seeded markers visible across India
- [ ] Map filter chips (All/SOS/Compartment/Hazard) work correctly
- [ ] TrustedContacts screen saves to DB → refreshUser() updates context
- [ ] MyEvents screen shows event history with correct type/status badges
- [ ] `GET /api/safety/public/map` without auth header → 200, no user_id in response
- [ ] All 6 prompts marked complete in `progress.md`

**`progress.md` Update Instruction:**
```
### Prompt M4-6 — Completed ✅
- **What was built:** Final error state fixes, Realtime verification comments, demo script, full handoff
- **Files modified:** CompartmentAlertScreen.js (error display), HazardReportScreen.js (error display), SafetyHomeScreen.js (event fetch error), RPFDashboardPage.jsx (Realtime verification comment)
- **Notes:** Render cold start: run 2 warm-up curl requests before demo. SMS: only works with Twilio-verified numbers on free trial.
- **Completion:** M4: 6 / 6 prompts (100%) ✅
```

---

That's the complete sequence — **6 self-contained prompts** covering everything missing from Member 4's already largely-built codebase: the Supabase Auth RLS fix, the app-crashing missing `SafetyNavigator`, the `MyEventsScreen`, the resolve endpoint auth fix for the RPF dashboard, the 3 missing component files, the `useSafety` hook, the complete seed script, the shared Supabase client integration, and a final hardening pass with error states and demo verification. Everything already built in the repo is preserved untouched. Ready for Member 5 whenever you are.

