# Member 2 (Tatkal Module) — Integration Handoff Guide

This guide details the integration steps required to cleanly register the Tatkal Verified Booking Ecosystem routes, background jobs, and React Native screens into the core RailSaathi monorepo.

---

## 🔌 1. Backend Integration (`services/api/src/index.js`)

To register the Tatkal sub-routers and start the background fire daemon, Member 1 should ensure the following configurations are added:

### Route Registration Middleware
Mount the base Tatkal router under the `/api/tatkal` path:
```javascript
// Register Tatkal assistant route handlers (mounts sub-routers dynamically)
app.use('/api/tatkal', require('./routes/tatkal'));
```

### Background Daemon Initialization
Start the scheduled fire daemon to poll and process pending bookings automatically at the IRCTC opening time:
```javascript
// Start the scheduled job for firing booking requests at their target time windows
require('./jobs/tatkalFireJob').start();
```

*Note: The current `services/api/src/index.js` has safe conditional imports (`safeRequire`) which automatically mount these if the files exist. Manual registration of the above lines can be done to convert it to a hard import.*

---

## 📱 2. Mobile Navigation Integration (`apps/mobile/src/navigation/AppNavigator.js`)

To wire the Tatkal wizard form, countdown, and surrender market screens, import the components and register the stack navigator in the React Native mobile client:

### Step A: Import Screens
```javascript
import TatkalHomeScreen from '../screens/tatkal/TatkalHomeScreen';
import PreFillFormScreen from '../screens/tatkal/PreFillFormScreen';
import CountdownScreen from '../screens/tatkal/CountdownScreen';
import ConfirmationScreen from '../screens/tatkal/ConfirmationScreen';
import SurrenderMarketScreen from '../screens/tatkal/SurrenderMarketScreen';
```

### Step B: Declare Stack Navigator
```javascript
const TatkalStack = createStackNavigator();

function TatkalStackNavigator() {
  return (
    <TatkalStack.Navigator screenOptions={{ headerShown: false }}>
      <TatkalStack.Screen name="TatkalHomeScreen" component={TatkalHomeScreen} />
      <TatkalStack.Screen name="PreFillFormScreen" component={PreFillFormScreen} />
      <TatkalStack.Screen name="CountdownScreen" component={CountdownScreen} />
      <TatkalStack.Screen name="ConfirmationScreen" component={ConfirmationScreen} />
      <TatkalStack.Screen name="SurrenderMarketScreen" component={SurrenderMarketScreen} />
    </TatkalStack.Navigator>
  );
}
```

### Step C: Mount Tab Screen in MainTabNavigator
```javascript
<Tab.Screen
  name="Tatkal"
  component={TatkalStackNavigator}
  options={{
    title: 'Tatkal Assist',
    tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
  }}
/>
```

---

## 💾 3. Database Migrations

Ensure the following migrations in `supabase/migrations/` are applied to the development database in order:
1. `002_tatkal.sql` - Sets up the `tatkal_requests` and `tatkal_surrenders` tables, indexes, and RLS policies.
2. `0022_overlap_lock.sql` - Configures the `tatkal_journey_locks` table to prevent booking overlaps.
3. `0023_tatkal_views_and_profiles.sql` - Configures views for active locks.

---

## ⚙️ 4. Environment Variables

The backend `.env` file (`services/api/.env`) must contain the standard Supabase credentials:
```env
SUPABASE_URL="https://sjjzzahcqmxksruzfpfo.supabase.co"
SUPABASE_SERVICE_KEY="your_supabase_service_role_key"
SUPABASE_JWT_SECRET="your_supabase_jwt_secret"
```
