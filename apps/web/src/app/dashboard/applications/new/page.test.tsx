// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAiAgentActive } from '@/lib/queries/ai-agent-queries';
import NewApplicationPage from './page';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/lib/queries/ai-agent-queries', () => ({
  useAiAgentActive: vi.fn(),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: () => ({ data: [] }),
  };
});

vi.mock('@/components/cv/markdown-editor', () => ({
  MarkdownEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      data-testid="md-editor"
      data-placeholder={placeholder ?? ''}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

function mockAgent(configured: boolean) {
  vi.mocked(useAiAgentActive).mockReturnValue({
    data: { configured },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useAiAgentActive>);
}

describe('NewApplicationPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the breadcrumb chrome and top-right Cancel button', () => {
    mockAgent(true);
    render(<NewApplicationPage />);

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Applications' })).toHaveAttribute(
      'href',
      '/dashboard/applications',
    );
    expect(screen.getByText('Preparing application…')).toBeInTheDocument();
    expect(screen.queryByText(/Back to applications/i)).not.toBeInTheDocument();

    const cancel = screen.getByRole('link', { name: 'Cancel' });
    expect(cancel).toHaveAttribute('href', '/dashboard/applications');
  });
});
