'use client';

import type { Resume } from '@resumind/types';
import { createEmptyResume, stripResumeMetaFromEditor } from '@resumind/types';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CvSectionSlug } from '@/components/cv/cv-section-nav';
import { getCv } from '@/lib/api';

interface CvEditorState {
  cvId: string;
  resume: Resume;
  version: string | undefined;
  loading: boolean;
  error: string | null;
  setResume: (next: Resume | ((prev: Resume) => Resume)) => void;
  setVersion: (next: string) => void;
  mountedSection: CvSectionSlug | null;
  setMountedSection: (slug: CvSectionSlug) => void;
}

const CvEditorContext = createContext<CvEditorState | null>(null);

export function CvEditorProvider({ cvId, children }: { cvId: string; children: ReactNode }) {
  const [resume, setResumeState] = useState<Resume>(() => createEmptyResume());
  const [version, setVersion] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mountedSection, setMountedSectionState] = useState<CvSectionSlug | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCv(cvId)
      .then((cv) => {
        if (cancelled) return;
        const fetched = cv.data as Resume;
        setResumeState(stripResumeMetaFromEditor(fetched));
        setVersion(fetched.meta?.version);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load CV');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cvId]);

  const setResume = useCallback((next: Resume | ((prev: Resume) => Resume)) => {
    setResumeState((prev) =>
      typeof next === 'function' ? (next as (p: Resume) => Resume)(prev) : next,
    );
  }, []);

  const setMountedSection = useCallback((slug: CvSectionSlug) => {
    setMountedSectionState(slug);
  }, []);

  const value = useMemo<CvEditorState>(
    () => ({
      cvId,
      resume,
      version,
      loading,
      error,
      setResume,
      setVersion,
      mountedSection,
      setMountedSection,
    }),
    [cvId, resume, version, loading, error, setResume, mountedSection, setMountedSection],
  );

  return <CvEditorContext.Provider value={value}>{children}</CvEditorContext.Provider>;
}

export function useCvEditor(): CvEditorState {
  const context = useContext(CvEditorContext);
  if (!context) {
    throw new Error('useCvEditor must be used within CvEditorProvider');
  }
  return context;
}
