# FlowLock — Comprehensive Code Review & Issues Audit Report

> **Project:** FlowLock — Dependency-Aware Project Workspace  
> **Review Date:** August 2026  
> **Review Scope:** Functional Logic, Algorithmic Engine, Security & Persistence, Architecture & Code Quality, UI/UX & Accessibility, Documentation.

---

## Executive Summary

**FlowLock** is a client-side Kanban project management platform featuring a directed acyclic graph (DAG) dependency engine designed to prevent teams from starting blocked tasks.

While the core concept, visual styling, and directed graph concept are innovative and well-conceived, our comprehensive technical review identified **24 distinct issues** across the codebase. These range from **critical blocking bugs** (such as an asynchronous login defect that breaks standard sign-in, and auth guard bypasses on core pages) to **algorithmic edge cases**, **security vulnerabilities** (unencrypted sensitive storage, XSS vectors), **code duplication**, and **UI/UX inconsistencies**.

This document provides a detailed breakdown of each issue, its impact, root cause, code references, and remediation guidance.

---

## Table of Contents
1. [Severity & Classification Summary](#1-severity--classification-summary)
2. [Critical & High Severity Issues](#2-critical--high-severity-issues)
3. [Algorithmic & Dependency Engine Issues](#3-algorithmic--dependency-engine-issues)
4. [Security & Data Integrity Issues](#4-security--data-integrity-issues)
5. [Architecture & Code Smells](#5-architecture--code-smells)
6. [UI, UX & Accessibility Defects](#6-ui-ux--accessibility-defects)
7. [Documentation & Structural Discrepancies](#7-documentation--structural-discrepancies)
8. [Summary of Action Items](#8-summary-of-action-items)

---

## 1. Severity & Classification Summary

| Category | Critical 🔴 | High 🟠 | Medium 🟡 | Low 🟢 | Total |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Functional & Logic Bugs** | 2 | 3 | 2 | 1 | **8** |
| **Algorithmic & Graph Engine** | 0 | 2 | 2 | 0 | **4** |
| **Security & Persistence** | 1 | 2 | 1 | 0 | **4** |
| **Architecture & Code Quality** | 0 | 2 | 2 | 0 | **4** |
| **UI, UX & Accessibility** | 0 | 1 | 2 | 1 | **4** |
| **Total Issues** | **3** | **10** | **9** | **2** | **24** |

---

## 2. Critical & High Severity Issues

### 🔴 ISSUE-01: Asynchronous `loginUser` Not Awaited in `index.html` (Breaks Sign In)
- **Severity:** `Critical` 🔴
- **Status:** `FIXED` ✅
- **Component:** Authentication / Entry Point
- **Impacted Files:** [`index.html:L59-L74`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/index.html#L59-L74)
- **Description:**
  In [`index.html`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/index.html), the login form submission handler previously called `loginUser(email, password)` synchronously without `await`.
- **Resolution:** Made form submission handler `async` and awaited `loginUser()`.

---

### 🔴 ISSUE-02: Incomplete Auth Guard on `tasks.html` and `activity.html` (Route Protection Bypass)
- **Severity:** `Critical` 🔴
- **Status:** `FIXED` ✅
- **Component:** Route Protection / Access Control
- **Impacted Files:** [`js/auth.js:L452-L474`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/auth.js#L452-L474), [`tasks.html:L212`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/tasks.html#L212), [`activity.html:L110`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/activity.html#L110)
- **Description:**
  `checkAuthGuard` only protected `dashboard` and `profile`.
- **Resolution:** Implemented whitelists: `PROTECTED_PAGES = ['dashboard', 'tasks', 'activity', 'profile']` and `GUEST_PAGES = ['login', 'signup', 'index']`.

---

### 🔴 ISSUE-03: `activity.html` Clear History Fails to Persist in Storage
- **Severity:** `Critical` 🔴
- **Status:** `FIXED` ✅
- **Component:** State Management / LocalStorage Persistence
- **Impacted Files:** [`activity.html:L180-L187`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/activity.html#L180-L187), [`js/taskManager.js:L408-L411`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/taskManager.js#L408-L411)
- **Description:**
  Clearing history only cleared the memory variable.
- **Resolution:** Added `clearActivities()` in `taskManager.js` that resets memory and calls `saveActivityLog([])`.

---

### 🟠 ISSUE-04: Dead and Mismatched Navigation Links Across All Pages
- **Severity:** `High` 🟠
- **Status:** `FIXED` ✅
- **Component:** Routing / UI Navigation
- **Impacted Files:** [`dashboard.html`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/dashboard.html), [`tasks.html`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/tasks.html), [`profile.html`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/profile.html), [`activity.html`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/activity.html)
- **Description:**
  Links with `href="#"` and missing sidebar navigation items.
- **Resolution:** Standardized sidebar navigation links and added `#inspector` hash routing listener in `app.js`.

---

### 🟠 ISSUE-05: Conflicting Entry Points (`index.html` vs `login.html` vs `landing.html`)
- **Severity:** `High` 🟠
- **Component:** Routing & UX Consistency
- **Impacted Files:** [`index.html`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/index.html), [`login.html`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/login.html), [`landing.html`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/landing.html)

---

## 3. Algorithmic & Dependency Engine Issues

### 🟠 ISSUE-06: Cycle Detection Does Not Account for Simultaneous Multiple Dependency Updates
- **Severity:** `High` 🟠
- **Status:** `FIXED` ✅
- **Component:** Directed Graph Cycle Detection
- **Impacted Files:** [`js/dependencyEngine.js:L16-L73`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/dependencyEngine.js#L16-L73), [`js/taskManager.js`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/taskManager.js)
- **Resolution:** Upgraded `detectCycle` to evaluate proposed dependency changes against a temporary cloned state using recursion-stack DFS traversal.

---

### 🟠 ISSUE-07: Form Validation Prevents Updating Non-Status Fields on Completed Tasks
- **Severity:** `High` 🟠
- **Status:** `FIXED` ✅
- **Component:** Form Validation Layer
- **Impacted Files:** [`js/validation.js:L75-L87`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/validation.js#L75-L87)
- **Resolution:** Enforce dependency completeness rules only during active status transitions to `In Progress` or `Done`.

---

### 🟡 ISSUE-08: Timezone Offset Flaw in Due Date Validation & Formatting
- **Severity:** `Medium` 🟡
- **Status:** `FIXED` ✅
- **Component:** Date Utilities & Validation
- **Impacted Files:** [`js/utils.js:L11-L36`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/utils.js#L11-L36), [`js/validation.js:L42-L53`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/validation.js#L42-L53)
- **Resolution:** Added `parseLocalDate` to split YYYY-MM-DD strings and construct local date instances without UTC midnight offsets.

---

### 🟡 ISSUE-09: Dangling Dependency IDs Result in Permanently Blocked Tasks After JSON Import
- **Severity:** `Medium` 🟡
- **Status:** `FIXED` ✅
- **Component:** JSON Import / State Recovery
- **Impacted Files:** [`js/storage.js:L187-L192`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/storage.js#L187-L192), [`js/dependencyEngine.js:L78-L105`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/dependencyEngine.js#L78-L105)
- **Resolution:** Prune orphan IDs during import validation and ignore missing IDs in `isTaskLocked`.

---

## 4. Security & Data Integrity Issues

### 🔴 ISSUE-10: Insecure Client-Side Credential Storage & Cleartext Demo Credentials
- **Severity:** `Critical` 🔴
- **Component:** Authentication Security
- **Impacted Files:** [`js/auth.js`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/auth.js)

---

### 🟠 ISSUE-11: Potential Cross-Site Scripting (XSS) via Unsanitized `innerHTML` Interpolation
- **Severity:** `High` 🟠
- **Status:** `FIXED` ✅
- **Component:** UI Rendering Engine
- **Impacted Files:** [`js/ui.js`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/ui.js)
- **Resolution:** Escaped `task.id`, `task.priority`, `task.status`, and `task.dueDate` in card templates.

---

### 🟡 ISSUE-12: Workspace Export Does Not Back Up Activity History or User Preferences
- **Severity:** `Medium` 🟡
- **Component:** Storage & Export System
- **Impacted Files:** [`js/storage.js`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/storage.js)

---

## 5. Architecture & Code Smells

### 🟠 ISSUE-13: Massive Code Duplication Across HTML Pages & Inline Scripts
- **Severity:** `High` 🟠
- **Component:** Code Architecture / DRY Principle

---

### 🟠 ISSUE-14: CSS Redundancy and Bloat (2,946 Lines, ~58 KB)
- **Severity:** `High` 🟠
- **Component:** Styling / CSS Design System

---

### 🟡 ISSUE-15: Hardcoded Author Name "Diksha" in Initial Seeds and Default Assignee
- **Severity:** `Medium` 🟡
- **Status:** `FIXED` ✅
- **Component:** Multi-user State & Form Defaults
- **Impacted Files:** [`js/ui.js:L311-L320`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/js/ui.js#L311-L320)
- **Resolution:** Set default assignee dynamically from `getCurrentUser()?.name`.

---

### 🟡 ISSUE-16: Missing Automated Test Suite Despite Claims in Documentation
- **Severity:** `Medium` 🟡
- **Status:** `FIXED` ✅
- **Component:** Testing & QA
- **Impacted Files:** [`tests.html`](file:///c:/Users/legha/OneDrive/Desktop/FinalEVAL1/FlowLock/tests.html)
- **Resolution:** Created comprehensive browser verification test suite in `tests.html`.

---

## 6. UI, UX & Accessibility Defects

### 🟠 ISSUE-17: Mobile Touch Devices Cannot Drag Kanban Cards (No Touch DnD Support)
- **Severity:** `High` 🟠
- **Component:** Kanban Interaction / Mobile UX

---

### 🟡 ISSUE-18: Missing Keyboard Accessibility and ARIA Roles on Interactive Kanban Cards
- **Severity:** `Medium` 🟡
- **Component:** Accessibility (a11y)

---

### 🟡 ISSUE-19: No Mobile Sidebar Toggle on Dashboard, Tasks, Activity, or Profile Views
- **Severity:** `Medium` 🟡
- **Component:** Responsive Layout

---

### 🟢 ISSUE-20: Rapid Toast Notifications Cause Visual Stacking Overlaps
- **Severity:** `Low` 🟢
- **Component:** Toast Notification System

---

## 7. Documentation & Structural Discrepancies

### 🟡 ISSUE-21: `README.md` Project Tree and Route Documentation Are Outdated
- **Severity:** `Medium` 🟡
- **Component:** Documentation

---

### 🟢 ISSUE-22: Filter and Search Cannot Be Combined in Task Manager
- **Severity:** `Low` 🟢
- **Component:** Filter & Search Query Logic

---

### 🟡 ISSUE-23: Activity Audit Log Does Not Support Pagination or Filter by Event Type
- **Severity:** `Medium` 🟡
- **Component:** Activity Audit Trail

---

### 🟡 ISSUE-24: Dependency Inspector Cannot Add or Edit Dependencies In-Place
- **Severity:** `Medium` 🟡
- **Component:** Dependency Inspector Modal
