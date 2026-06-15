// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

describe('Tabs', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the Tabs root as a single-column grid so panels can stack in one cell', () => {
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>,
    );

    const root = container.querySelector('[data-orientation="horizontal"]');
    expect(root).not.toBeNull();
    expect(root!.className).toContain('grid');
    expect(root!.className).toContain('grid-cols-1');
  });

  it('pins every TabsContent to the same grid cell so the cell sizes to the tallest panel', () => {
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>,
    );

    const contents = container.querySelectorAll('[role="tabpanel"]');
    expect(contents).toHaveLength(2);
    for (const content of contents) {
      expect(content.className).toContain('col-start-1');
      expect(content.className).toContain('row-start-2');
    }
  });

  it('keeps every TabsContent mounted regardless of which tab is active', () => {
    // Without forceMount Radix would unmount inactive panels, which would
    // collapse the grid cell and let the parent card jump when the user
    // switched tabs.
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>,
    );

    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(2);
    expect(screen.getByText('Panel A')).toBeInTheDocument();
    expect(screen.getByText('Panel B')).toBeInTheDocument();
  });

  it('hides inactive TabsContent visually but keeps it in the layout', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>,
    );

    const initialInactive = container.querySelector('[role="tabpanel"][data-state="inactive"]')!;
    expect(initialInactive).not.toBeNull();
    expect(initialInactive.className).toContain('invisible');
    expect(initialInactive.className).toContain('pointer-events-none');

    await user.click(screen.getByRole('tab', { name: 'B' }));

    const panels = container.querySelectorAll('[role="tabpanel"]');
    const stillInactive = Array.from(panels).filter(
      (panel) => panel.getAttribute('data-state') === 'inactive',
    );
    expect(stillInactive).toHaveLength(1);
    expect(stillInactive[0]!.className).toContain('invisible');
    expect(stillInactive[0]!.className).toContain('pointer-events-none');
  });
});
