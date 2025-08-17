import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../table';

describe('Table Components', () => {
  it('renders table with header and body', () => {
    render(
      <Table>
        <TableCaption>Test table caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByText('Test table caption')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies correct table structure', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Test content</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const table = container.querySelector('table');
    const tbody = container.querySelector('tbody');
    const tr = container.querySelector('tr');
    const td = container.querySelector('td');

    expect(table).toBeInTheDocument();
    expect(tbody).toBeInTheDocument();
    expect(tr).toBeInTheDocument();
    expect(td).toBeInTheDocument();
    expect(td).toHaveTextContent('Test content');
  });
});