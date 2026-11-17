// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HintText from './HintText';
import MetaText, { CountText } from './MetaText';
import Mono from './Mono';
import SectionLabel from './SectionLabel';

describe('text variants', () => {
  it('renders hints and meta text in the small font size', () => {
    render(
      <>
        <HintText>Hint</HintText>
        <MetaText tone="tertiary">Meta</MetaText>
        <Mono small>/a/b</Mono>
      </>
    );
    expect(screen.getByText('Hint')).toHaveStyle({ fontSize: '12px' });
    expect(screen.getByText('Meta')).toHaveStyle({ fontSize: '12px' });
    expect(screen.getByText('/a/b')).toHaveStyle({ fontSize: '12px' });
  });

  it('shows a placeholder count until loaded', () => {
    const { rerender } = render(<CountText count={1200} loaded={false} />);
    expect(screen.getByText('–')).toBeInTheDocument();
    rerender(<CountText count={1200} />);
    expect(screen.getByText((1200).toLocaleString())).toBeInTheDocument();
  });

  it('renders a section label', () => {
    render(<SectionLabel>Services</SectionLabel>);
    expect(screen.getByText('Services')).toHaveStyle({
      textTransform: 'uppercase'
    });
  });
});
