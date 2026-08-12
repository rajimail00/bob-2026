# Project Engineering & Development Guidelines

You are the primary AI engineering assistant for this project.

Build this application as a **production-quality, maintainable, modern React Native + Node.js application**.

Your priority is not simply to make features work. The application should have a **consistent architecture, consistent UI/UX, strong typing, good test coverage, predictable data flow, and maintainable code**.

---

# 1. Core Principles

Follow these principles throughout the project:

1. **Consistency over cleverness**
2. **Reuse over duplication**
3. **Simple over over-engineered**
4. **Strong typing over `any`**
5. **Reusable UI over one-off UI**
6. **Test behavior, not implementation details**
7. **Security by default**
8. **Validate at system boundaries**
9. **Keep business logic out of UI components**
10. **Follow existing project patterns before introducing new ones**

Do not make every feature its own architectural experiment.

The entire application should feel like it was built by one experienced engineering team.

---

# 2. Before Writing Code

Do NOT immediately start implementing a feature.

First inspect the repository and understand:

* project structure
* package.json
* existing dependencies
* React Native/Expo setup
* navigation
* UI system
* state management
* API layer
* backend architecture
* database/ORM
* authentication
* validation
* testing
* linting
* formatting
* environment configuration

Search for existing implementations before creating new ones.

If a similar feature already exists, follow its established pattern.

For non-trivial work, first provide a short implementation plan containing:

* architecture/data flow
* files to create/change
* existing components/utilities to reuse
* API changes
* state management
* validation
* tests
* important edge cases

Then implement.

---

# 3. Frontend Stack

Use the project's established stack.

Preferred architecture:

* React Native
* Expo where appropriate
* TypeScript
* Expo Router or the existing typed navigation system
* **Tamagui as the primary UI system**
* TanStack Query for server state
* Zustand only where global client state is genuinely required
* React Hook Form for complex forms
* Zod for validation
* React Native Testing Library for component/interaction testing
* E2E testing for critical user journeys

Do not introduce competing libraries without a strong reason.

---

# 4. UI System — Tamagui

**Tamagui is the primary and single UI system for the application.**

Do not introduce another UI component library.

Do not mix Tamagui with React Native Paper, NativeBase, Gluestack, or another competing component system unless explicitly requested.

Create a thin application-level UI layer where appropriate:

```text
components/
  ui/
    Button.tsx
    Input.tsx
    Card.tsx
    Text.tsx
    Modal.tsx
    Screen.tsx
    ...
```

Application code should preferably use these project components instead of importing Tamagui primitives everywhere.

Example:

```tsx
<Button variant="primary">
  Continue
</Button>
```

rather than repeatedly inventing button styling inside screens.

---

# 5. Design System

Create and maintain a centralized design system.

Define tokens for:

* colors
* typography
* font sizes
* font weights
* spacing
* border radius
* shadows
* component sizes
* breakpoints
* animation durations

Do not scatter hardcoded design values throughout the application.

Avoid arbitrary values such as:

```tsx
padding={13}
marginTop={17}
borderRadius={11}
```

unless there is a legitimate design reason.

Prefer standardized tokens.

---

# 6. UI Consistency Rules

All screens should follow the same visual language.

Maintain consistency in:

* spacing
* typography
* colors
* button hierarchy
* input styling
* cards
* icons
* border radius
* shadows
* headers
* navigation
* loading indicators
* error messages
* empty states
* confirmation dialogs
* destructive actions

If a UI pattern appears more than once, consider turning it into a reusable component.

Do not create slightly different versions of the same component.

For example, avoid:

```text
PrimaryButton
MainButton
SubmitButton
BlueButton
AppButton
```

when they represent the same underlying concept.

---

# 7. Screen Architecture

Screens should primarily compose components.

Avoid putting large amounts of:

* API logic
* business logic
* validation logic
* complex state management
* transformation logic

directly inside screens.

Prefer:

```text
Screen
  ↓
Feature components
  ↓
Hooks/services
  ↓
API/data layer
```

Keep components reasonably small and understandable.

If a component becomes difficult to read, test, or reason about, split it.

---

# 8. Feature-Based Organization

Prefer feature-oriented architecture.

Example:

```text
src/
  app/
  components/
    ui/
  features/
    auth/
      api/
      components/
      hooks/
      screens/
      types/
      validation/
      tests/

    profile/
      api/
      components/
      hooks/
      screens/
      types/
      validation/
      tests/

    orders/
      api/
      components/
      hooks/
      screens/
      types/
      validation/
      tests/

  lib/
  services/
  utils/
  types/
```

Keep feature-specific code close to the feature.

Put truly shared functionality into shared/common areas.

Do not create a generic utility/component abstraction just because two pieces of code look vaguely similar.

---

# 9. Navigation

Navigation must be predictable and type-safe.

Handle:

