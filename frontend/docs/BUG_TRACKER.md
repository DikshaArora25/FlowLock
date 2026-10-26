# FlowLock — Bug Tracker & Issue Registry

This document serves as the master issue registry for FlowLock, categorizing all identified defects, security vulnerabilities, algorithmic flaws, and code smells with reproduction steps, expected behavior, and resolution status.

---

## Issue Summary Matrix

| ID | Title | Category | Severity | Priority | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| [BUG-01](#bug-01-async-login-unhandled-in-indexhtml) | `loginUser` is async but not awaited in `index.html` | Functional | Critical 🔴 | P0 🔥 | **FIXED** ✅ |
| [BUG-02](#bug-02-auth-guard-bypassed-on-tasks-and-activity-pages) | Route guard does not protect `tasks.html` and `activity.html` | Security / Routing | Critical 🔴 | P0 🔥 | **FIXED** ✅ |
| [BUG-03](#bug-03-activity-log-clear-does-not-persist-to-localstorage) | Activity Log "Clear History" does not persist to LocalStorage | Data Persistence | Critical 🔴 | P1 ⚡ | **FIXED** ✅ |
| [BUG-04](#bug-04-broken--dead-sidebar-navigation-links) | Dead sidebar navigation links (`href="#"`) across dashboard & views | UI / Routing | High 🟠 | P1 ⚡ | **FIXED** ✅ |
| [BUG-05](#bug-05-root-url-loads-broken-indexhtml-instead-of-saas-landinglogin) | Conflicting entry points (`index.html` vs `login.html` vs `landing.html`) | UX / Routing | High 🟠 | P1 ⚡ | **FIXED** ✅ |
| [BUG-06](#bug-06-cycle-detection-evaluates-stale-edges-during-multi-dependency-edit) | Cycle detection checks single edges against stale graph state | Algorithm | High 🟠 | P1 ⚡ | **FIXED** ✅ |
| [BUG-07](#bug-07-editing-non-status-fields-blocked-on-donein-progress-tasks) | Form validation blocks editing metadata on completed tasks | Functional | High 🟠 | P1 ⚡ | **FIXED** ✅ |
| [BUG-08](#bug-08-date-timezone-offset-causes-false-past-date-errors) | Date parsing causes false "Due date in the past" in Western time zones | Validation / Timezone | Medium 🟡 | P2 📋 | **FIXED** ✅ |
| [BUG-09](#bug-09-dangling-dependency-ids-lock-tasks-forever-on-import) | Orphan dependency IDs in imported JSON permanently lock tasks | Data Import | Medium 🟡 | P2 📋 | **FIXED** ✅ |
| [BUG-10](#bug-10-plaintext-demo-credentials--unsalted-sha-256-hashes) | Unsalted SHA-256 password hashing in LocalStorage | Security | High 🟠 | P2 📋 | **FIXED** ✅ |
| [BUG-11](#bug-11-unsanitized-innerhtml-interpolations-create-xss-risks) | Unsanitized `innerHTML` interpolation of `task.id`, `status`, `dueDate` | Security (XSS) | High 🟠 | P1 ⚡ | **FIXED** ✅ |
| [BUG-12](#bug-12-workspace-export-omits-activity-history-and-preferences) | Board JSON export omits activity audit trail and preferences | Data Export | Medium 🟡 | P3 ⏳ | Open ⭕ |
| [BUG-13](#bug-13-modal-markup--theme-scripts-duplicated-across-all-html-pages) | Massive code duplication across HTML files and inline scripts | Architecture | High 🟠 | P2 📋 | Open ⭕ |
| [BUG-14](#bug-14-css-bloat--duplicated-styles-2946-lines-in-stylescss) | CSS bloat, duplicate rules, and conflicting `!important` flags | Styling / CSS | High 🟠 | P2 📋 | Open ⭕ |
| [BUG-15](#bug-15-hardcoded-username-diksha-in-seeds-and-task-creation-defaults) | Hardcoded default assignee "Diksha" for all new tasks | Multi-user / UX | Medium 🟡 | P3 ⏳ | **FIXED** ✅ |
| [BUG-16](#bug-16-no-unit-tests-or-automated-test-runner-in-codebase) | Missing automated test suite despite claims in README | QA / Testing | Medium 🟡 | P2 📋 | **FIXED** ✅ |
| [BUG-17](#bug-17-drag-and-drop-kanban-does-not-work-on-mobile-touch-devices) | HTML5 Drag & Drop does not function on mobile touch screens | Mobile UX | High 🟠 | P2 📋 | Open ⭕ |
| [BUG-18](#bug-18-kanban-board-lacks-keyboard-navigation-and-aria-roles) | Missing keyboard accessibility and ARIA roles on cards | Accessibility | Medium 🟡 | P3 ⏳ | Open ⭕ |
| [BUG-19](#bug-19-no-mobile-sidebar-toggle-in-workspace-pages) | No hamburger menu or mobile sidebar toggle in app layout | Responsive UX | Medium 🟡 | P2 📋 | Open ⭕ |
| [BUG-20](#bug-20-rapid-toast-notifications-overlap-and-clip-visually) | Rapid toast notifications stack without offsets | UI / Toasts | Low 🟢 | P3 ⏳ | Open ⭕ |
| [BUG-21](#bug-21-readme-references-non-existent-kanbanaproject-root) | Outdated project structure and file manifest in `README.md` | Documentation | Medium 🟡 | P3 ⏳ | Open ⭕ |
| [BUG-22](#bug-22-filter-dropdown-cannot-combine-status-and-priority) | Single-dimension filter prevents combining status and priority | Search / Filter | Low 🟢 | P3 ⏳ | Open ⭕ |
| [BUG-23](#bug-23-activity-page-lacks-filtering-by-event-type) | Activity Timeline lacks event type filtering (Move, Unlock, etc.) | UX / Audit | Medium 🟡 | P3 ⏳ | Open ⭕ |
| [BUG-24](#bug-24-dependency-inspector-does-not-allow-direct-editing) | Dependency Inspector modal is purely read-only | Feature / UX | Medium 🟡 | P3 ⏳ | Open ⭕ |

---

## Detailed Bug Reports

### BUG-01: Async Login Unhandled in `index.html`
- **File:** [`index.html:L59-L74`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/index.html#L59-L74)
- **Status:** **FIXED** ✅
- **Resolution:** Made form submission handler `async` and awaited `loginUser()`.

---

### BUG-02: Auth Guard Bypassed on Tasks and Activity Pages
- **File:** [`js/auth.js:L452-L474`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/auth.js#L452-L474)
- **Status:** **FIXED** ✅
- **Resolution:** Added route whitelists (`PROTECTED_PAGES` and `GUEST_PAGES`).

---

### BUG-03: Activity Log Clear Does Not Persist to LocalStorage
- **File:** [`activity.html`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/activity.html) & [`js/taskManager.js`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/taskManager.js)
- **Status:** **FIXED** ✅
- **Resolution:** Added `clearActivities()` in `taskManager.js` that calls `saveActivityLog([])`.

---

### BUG-04: Broken & Dead Sidebar Navigation Links
- **File:** [`dashboard.html`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/dashboard.html), [`tasks.html`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/tasks.html), [`profile.html`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/profile.html)
- **Status:** **FIXED** ✅
- **Resolution:** Standardized sidebar navigation links across all pages and added `#inspector` hash listener in `app.js`.

---

### BUG-06: Cycle Detection Evaluates Stale Edges During Multi-Dependency Edit
- **File:** [`js/dependencyEngine.js:L16-L73`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/dependencyEngine.js#L16-L73)
- **Status:** **FIXED** ✅
- **Resolution:** Upgraded `detectCycle` to evaluate proposed dependency changes against a temporary cloned state using recursion-stack DFS traversal.

---

### BUG-07: Editing Non-Status Fields Blocked on Done/In Progress Tasks
- **File:** [`js/validation.js:L75-L87`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/validation.js#L75-L87)
- **Status:** **FIXED** ✅
- **Resolution:** Enforce dependency completeness rules only during active status transitions to `In Progress` or `Done`.

---

### BUG-08: Date Timezone Offset Causes False Past Date Errors
- **File:** [`js/utils.js:L11-L36`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/utils.js#L11-L36), [`js/validation.js:L42-L53`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/validation.js#L42-L53)
- **Status:** **FIXED** ✅
- **Resolution:** Added `parseLocalDate` to split YYYY-MM-DD strings and construct local date instances without UTC midnight offsets.

---

### BUG-09: Dangling Dependency IDs Lock Tasks Forever on Import
- **File:** [`js/storage.js:L187-L192`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/storage.js#L187-L192), [`js/dependencyEngine.js:L78-L105`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/dependencyEngine.js#L78-L105)
- **Status:** **FIXED** ✅
- **Resolution:** Prune orphan IDs during import validation and ignore missing IDs in `isTaskLocked`.

---

### BUG-11: Unsanitized `innerHTML` Interpolations Create XSS Risks
- **File:** [`js/ui.js`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/ui.js)
- **Status:** **FIXED** ✅
- **Resolution:** Escaped `task.id`, `task.priority`, `task.status`, and `task.dueDate` in card templates.

---

### BUG-15: Hardcoded Username "Diksha" in Seeds and Task Creation Defaults
- **File:** [`js/ui.js:L311-L320`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/ui.js#L311-L320)
- **Status:** **FIXED** ✅
- **Resolution:** Set default assignee dynamically from `getCurrentUser()?.name`.

---

### BUG-16: No Unit Tests or Automated Test Runner in Codebase
- **File:** [`tests.html`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/tests.html)
- **Status:** **FIXED** ✅
- **Resolution:** Created comprehensive browser verification test suite in `tests.html`.
