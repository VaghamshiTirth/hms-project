# Graph Report - .  (2026-06-25)

## Corpus Check
- 122 files · ~62,351 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 628 nodes · 1275 edges · 67 communities (39 shown, 28 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 132 edges (avg confidence: 0.74)
- Token cost: 488 input · 368 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Backend API Models|Backend API Models]]
- [[_COMMUNITY_React Frontend Components|React Frontend Components]]
- [[_COMMUNITY_JS Bundle Router|JS Bundle Router]]
- [[_COMMUNITY_User & Patient Entities|User & Patient Entities]]
- [[_COMMUNITY_Android Test Infrastructure|Android Test Infrastructure]]
- [[_COMMUNITY_JS Bundle Navigation|JS Bundle Navigation]]
- [[_COMMUNITY_JS Bundle Core Library|JS Bundle Core Library]]
- [[_COMMUNITY_JS Bundle DOM Utilities|JS Bundle DOM Utilities]]
- [[_COMMUNITY_JS Analytics Chunk|JS Analytics Chunk]]
- [[_COMMUNITY_Android Launcher Icons|Android Launcher Icons]]
- [[_COMMUNITY_Android Splash Screens|Android Splash Screens]]
- [[_COMMUNITY_JS Bundle Utilities|JS Bundle Utilities]]
- [[_COMMUNITY_JS Bundle State Management|JS Bundle State Management]]
- [[_COMMUNITY_App Entry & PWA|App Entry & PWA]]
- [[_COMMUNITY_Project Documentation|Project Documentation]]
- [[_COMMUNITY_Web App Manifest|Web App Manifest]]
- [[_COMMUNITY_Android App Manifest|Android App Manifest]]
- [[_COMMUNITY_JS RxJS Observables|JS RxJS Observables]]
- [[_COMMUNITY_SMS Notifications|SMS Notifications]]
- [[_COMMUNITY_App Logos|App Logos]]
- [[_COMMUNITY_Django Settings|Django Settings]]
- [[_COMMUNITY_JS Observable Library|JS Observable Library]]
- [[_COMMUNITY_Django App Config|Django App Config]]
- [[_COMMUNITY_Django Management CLI|Django Management CLI]]
- [[_COMMUNITY_Android Main Activity|Android Main Activity]]
- [[_COMMUNITY_Graphify Agent Plugin|Graphify Agent Plugin]]
- [[_COMMUNITY_Opencode Configuration|Opencode Configuration]]
- [[_COMMUNITY_Opencode Plugin Package|Opencode Plugin Package]]
- [[_COMMUNITY_Django ASGI Config|Django ASGI Config]]
- [[_COMMUNITY_Django WSGI Config|Django WSGI Config]]
- [[_COMMUNITY_Environment Variables|Environment Variables]]
- [[_COMMUNITY_Web Service Worker|Web Service Worker]]
- [[_COMMUNITY_Capacitor Config|Capacitor Config]]
- [[_COMMUNITY_Android Service Worker|Android Service Worker]]
- [[_COMMUNITY_React License|React License]]
- [[_COMMUNITY_Graph Analysis Concepts|Graph Analysis Concepts]]
- [[_COMMUNITY_Initial Migration|Initial Migration]]
- [[_COMMUNITY_User Role Migration|User Role Migration]]
- [[_COMMUNITY_Mobile Number Migration|Mobile Number Migration]]
- [[_COMMUNITY_Appointment Queue Migration|Appointment Queue Migration]]
- [[_COMMUNITY_Patient Signup OTP|Patient Signup OTP]]
- [[_COMMUNITY_Medical Record File|Medical Record File]]
- [[_COMMUNITY_Billing Appointment Link|Billing Appointment Link]]
- [[_COMMUNITY_Appointment Reason Notes|Appointment Reason Notes]]
- [[_COMMUNITY_Family Access Migration|Family Access Migration]]
- [[_COMMUNITY_Family Access Relation|Family Access Relation]]
- [[_COMMUNITY_Admission Model|Admission Model]]
- [[_COMMUNITY_Patient History Alter|Patient History Alter]]

