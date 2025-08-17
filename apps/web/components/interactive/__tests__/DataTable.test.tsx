import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '../tables/DataTable';
import { ColumnDef } from '../tables/types';

interface TestData {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

const mockData: TestData[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', status: 'active' },
];

const mockColumns: ColumnDef<TestData>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (row) => row.name,
    sortable: true,
  },
  {
    id: 'email',
    header: 'Email',
    cell: (row) => row.email,
    sortable: true,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => row.status,
    sortable: true,
  },
];

describe('DataTable', () => {
  it('renders data correctly', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows search input when searchable is true', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchable={true}
        searchPlaceholder="Search users..."
      />
    );

    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });

  it('filters data based on search query', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchable={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('搜索...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('shows selection checkboxes when selection is enabled', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        selection={true}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(mockData.length + 1); // +1 for select all
  });

  it('displays loading state', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        loading={true}
      />
    );

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('displays empty state message', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        emptyMessage="No data found"
      />
    );

    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('calls onRowClick when row is clicked', () => {
    const mockOnRowClick = jest.fn();
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onRowClick={mockOnRowClick}
      />
    );

    const firstRow = screen.getByText('John Doe').closest('tr');
    fireEvent.click(firstRow!);

    expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('handles selection changes', () => {
    const mockOnSelectionChange = jest.fn();
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        selection={true}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const firstCheckbox = screen.getAllByRole('checkbox')[1]; // Skip select all
    fireEvent.click(firstCheckbox);

    expect(mockOnSelectionChange).toHaveBeenCalledWith([mockData[0]]);
  });
});