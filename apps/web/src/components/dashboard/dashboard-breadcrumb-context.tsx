'use client';

import type { CvTitleBasics } from '@resubuild/types';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { CvSectionSlug } from '@/components/cv/cv-section-nav';
import type { JobApplicationSummary } from '@/lib/api';

export type DashboardBreadcrumbVariant = 'default' | 'cv' | 'application';

export interface DashboardBreadcrumbState {
  variant: DashboardBreadcrumbVariant;
  cvId?: string;
  basics?: CvTitleBasics | null;
  activeSection?: CvSectionSlug;
  pageLabel?: string;
  application?: JobApplicationSummary | null;
}

interface DashboardBreadcrumbContextValue extends DashboardBreadcrumbState {
  setBreadcrumb: (data: Partial<DashboardBreadcrumbState>) => void;
  reset: () => void;
}

const defaultState: DashboardBreadcrumbState = { variant: 'default' };

const DashboardBreadcrumbContext = createContext<DashboardBreadcrumbContextValue | null>(null);

export function DashboardBreadcrumbProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardBreadcrumbState>(defaultState);

  const setBreadcrumb = useCallback((data: Partial<DashboardBreadcrumbState>) => {
    setState((prev) => ({ ...prev, ...data }));
  }, []);

  const reset = useCallback(() => {
    setState(defaultState);
  }, []);

  const value = useMemo(() => ({ ...state, setBreadcrumb, reset }), [state, setBreadcrumb, reset]);

  return (
    <DashboardBreadcrumbContext.Provider value={value}>
      {children}
    </DashboardBreadcrumbContext.Provider>
  );
}

export function useDashboardBreadcrumb(): DashboardBreadcrumbContextValue {
  const ctx = useContext(DashboardBreadcrumbContext);
  if (!ctx) {
    throw new Error('useDashboardBreadcrumb must be used within DashboardBreadcrumbProvider');
  }
  return ctx;
}
