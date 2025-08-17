import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { ThemeToggle } from '../theme-toggle';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider attribute="class" defaultTheme="light">
    {children}
  </ThemeProvider>
);

describe('ThemeToggle', () => {
  it('renders theme toggle button', () => {
    render(
      <Wrapper>
        <ThemeToggle />
      </Wrapper>
    );
    
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toBeInTheDocument();
  });

  it('has accessible label', () => {
    render(
      <Wrapper>
        <ThemeToggle />
      </Wrapper>
    );
    
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toHaveAttribute('aria-label', '切换主题');
  });
});