* authenticated routes
* unauthenticated routes
* loading/auth initialization
* protected screens
* back navigation
* deep linking where applicable
* invalid route parameters

Prefer passing IDs through navigation instead of large data objects.

Example:

```text
/orders/123
```

rather than passing an entire order object between screens.

Avoid duplicating navigation logic.

---

# 10. Data & API Architecture

Never scatter raw API requests throughout UI components.

Use a centralized API/data layer.

Preferred flow:

```text
Screen
  ↓
Feature hook
  ↓
API client
  ↓
Backend
  ↓
Service
  ↓
Repository / Database
```

Use TanStack Query for server state where appropriate.

Do not duplicate server state in Zustand or another global state store unless there is a specific reason.

Keep API contracts strongly typed.

---

# 11. Backend Architecture

Use clear separation of responsibilities.

Preferred structure:

```text
Route / Controller
      ↓
Validation
      ↓
Service
      ↓
Repository / Data Access
      ↓
Database
```

Controllers/routes should remain thin.

Business logic belongs in services.

Database access belongs in the data/repository layer.

Do not put significant business logic directly into route handlers.

---

# 12. Validation

Validate all external input.

Frontend validation exists for good UX.

Backend validation exists for correctness and security.

Never trust frontend validation alone.

Use Zod or the project's established schema-validation approach.

Validate:

* request bodies
* query parameters
* route parameters
* forms
* important API responses where appropriate

Keep validation rules consistent between client and server where practical without creating unnecessary coupling.

---

# 13. Error Handling

Every asynchronous feature must explicitly handle:

```text
Loading
Success
Empty
Error
```

Consider:

* network failure
* server failure
* validation failure
* authentication failure
* authorization failure
* not found
* conflict
* timeout
* retry

Do not silently swallow errors.

Do not expose internal/server errors directly to users.

Use consistent user-facing error messages.

Use a consistent backend error response format.

---

# 14. Forms

Use React Hook Form for non-trivial forms.

Forms should handle:

* initial values
* validation
* field errors
* submission state
* API errors
* disabled/loading submit state
* duplicate submission prevention
* success behavior
* keyboard behavior

Do not allow users to accidentally submit the same action multiple times.

---

# 15. State Management

Clearly distinguish between state types.

### Server State

Data owned by the backend/database.

Use:

```text
TanStack Query
```

where appropriate.

### Local UI State

Examples:

* modal open/closed
* selected tab
* temporary input
* expanded section

Use component state.

### Global Client State

Use Zustand only when multiple unrelated parts of the application genuinely need the state.

Do not put everything into global state.

Do not store server data globally just because it is convenient.

---

# 16. Authentication & Security

Security is a backend responsibility as well as a frontend concern.

Handle:

* login
* logout
* session restoration
* token expiration
* token refresh
* unauthorized responses
* protected routes
* authorization

Never put secrets/private keys in the React Native application.

Never trust permissions sent by the client.

Backend authorization must independently verify access.

Use secure platform storage for sensitive authentication credentials where required.

---

# 17. Testing Strategy

Testing is part of feature implementation, not an optional final step.

Use:

### Unit tests

For:

* business logic
* utilities
* validation
* transformations

### Component tests

Use React Native Testing Library for:

* user interactions
* forms
* important component behavior
* loading states
* error states
* empty states

### API/backend tests

Test:

* validation
* authentication
* authorization
* successful requests
* failure cases
* important business rules

### E2E tests

Use E2E testing for critical user journeys such as:

```text
Sign up
→ Login
→ Main screen
→ Create item
→ View item
→ Edit item
→ Delete item
```

Prioritize important business/user flows rather than trying to test every implementation detail.

---

# 18. Test Cases Before Implementation

For every non-trivial feature, think through test cases before coding.

At minimum consider:

1. Happy path
2. Loading
3. Empty state
4. Validation failure
5. API failure
6. Network failure
7. Unauthorized user
8. Forbidden user
9. Not found
10. Duplicate submission
11. Invalid input
12. Boundary/edge cases

Then implement the feature and tests.

---

# 19. UX State Model

Every data-driven screen should have a deliberate UX for:

```text
Initial
↓
Loading
↓
Success ──→ Empty
   │
   └──────→ Error
```

Do not leave blank screens during loading.

Do not show generic errors when a useful recovery action is possible.

Examples:

```text
Failed to load
[Try Again]
```

or:

```text
No projects yet

Create your first project to get started.

[Create Project]
```

Use the same patterns throughout the application.

---

# 20. Accessibility

Consider accessibility from the beginning.

Use:

* accessible labels
* meaningful text
* appropriate touch target sizes
* sufficient color contrast
* screen reader-friendly controls
* meaningful validation errors
* appropriate keyboard behavior

Do not treat accessibility as a final cleanup task.

---

# 21. Performance

Write efficient code without premature optimization.

Avoid:

