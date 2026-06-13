# DESIGN.md — Unified Design System
# RailSaathi Platform — Common for ALL 5 Members
# FAR AWAY 2026 Hackathon
#
# This file is the single source of truth for every visual decision.
# Every member must follow every rule here without exception.
# If your screen looks different from another member's screen,
# this file is where you resolve it.

---

## 1. Brand Identity

### Logo
The RailSaathi logo has two parts that must always appear together:
- Icon: a train inside a rounded-square orange container (like an app icon)
- Wordmark: "Rail" in dark navy, "Saathi" in brand orange
- Always use the horizontal lockup (icon left, text right)
- Minimum size: 32px height on mobile, 40px on web
- Never stretch, recolour, or separate the icon from the wordmark
- Never use the wordmark alone without the icon

### Brand Voice in UI
- App name in all UI: "RailSaathi" — one word, camelCase, never "Rail Saathi"
- Page titles use sentence case: "File a Grievance", not "FILE A GRIEVANCE"
- Exception: the SOS screen uses ALL CAPS for urgency: "SOS — EMERGENCY ASSISTANCE"
- Navigation labels are title case: "Tatkal Assist", "Station Amenities"

---

## 2. Colour Palette

This is the definitive colour palette derived from the screenshots.
Use these exact hex values everywhere. No variations, no approximations.

### Primary Colours

| Name             | Hex       | Usage                                              |
|------------------|-----------|----------------------------------------------------|
| Brand Orange     | #E8621A   | Primary CTA buttons, active nav underline,         |
|                  |           | countdown timer digits, progress bars,             |
|                  |           | success percentage text, brand accents             |
| Brand Navy       | #1A3557   | "Rail" in logo wordmark, page headings (H1),       |
|                  |           | step number circles (filled), primary body text    |
|                  |           | on light backgrounds                               |

### Background Colours

| Name             | Hex       | Usage                                              |
|------------------|-----------|----------------------------------------------------|
| Page White       | #FFFFFF   | Main page/screen background                        |
| Surface Grey     | #F5F5F5   | Card backgrounds, section backgrounds,             |
|                  |           | input field backgrounds on web,                    |
|                  |           | overall app background (light grey tint)           |
| Divider Grey     | #E0E0E0   | Horizontal dividers, card borders,                 |
|                  |           | input field borders (unfocused)                    |

### Text Colours

| Name             | Hex       | Usage                                              |
|------------------|-----------|----------------------------------------------------|
| Primary Text     | #111111   | H1, H2, bold labels, passenger names,              |
|                  |           | train numbers — anything that must be read fast    |
| Secondary Text   | #555555   | Subtitles, descriptive body text, timestamps,      |
|                  |           | sub-labels under headings                          |
| Placeholder Text | #AAAAAA   | Input field placeholder text                       |
| Link / Action    | #E8621A   | Inline text links (e.g. "View Recent Grievances",  |
|                  |           | "Track Now"), active tab text                      |

### Status / Semantic Colours

| Name             | Hex       | Usage                                              |
|------------------|-----------|----------------------------------------------------|
| SOS Red          | #CC0000   | SOS button, SOS screen background (dark red),      |
|                  |           | SOS pulsing circle, critical alerts                |
| SOS Red Light    | #FF3333   | Inner glow / lighter ring on SOS button            |
| Warning Orange   | #E8621A   | Alert cards (platform change, delay), hazard icons |
|                  |           | (this is the same as Brand Orange — orange IS       |
|                  |           | the warning colour in this system)                 |
| Status Pending   | #E8621A   | "Pending" status badge text and progress bar       |
| Status Progress  | #F5A623   | "In-Progress" status badge — slightly lighter amber|
| Status Resolved  | #27AE60   | "Resolved" status badge, confirmed booking tick    |
| Status Rejected  | #CC0000   | "Rejected" or "Failed" status badge                |
| Chart Green      | #27AE60   | Secondary data line in demand/analytics charts     |
|                  |           | (paired with Brand Orange as the primary line)     |