## God Nodes (most connected - your core abstractions)
1. `$()` - 131 edges
2. `_require_role()` - 34 edges
3. `_error()` - 28 edges
4. `_log_activity()` - 24 edges
5. `4()` - 24 edges
6. `c()` - 19 edges
7. `forEach()` - 18 edges
8. `tt()` - 17 edges
9. `ir` - 16 edges
10. `T()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `453()` --calls--> `A()`  [INFERRED]
  frontend/android/app/src/main/assets/public/static/js/453.825386d9.chunk.js → frontend/android/app/src/main/assets/public/static/js/main.4afe2a82.js
- `453()` --calls--> `c()`  [INFERRED]
  frontend/android/app/src/main/assets/public/static/js/453.825386d9.chunk.js → frontend/android/app/src/main/assets/public/static/js/main.4afe2a82.js
- `453()` --calls--> `g()`  [INFERRED]
  frontend/android/app/src/main/assets/public/static/js/453.825386d9.chunk.js → frontend/android/app/src/main/assets/public/static/js/main.4afe2a82.js
- `453()` --calls--> `n()`  [INFERRED]
  frontend/android/app/src/main/assets/public/static/js/453.825386d9.chunk.js → frontend/android/app/src/main/assets/public/static/js/main.4afe2a82.js
- `453()` --calls--> `u()`  [INFERRED]
  frontend/android/app/src/main/assets/public/static/js/453.825386d9.chunk.js → frontend/android/app/src/main/assets/public/static/js/main.4afe2a82.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Capacitor Android Deployment Pipeline** — frontend_android_app_setup_capacitor, frontend_android_app_setup_react_app_native_api_url, frontend_android_app_setup_django_backend, frontend_android_app_setup_hms_care, frontend_readme_npm_build [INFERRED 0.85]
- **graphify Toolset** — hms_project_agents_graphify, hms_project_agents_graphify_query, hms_project_agents_graphify_update [EXTRACTED 1.00]

## Communities (67 total, 28 thin omitted)

### Community 0 - "Backend API Models"
Cohesion: 0.06
Nodes (93): AccessToken, ActivityLog, Admission, Billing, MedicalRecord, Meta, PasswordResetOTP, Prescription (+85 more)

### Community 1 - "React Frontend Components"
Cohesion: 0.05
Nodes (46): LiveDateTimeCard(), MobileApiSettings(), Sidebar(), ActivityLogs(), LOG_SECTIONS, AddPatient(), familyAccessButtonClasses(), AdminIdManager() (+38 more)

### Community 2 - "JS Bundle Router"
Cohesion: 0.05
Nodes (16): $(), Ct, et(), ja(), jt(), ka(), lt(), Na() (+8 more)

### Community 3 - "User & Patient Entities"
Cohesion: 0.10
Nodes (14): Appointment, Doctor, FamilyAccess, Patient, PatientSignupOTP, User, BillingAppointmentRuleTests, FamilyAccessTests (+6 more)

### Community 4 - "Android Test Infrastructure"
Cohesion: 0.05
Nodes (39): browserslist, development, production, dependencies, axios, @capacitor/android, @capacitor/cli, @capacitor/core (+31 more)

### Community 5 - "JS Bundle Navigation"
Cohesion: 0.07
Nodes (13): at(), dt(), ft(), gn(), Gr, it(), mt(), nt() (+5 more)

### Community 6 - "JS Bundle Core Library"
Cohesion: 0.11
Nodes (14): A(), constructor(), cr(), Dn(), forEach(), Hn(), ir, Nr() (+6 more)

### Community 7 - "JS Bundle DOM Utilities"
Cohesion: 0.20
Nodes (21): Ae(), be(), c(), ce(), De(), _e(), Ee(), fe() (+13 more)

### Community 8 - "JS Analytics Chunk"
Cohesion: 0.23
Nodes (16): 453(), 288(), 672(), An(), b(), bt(), d(), f() (+8 more)

### Community 9 - "Android Launcher Icons"
Cohesion: 0.14
Nodes (15): Android Launcher Icon (hdpi), Android Launcher Icon Foreground (hdpi), Android Launcher Icon Round (hdpi), Android Launcher Icon (mdpi), Android Launcher Icon Foreground (mdpi), Android Launcher Icon Round (mdpi), Android Launcher Icon (xhdpi), Android Launcher Icon Foreground (xhdpi) (+7 more)

### Community 10 - "Android Splash Screens"
Cohesion: 0.17
Nodes (12): Android Splash Screen, Landscape HDPI Splash Bitmap, Landscape MDPI Splash Bitmap, Landscape XHDPI Splash Bitmap, Landscape XXHDPI Splash Bitmap, Landscape XXXHDPI Splash Bitmap, Portrait HDPI Splash Bitmap, Portrait MDPI Splash Bitmap (+4 more)

### Community 11 - "JS Bundle Utilities"
Cohesion: 0.21
Nodes (12): 391(), 43(), 579(), 853(), 896(), 950(), g(), n() (+4 more)

### Community 12 - "JS Bundle State Management"
Cohesion: 0.24
Nodes (7): 4(), he(), Oa(), or(), sr(), we(), Ye()

### Community 13 - "App Entry & PWA"
Cohesion: 0.22
Nodes (6): App(), root, reportWebVitals(), isLocalhost, register(), registerValidSW()

### Community 14 - "Project Documentation"
Cohesion: 0.25
Nodes (8): Android Build Flow, Capacitor, com.hms.portal, HMS Care, Create React App, npm run build, Hospital Management System, Robots.txt

### Community 15 - "Web App Manifest"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 16 - "Android App Manifest"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 18 - "SMS Notifications"
Cohesion: 0.67
Nodes (6): _build_payload(), _format_to_number(), send_sms_message(), _send_via_twilio(), send_whatsapp_message(), _write_to_outbox()

### Community 19 - "App Logos"
Cohesion: 0.60
Nodes (5): React Logo 192px (Android Assets), React Logo 512px (Android Assets), React Logo 192px, React Logo 512px, React Logo SVG

### Community 25 - "Graphify Agent Plugin"
Cohesion: 0.67
Nodes (3): graphify, graphify query, graphify update

## Knowledge Gaps
- **113 isolated node(s):** `$schema`, `plugin`, `@opencode-ai/plugin`, `Migration`, `Migration` (+108 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$()` connect `JS Bundle Router` to `JS Bundle Navigation`, `JS Bundle Core Library`, `JS Bundle DOM Utilities`, `JS Analytics Chunk`, `JS Bundle Utilities`, `JS Bundle State Management`, `JS RxJS Observables`, `JS Observable Library`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `tt()` connect `JS Bundle Navigation` to `JS Bundle Router`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `ir` connect `JS Bundle Core Library` to `JS Bundle Router`, `JS Bundle State Management`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `4()` (e.g. with `O()` and `T()`) actually correct?**
  _`4()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugin`, `@opencode-ai/plugin` to the rest of the system?**
  _117 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend API Models` be split into smaller, more focused modules?**
  _Cohesion score 0.06167176350662589 - nodes in this community are weakly interconnected._
- **Should `React Frontend Components` be split into smaller, more focused modules?**
  _Cohesion score 0.050156739811912224 - nodes in this community are weakly interconnected._