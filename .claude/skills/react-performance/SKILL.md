---
name: react-performance
description: Use this skill whenever creating or modifying React UI components, handling lists, or managing component state to ensure the PWA feels as fast as a native app.
---

# React PWA Performance Guidelines

To maintain a lightning-fast Time to Interactive (TTI) and prevent sluggish UI, you must aggressively optimize React rendering:

1. **Prevent Unnecessary Re-renders:** - Wrap expensive calculations in `useMemo`.
   - Wrap functions passed as props to child components in `useCallback`.
   - Avoid defining inline functions or objects directly inside the JSX `render` method (e.g., avoid `<Button onClick={() => doSomething()} />`).
2. **Code Splitting:** Do not load the entire app at once. Use `React.lazy()` and `<Suspense>` to dynamically import route-level components (e.g., the Reports page should only load when the user clicks on it).
3. **List Virtualization:** When rendering the transaction history ledger, NEVER render a raw map of hundreds of DOM nodes. You must use a virtualization library (like `react-window` or `react-virtualized`) to only render the rows currently visible on the screen.
4. **Context Optimization:** Do not put fast-changing values into global React Context, as it will force the entire component tree to re-render. Keep fast-changing state local.
