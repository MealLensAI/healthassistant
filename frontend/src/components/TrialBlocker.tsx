import React from 'react';

interface TrialBlockerProps {
  children: React.ReactNode;
}

/**
 * Pass-through wrapper kept for backward compatibility with existing routes.
 *
 * Previously this component would block the entire page (including a user's
 * already-generated meal plan, history, and settings) when the free 7-day
 * meal plan had been used. That was too aggressive — users should still be
 * able to view, edit, and navigate everything they already have. The
 * subscription requirement now only kicks in at the action point, i.e. when
 * the user tries to *create* a new meal plan (see Index.tsx handleSubmit).
 */
const TrialBlocker: React.FC<TrialBlockerProps> = ({ children }) => {
  return <>{children}</>;
};

export default TrialBlocker;