### Input Focus Colour
- Focused input border: #E8621A (Brand Orange)
- Focused input border width: 2px
- Unfocused input border: #E0E0E0, 1px

---

## 3. Typography

### Font Family
- Primary font: System default sans-serif
  - iOS: San Francisco (SF Pro)
  - Android: Roboto
  - Web: Inter (import from Google Fonts) with fallback:
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- Monospace font (for countdown timer digits only):
  font-family: 'Courier New', Courier, monospace — or a tabular-nums
  font feature: font-variant-numeric: tabular-nums

### Type Scale — Mobile (React Native)

| Role                  | fontSize | fontWeight | color          | Usage                        |
|-----------------------|----------|------------|----------------|------------------------------|
| Screen Title          | 24       | 700 (Bold) | #111111        | "File a Grievance", "Tatkal Assist" |
| Section Heading       | 18       | 700 (Bold) | #111111        | "Journey Details", "Active Journeys & Alerts" |
| Card Title            | 16       | 700 (Bold) | #111111        | "Delhi to Mumbai", passenger names |
| Body Text             | 14       | 400        | #555555        | Descriptions, subtitles      |
| Label / Caption       | 12       | 400        | #555555        | Timestamps, "Track Now" link |
| Input Text            | 16       | 400        | #111111        | Text inside input fields     |
| Placeholder           | 16       | 400        | #AAAAAA        | "Enter PNR", "Enter Train Number" |
| Button Label          | 16       | 700 (Bold) | #FFFFFF        | All primary CTA buttons      |
| Countdown Digits      | 56       | 700 (Bold) | #E8621A        | "02:45:30" large timer       |
| Countdown Label       | 14       | 400        | #555555        | "HH:MM:SS" sub-label         |
| Step Number           | 14       | 700 (Bold) | #FFFFFF        | Numbers inside step circles  |
| Nav Tab Label         | 11       | 400/600    | #555/#E8621A   | Bottom tab labels            |
| Alert Title           | 14       | 700 (Bold) | #FFFFFF        | Text on orange alert cards   |
| Success %             | 14       | 700 (Bold) | #E8621A        | "85% Success" in analytics   |

### Type Scale — Web (React Dashboard)

| Role                  | fontSize  | fontWeight | color          | Usage                        |
|-----------------------|-----------|------------|----------------|------------------------------|
| Page Title (H1)       | 28px      | 700        | #111111        | "File Grievance Portal"      |
| Section Heading (H2)  | 20px      | 700        | #111111        | "Tatkal Success Rate Analytics" |
| Card Heading          | 16px      | 600        | #111111        | Card titles                  |
| Body                  | 14px      | 400        | #555555        | General body text            |
| Caption               | 12px      | 400        | #555555        | Timestamps, sub-labels       |
| Countdown Digits      | 72px      | 700        | #E8621A        | Large web countdown          |
| Nav Link              | 14px      | 400/600    | #111/#E8621A   | Top nav items                |
| Button Label          | 14px      | 600        | #FFFFFF        | Web CTA buttons              |
| Status Badge          | 12px      | 600        | (see status)   | "Pending", "Resolved" etc    |
| Chart Tooltip         | 13px      | 400/600    | #111111        | Data tooltips on charts      |

---

## 4. Component Specifications

### 4.1 Primary CTA Button (the orange button)

Mobile (React Native):
```javascript
{
  backgroundColor: '#E8621A',
  borderRadius: 12,
  paddingVertical: 16,
  paddingHorizontal: 24,
  width: '100%',          // full-width on mobile
  alignItems: 'center',
  // Label: fontSize 16, fontWeight '700', color '#FFFFFF'
}
```

Web (React):
```css
background-color: #E8621A;
border-radius: 8px;
padding: 10px 20px;
color: #FFFFFF;
font-size: 14px;
font-weight: 600;
border: none;
cursor: pointer;
```

Pressed / hover state: darken to #C9551A (10% darker)
Disabled state: #CCCCCC background, #888888 text

### 4.2 Secondary / Outline Button