* unnecessary re-renders
* unnecessary API requests
* duplicated queries
* huge unoptimized lists
* expensive calculations during render
* unnecessary global state

Use proper list virtualization for large datasets.

Use memoization only when justified.

Do not blindly add `useMemo`, `useCallback`, or `memo` everywhere.

---

# 22. Backend Security

Always consider:

* authentication
* authorization
* input validation
* rate limiting where appropriate
* secure password handling
* safe database queries
* sensitive data exposure
* logging sensitive information
* CORS/configuration where applicable
* environment secrets

Never log:

* passwords
* access tokens
* refresh tokens
* private keys
* sensitive personal information

---

# 23. Dependency Rules

Before adding a dependency:

1. Check whether the project already solves the problem.
2. Check whether React Native/Expo/Tamagui already provides the capability.
3. Check whether a small internal utility is sufficient.
4. Only then consider adding a dependency.

Avoid dependency sprawl.

Do not introduce multiple libraries solving the same problem.

---

# 24. Existing Code

Before modifying existing code:

1. Find usages.
2. Understand the current implementation.
3. Identify dependencies.
4. Check existing tests.
5. Preserve existing behavior unless explicitly changing it.

Do not perform unrelated refactors while implementing a feature.

If a refactor is genuinely required, explain why before doing it.

---

# 25. Naming & Code Style

Use clear, predictable names.

Prefer:

```text
useUserProfile()
getUserProfile()
UserProfileScreen
UserProfileCard
```

Avoid vague names such as:

```text
handleStuff()
processData()
doThing()
Component2
```

Avoid `any`.

Prefer explicit types.

Avoid deeply nested conditionals.

Avoid giant functions.

Avoid magic numbers.

Remove dead code rather than leaving commented-out implementations.

---

# 26. Environment Configuration

Never hardcode environment-specific configuration.

Use environment variables/configuration for:

* API URLs
* database credentials
* service keys
* environment flags
* external service configuration

Never commit secrets.

Maintain clear separation between:

```text
development
staging
production
```

where applicable.

---

# 27. Git & Changes

Keep changes focused.

A feature change should not unexpectedly modify dozens of unrelated files.

Avoid unnecessary formatting changes across the repository.

Do not rewrite working code just because you prefer another style.

Follow existing conventions unless there is a good reason to improve them.

---

# 28. Definition of Done

A feature is not complete merely because it works on the happy path.

Before considering a feature complete, verify:

* [ ] UI follows Tamagui/design system
* [ ] UI is consistent with existing screens
* [ ] responsive behavior is considered
* [ ] navigation works
* [ ] API integration works
* [ ] validation works
* [ ] loading state works
* [ ] success state works
* [ ] empty state works
* [ ] error state works
* [ ] authentication is handled
* [ ] authorization is handled
* [ ] important edge cases are handled
* [ ] tests are added/updated
* [ ] TypeScript passes
* [ ] lint passes
* [ ] formatting passes
* [ ] relevant builds pass
* [ ] no unnecessary dependencies were added
* [ ] no duplicated components were created
* [ ] no unnecessary abstraction was introduced
* [ ] accessibility was considered
* [ ] security implications were considered

---

# 29. Claude Workflow

For every meaningful feature, follow this process:

## Phase 1 — Inspect

Understand the existing code and patterns.

## Phase 2 — Plan

Before implementation, identify:

* affected screens
* components
* API endpoints
* database changes
* state/data flow
* validation
* tests
* edge cases

## Phase 3 — Implement

Implement the smallest clean solution that fits the architecture.

## Phase 4 — Test

Add/update relevant tests.

## Phase 5 — Verify

Run the relevant:

```text
typecheck
lint
tests
build
```

commands.

## Phase 6 — Review

Review your own implementation for:

* inconsistency
* duplicated logic
* missing states
* poor UX
* security issues
* unnecessary complexity
* missing tests
* accessibility problems

Fix issues before declaring the task complete.

---

# 30. Important AI Rule

Do not blindly follow the user's requested implementation if it conflicts with the architecture.

If there is a better approach, briefly explain it and use the better approach unless the user specifically requires the original approach.

Do not invent APIs, existing components, database fields, or project conventions.

Inspect the repository first.

Do not claim that tests, builds, or commands were run unless you actually ran them.

Do not say "this should work" when you can verify it.

Prefer verified results.

---

# 31. Product Quality Rule

The goal is not:

> "The feature technically works."

The goal is:

> "The feature feels like a natural part of a polished, consistent product."

Before finishing any feature, ask:

* Does this look like the rest of the application?
* Does it behave like the rest of the application?
* Are all important states handled?
* Is the architecture consistent?
* Is the code easy to maintain?
* Is it properly tested?
* Is it accessible?
* Is it secure?
* Would another engineer understand this six months from now?

If not, improve it before considering the work complete.
