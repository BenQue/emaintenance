import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../select';

describe('Select Components', () => {
  it('renders select trigger with placeholder', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
      </Select>
    );

    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('opens dropdown content on trigger click', async () => {
    const user = userEvent.setup();
    
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('handles value selection', async () => {
    const user = userEvent.setup();
    let selectedValue = '';

    render(
      <Select onValueChange={(value: string) => { selectedValue = value; }}>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    
    const option1 = screen.getByText('Option 1');
    await user.click(option1);

    expect(selectedValue).toBe('option1');
  });

  it('displays selected value', () => {
    render(
      <Select value="option1">
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  it('applies correct CSS classes for z-index overlay', () => {
    render(
      <Select open>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
        </SelectContent>
      </Select>
    );

    const content = document.querySelector('[data-slot="select-content"]');
    expect(content).toHaveClass('z-[9999]');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(
      <Select>
        <SelectTrigger size="sm">
          <SelectValue placeholder="Small select" />
        </SelectTrigger>
      </Select>
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('data-size', 'sm');

    rerender(
      <Select>
        <SelectTrigger size="default">
          <SelectValue placeholder="Default select" />
        </SelectTrigger>
      </Select>
    );

    expect(trigger).toHaveAttribute('data-size', 'default');
  });
});