Mobile:
```javascript
{
  backgroundColor: '#FFFFFF',
  borderWidth: 1.5,
  borderColor: '#E8621A',
  borderRadius: 12,
  paddingVertical: 14,
  paddingHorizontal: 24,
  alignItems: 'center',
  // Label: fontSize 14, fontWeight '600', color '#E8621A'
}
```

Web:
```css
background-color: #FFFFFF;
border: 1.5px solid #E8621A;
border-radius: 8px;
padding: 8px 16px;
color: #E8621A;
font-size: 14px;
font-weight: 600;
```

Used for: "Browse Files", "Download Extension", "Add New Profile",
"View Recent Grievances" (text link variant — no border, just orange text)

### 4.3 Input Fields

Mobile (React Native):
```javascript
{
  borderWidth: 1,
  borderColor: '#E0E0E0',
  borderRadius: 10,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  color: '#111111',
  backgroundColor: '#FFFFFF',
  // Focused: borderColor '#E8621A', borderWidth 2
}
```

Web:
```css
border: 1px solid #E0E0E0;
border-radius: 8px;
padding: 10px 14px;
font-size: 14px;
color: #111111;
background: #FFFFFF;
width: 100%;
/* Focused: border-color #E8621A; border-width 2px; outline: none */
```

The floating label variant (seen in grievance form on mobile — "Grievance
Category" floats above the field):
- Label floats to top-left at 12px when field is focused or has value
- Unfocused: label is inside field at 16px placeholder size
- Label colour when floating: #E8621A

### 4.4 Dropdown / Select

Same border and radius as input fields.
Chevron icon (▼) on right side, colour #555555.
Dropdown options list: white background, 1px #E0E0E0 border, 8px radius.
Selected option highlighted with #FFF3EC background (very light orange tint).

### 4.5 Cards

Standard card (white, elevated):
```javascript
// Mobile
{
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  padding: 16,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,            // Android
}
```

```css
/* Web */
background: #FFFFFF;
border-radius: 12px;
padding: 20px 24px;
box-shadow: 0 2px 12px rgba(0,0,0,0.08);
border: 1px solid #F0F0F0;
```

Alert card (orange background — platform change, delays):
```javascript
{
  backgroundColor: '#E8621A',
  borderRadius: 14,
  padding: 16,
  // All text: color '#FFFFFF'
  // Title: fontWeight '700', fontSize 14
  // Body: fontWeight '400', fontSize 12
}
```

### 4.6 Step Indicators (multi-step forms)

Seen in both "File a Grievance" app and web screens.
Numbered circles (1, 2, 3, 4) connected by a vertical or horizontal line.

Mobile (vertical layout):
```javascript
// Circle
{
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: '#1A3557',   // completed or active step: navy
  // inactive future step: '#E0E0E0' grey
  justifyContent: 'center',
  alignItems: 'center',
}
// Number inside: fontSize 14, fontWeight '700', color '#FFFFFF'
// Connecting line: width 2, backgroundColor '#E0E0E0', marginLeft: 13 (centred under circle)
```

Web (horizontal progress bar):
```css
/* Progress track */
height: 4px;
background: #E0E0E0;
border-radius: 2px;

/* Active portion */
background: #1A3557;  /* navy for completed */
/* or gradient from #1A3557 to #E8621A for in-progress step */
```

Step heading text: fontSize 18 (mobile), 16px (web), fontWeight 700, #111111

### 4.7 Feature Tiles / Quick Action Cards

The 5 feature tiles on the home screen (Tatkal Assist, File Grievance,
Safety & SOS, Station Amenities, Demand Forecast):

Mobile:
```javascript
{
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 16,
  width: 80,              // fixed width, horizontal scroll
  alignItems: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
  // Icon: 32x32, orange (#E8621A) line-art style
  // Label: fontSize 11, fontWeight '600', color '#111111', marginTop 8, textAlign 'center'
}
```

Web:
```css
background: #FFFFFF;
border-radius: 16px;
padding: 24px 16px;
text-align: center;
box-shadow: 0 2px 8px rgba(0,0,0,0.07);
cursor: pointer;
/* Icon: 48px, orange line-art */
/* Label: 13px, font-weight 500, #111111, margin-top 12px */
```

Hover state (web): transform: translateY(-2px); box-shadow increases.

### 4.8 Icons

All icons in the app are line-art style (not filled solid) with
stroke colour #E8621A (Brand Orange) on light backgrounds.
Exception: icons inside the SOS/Safety screen use filled style
with #E8621A fill on white card backgrounds.

Icon sizes:
- Feature tile icons: 32px (mobile), 48px (web)
- Navigation tab icons: 24px (mobile)
- Inline icons (next to text): 16–20px
- SOS alarm icon (large): 64px white on red background

Use Lucide icons (already available in the React Native / React project)
as the primary icon set. They match the line-art style in the screenshots.

Specific icon mappings observed in screenshots:
- Tatkal Assist: clock with train (use: Clock + Train2)
- File Grievance: document with pen (use: FileEdit)
- Safety & SOS: shield with plus (use: ShieldPlus)
- Station Amenities: bench / station (use: Building2)
- Demand Forecast: bar chart trending up (use: TrendingUp)
- Report Hazard: warning triangle (use: AlertTriangle)
- Medical Emergency: plus cross / ambulance (use: Cross or Ambulance)
- Women Helpline: person silhouette (use: User)
- RPF Contact: shield with star (use: ShieldCheck)

### 4.9 Progress Bars (Tatkal Success Rate)

Orange fill on grey track:
```javascript
// Mobile
{
  // Track
  height: 8,
  borderRadius: 4,
  backgroundColor: '#E0E0E0',
  // Fill
  backgroundColor: '#E8621A',
  borderRadius: 4,
}
```

```css
/* Web */
height: 8px;
border-radius: 4px;
background: #E0E0E0;
/* Fill div */
background: #E8621A;
border-radius: 4px;
transition: width 0.6s ease;
```

### 4.10 Status Badges

Small pill-shaped badges used on grievance cards:

```javascript
// Mobile
{
  borderRadius: 12,
  paddingVertical: 3,
  paddingHorizontal: 10,
  // Pending: backgroundColor '#FFF3EC', color '#E8621A'
  // In-Progress: backgroundColor '#FFF8E1', color '#F5A623'
  // Resolved: backgroundColor '#E8F5E9', color '#27AE60'
  // Rejected: backgroundColor '#FFEBEE', color '#CC0000'
  fontSize: 11,
  fontWeight: '600',
}
```

### 4.11 Navigation — Mobile Bottom Tab

5 tabs: Home, Tatkal, Complaints, Safety, Station.
Active tab: icon and label in #E8621A.
Inactive tab: icon and label in #AAAAAA.
Tab bar background: #FFFFFF with 1px top border #E0E0E0.
No explicit tab indicator line — colour change alone shows active state.
Tab bar height: 60px (safe area excluded).

### 4.12 Navigation Header — Mobile

```javascript
{
  backgroundColor: '#FFFFFF',
  // Title: fontSize 17, fontWeight '600', color '#111111', centred
  // Back arrow: colour '#111111', left side
  // Right action (if any): colour '#E8621A'
  borderBottomWidth: 1,
  borderBottomColor: '#E0E0E0',
  height: 56,
}
```

### 4.13 Web Navbar

Top navbar layout (left to right):
Logo | Nav links (Active Journey, Tatkal Assist, Live Heatmaps, Station Guide, Safety & SOS) | [EN(IN)|INR] [Help] [Sign up] [Log in button]

```css
/* Navbar container */
background: #FFFFFF;
border-bottom: 1px solid #E0E0E0;
padding: 0 24px;
height: 56px;
display: flex;
align-items: center;
justify-content: space-between;

/* Nav links */
font-size: 14px;
color: #111111;
font-weight: 400;
padding: 0 12px;

/* Active nav link */
color: #E8621A;
font-weight: 600;
border-bottom: 2px solid #E8621A;

/* Log in button */
background: #E8621A;
color: #FFFFFF;
border-radius: 6px;
padding: 8px 18px;
font-weight: 600;
```

---

## 5. Screen-Specific Patterns

### 5.1 Home Screen

Hero section (app: banner image, web: full-width hero):
- Background image: moving train / railway track (realistic photo)
- Overlay: dark gradient from bottom (rgba(0,0,0,0.5) at bottom, transparent at top)
- Headline: "Your Unified Railway Companion"
  fontSize 28 (mobile) / 36px (web), fontWeight 700, color #FFFFFF
- PNR search bar sits on top of or just below the hero:
  White background, orange "Track" button on right end, full-width

Section headings within the scrollable body (e.g. "Active Journeys & Alerts",
"Major Stations Guide"): fontSize 18 (mobile) / 20px (web), fontWeight 700,
color #111111, no background, padding 16px horizontal.

Journey cards (horizontal scrollable):
- White card with train image on right half
- Train name bold, route below, delay text in #E8621A
- "Track Now" underlined link in #E8621A

Station guide cards: photo fills entire card, gradient overlay from bottom,
station name in white bold text, "Discover amenities" in white regular text.

### 5.2 Tatkal Assist Screen

Countdown timer section:
- Background: #F5F5F5 (surface grey), no image
- Label "NEXT TATKAL WINDOW OPENS IN:" in #555555, 14px, uppercase, centred
- Timer digits: #E8621A, very large (56px mobile / 72px web), monospace, centred
- Sub-label "HH:MM:SS": #555555, 14px, centred
- Info line "10:00 AM for AC | 11:00 AM for Sleeper": #555555, 13px, centred
- Section sits in its own block with light grey background
  before transitioning to white card content below

Passenger details card:
- White card, standard elevation
- "Pre-fill Passenger Details" heading + "Add New Profile" orange button on same row
- Each passenger row: bold name + age/gender in regular text + edit icon (pencil) on right
- Rows separated by 1px #E0E0E0 dividers

### 5.3 Grievance / Complaint Screen

Multi-step form pattern:
- Steps shown as numbered circles with connecting line
- Completed steps: #1A3557 (navy) filled circle
- Active step: #1A3557 filled circle
- Incomplete steps: #E0E0E0 grey circle

Web: horizontal stepper at the top of the form card.
Mobile: vertical stepper on the left side of the form.

File upload zone:
- Dashed border: 2px dashed #CCCCCC
- Background: #FAFAFA
- Centre: cloud-with-upload icon (#AAAAAA) + "Upload Photo/Video" text + "Browse Files" outline button
- Hover/active: border changes to #E8621A

Recent grievances panel (web sidebar):
- White card on the right side of the layout
- Each grievance: reference number + status badge inline
- Progress bar below each: colour matches status colour
- Submitted date and short description in #555555

### 5.4 Safety & SOS Screen

SOS button area:
- Full-width red background section (#CC0000) at top of screen
- SOS button: circular, concentric ring pulse animation
  Outer ring: rgba(255,255,255,0.2)
  Middle ring: rgba(255,255,255,0.35)
  Inner button: #FF3333 with white alarm icon (64px)
  Pulsing: rings expand outward continuously using Animated loop
- "SOS — EMERGENCY ASSISTANCE" text: white, bold, uppercase, centred
  below the button inside the red area

Quick action tiles (2×2 grid):
- White cards with orange (#E8621A) border (1.5px)
- Orange icon (line-art or filled) on left
- Bold label on right
- Tap: border thickens to 3px, slight orange background tint #FFF3EC

Map section at bottom:
- Standard map view (react-native-maps / Leaflet)
- Blue navigation pin for user location
- Red pin with train icon for nearest station
- White card below map: station name, distance, amenities list

### 5.5 Demand Forecast / Analytics Screen (Web)

Filter bar: 4 dropdown fields side by side + "Analyze" button (dark navy #1A3557, not orange)

Charts:
- Line chart: two lines — orange (#E8621A) and green (#27AE60)
  Orange = primary metric (Train Rost / confirmed demand)
  Green = secondary metric (Train Post / available supply)
  Grid lines: #F0F0F0 (very light)
  Axis text: 12px, #555555
  Tooltip: white card with 1px border, bold label + orange/green value

- Bar chart (day of week): stacked bars, orange + green, same colours
  Axis: same as above

Recommendation card (right side):
- White card, standard shadow
- Icon: orange analytics icon (TrendingUp or similar)
- "Recommendation:" bold prefix, rest of text regular weight
- Checklist items: orange checkmark tick + #555555 text

---

## 6. Spacing System

Use a base unit of 8px. All spacing values are multiples of 4 or 8.

| Token  | Value | Common Usage                                    |
|--------|-------|-------------------------------------------------|
| xs     | 4px   | Icon-to-text gap, badge padding                 |
| sm     | 8px   | Between related items (label + field)           |
| md     | 16px  | Standard card padding, section inner spacing    |
| lg     | 24px  | Between cards, section vertical spacing         |
| xl     | 32px  | Between major sections                          |
| xxl    | 48px  | Top/bottom screen padding on web pages          |

Screen horizontal padding (mobile): 16px on each side.
Screen horizontal padding (web content area): max-width 1280px, auto margins.
Card padding (mobile): 16px all sides.
Card padding (web): 20px top/bottom, 24px left/right.

---

## 7. Border Radius System

| Element                  | Border Radius  |
|--------------------------|----------------|
| Primary CTA button       | 12px (mobile), 8px (web) |
| Cards                    | 14px (mobile), 12px (web) |
| Input fields             | 10px (mobile), 8px (web) |
| Feature tiles            | 16px |
| Status badges / pills    | 12px (fully rounded) |
| Station photo cards      | 12px |
| Dropdown options list    | 8px |
| Quick action tiles (safety) | 12px |
| Step number circles      | 50% (fully round) |
| Progress bar track/fill  | 4px |

---

## 8. Elevation / Shadow

Three levels used in the screenshots:

Level 1 — Subtle (feature tiles, nav bar):
```javascript
// React Native
shadowColor: '#000', shadowOffset: {width:0,height:1},
shadowOpacity: 0.06, shadowRadius: 4, elevation: 2
```
```css
/* Web */ box-shadow: 0 1px 6px rgba(0,0,0,0.07);
```

Level 2 — Standard (most cards):
```javascript
shadowColor: '#000', shadowOffset: {width:0,height:2},
shadowOpacity: 0.08, shadowRadius: 8, elevation: 3
```
```css
box-shadow: 0 2px 12px rgba(0,0,0,0.08);
```

Level 3 — Prominent (modals, dropdowns, tooltips):
```javascript
shadowColor: '#000', shadowOffset: {width:0,height:4},
shadowOpacity: 0.12, shadowRadius: 16, elevation: 6
```
```css
box-shadow: 0 4px 20px rgba(0,0,0,0.12);
```

---

## 9. Animation & Motion

### Countdown Timer
- Digits update every second with no animation — instant swap.
- Digits must use monospace / tabular numerals so layout does not
  shift when numbers change width (e.g. 10 vs 09).
- Use font-variant-numeric: tabular-nums in CSS /
  fontVariant: ['tabular-nums'] in React Native.

### SOS Pulsing Button
```javascript
// Three concentric rings, each with offset delay
const pulse = Animated.loop(
  Animated.sequence([
    Animated.timing(scale, { toValue: 1.3, duration: 800, useNativeDriver: true }),
    Animated.timing(scale, { toValue: 1.0, duration: 800, useNativeDriver: true }),
  ])
)
// Ring 1: delay 0ms, opacity 0.3
// Ring 2: delay 300ms, opacity 0.2
// Ring 3: delay 600ms, opacity 0.1
```

### Screen Transitions
- Standard push navigation (slide left): default React Navigation stack behaviour
- Modal screens (file upload, urgency form): slide up from bottom
- No fancy flip or rotation transitions — keep it fast and functional

### Button Press Feedback
- Mobile: use TouchableOpacity with activeOpacity={0.75}
- Web: CSS transition on background-color: 150ms ease

### Feature Tile Hover (Web)
```css
transition: transform 0.15s ease, box-shadow 0.15s ease;
/* hover */
transform: translateY(-2px);
box-shadow: 0 6px 20px rgba(0,0,0,0.12);
```

### Progress Bar Fill
```css
transition: width 0.6s ease-in-out;
```

---

## 10. Dark Mode

Do NOT implement dark mode. All screens are light mode only.
The screenshots show exclusively light backgrounds.
Dark mode would add complexity and is out of scope for a 6-day build.
Background is always white or #F5F5F5. Text is always dark on light.

---

## 11. Responsive Breakpoints (Web only)

| Breakpoint | Width    | Layout behaviour                          |
|------------|----------|-------------------------------------------|
| Mobile     | < 768px  | Single column, stacked layout             |
| Tablet     | 768–1024 | Two column where applicable               |
| Desktop    | > 1024px | Full multi-column layout (as in screenshots) |

The admin dashboard (Member 1) and all web pages are designed
primarily for desktop (1024px+) since they are used by Railway officials
on workstations. The grievance portal and demand analytics pages are shown
at ~1366px effective width in the screenshots.

---

## 12. Loading & Empty States

### Loading State
Every screen that fetches data must show a loading skeleton or spinner.
Use ActivityIndicator (React Native) or a CSS spinner.
Colour: #E8621A (Brand Orange).
Never show a blank white screen while loading.

### Error State
Show an error card with:
- Orange warning icon
- Message: "Something went wrong. Please try again."
- Retry button (outline orange style)

### Empty State
Show a centred illustration-free message:
- Icon: relevant to the screen (e.g. empty complaint list → FileEdit icon in #CCCCCC)
- Message: contextual (e.g. "No complaints yet. Tap below to report an issue.")
- CTA button if applicable

---

## 13. How to Use This File With Antigravity / Claude

When starting a new Antigravity session for UI work, paste the relevant
sections of this file as context. For example:

For a form screen: paste Sections 2, 3, 4.3, 4.6, 5.3
For a home screen: paste Sections 2, 3, 4.5, 4.7, 5.1
For a safety screen: paste Sections 2, 3, 4.4, 4.8, 5.4
For a chart/analytics screen: paste Sections 2, 3, 4.9, 5.5

Always include Section 2 (Colour Palette) and Section 4.1 (Primary Button)
in every session — they are the most referenced elements.

Tell the AI explicitly:
"Use the RailSaathi design system. Primary colour is #E8621A (Brand Orange).
Background is white (#FFFFFF) or surface grey (#F5F5F5). All CTA buttons
are full-width orange with 12px border radius on mobile. Follow the
typography scale in DESIGN.md."

---

## 14. Quick Reference Card
(Print this or keep open while coding)

```
Brand Orange:    #E8621A   ← buttons, accents, active states, timer
Brand Navy:      #1A3557   ← headings, logo text, step circles
SOS Red:         #CC0000   ← SOS button and background only
Page White:      #FFFFFF   ← all screen backgrounds
Surface Grey:    #F5F5F5   ← card section backgrounds
Primary Text:    #111111   ← all headings and important labels
Secondary Text:  #555555   ← body text, subtitles, timestamps
Divider:         #E0E0E0   ← borders, separators, inactive steps
Success Green:   #27AE60   ← resolved status, chart secondary line

Button radius mobile:  12px
Button radius web:      8px
Card radius mobile:    14px
Card radius web:       12px
Screen H-padding:      16px
Card padding:          16px (mobile), 20px 24px (web)

Font size screen title:   24px (mobile), 28px (web), Bold
Font size section head:   18px (mobile), 20px (web), Bold
Font size body:           14px, Regular
Font size countdown:      56px (mobile), 72px (web), Bold, #E8621A
```
