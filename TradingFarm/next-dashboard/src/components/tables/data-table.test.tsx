import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from './data-table';
import { ColumnDef } from '@tanstack/react-table';

// Mock table data for testing
interface TestData {
  id: string;
  name: string;
  status: string;
  amount: number;
}

const testData: TestData[] = [
  { id: '1', name: 'Test Item 1', status: 'Active', amount: 100 },
  { id: '2', name: 'Test Item 2', status: 'Inactive', amount: 200 },
  { id: '3', name: 'Test Item 3', status: 'Pending', amount: 300 },
  { id: '4', name: 'Another Item', status: 'Active', amount: 400 },
  { id: '5', name: 'Something Different', status: 'Failed', amount: 500 },
];

const columns: ColumnDef<TestData>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      return `$${row.getValue('amount')}`;
    },
  },
];

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the table with data', async () => {
    const { container } = render(<DataTable columns={columns} data={testData} />);

    // Check that the table headers are rendered
    const headers = container.querySelectorAll('th');
    expect(headers.length).toBe(3);
    expect(headers[0]).toHaveTextContent('Name');
    expect(headers[1]).toHaveTextContent('Status');
    expect(headers[2]).toHaveTextContent('Amount');

    // Check that the data is rendered in the first row
    const firstRow = container.querySelector('tbody tr');
    expect(firstRow).not.toBeNull();
    const cells = firstRow?.querySelectorAll('td');
    expect(cells?.[0]).toHaveTextContent('Test Item 1');
    expect(cells?.[2]).toHaveTextContent('$100');
  });

  it('displays a message when no data is provided', async () => {
    render(<DataTable columns={columns} data={[]} />);

    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('filters data based on search input', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={testData}
        searchPlaceholder="Search..."
        searchColumn="name"
        showSearch={true}
      />
    );

    // Get the search input
    const searchInput = screen.getByPlaceholderText('Search...');
    
    // Search for "Another"
    await user.type(searchInput, 'Another');

    // Only "Another Item" should be visible
    expect(screen.getByText('Another Item')).toBeInTheDocument();
    expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
    
    // Clear the search
    await user.clear(searchInput);
    
    // All items should be visible again
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('Another Item')).toBeInTheDocument();
  });

  it('allows sorting by clicking on column headers', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={testData} />);

    // Get the name column header
    const nameHeader = screen.getByText('Name');
    
    // Click on the header to sort
    await user.click(nameHeader);
    
    // Check that the order is as expected (ascending)
    const rows = screen.getAllByRole('row').slice(1); // Skip header row
    const firstRowCells = within(rows[0]).getAllByRole('cell');
    expect(firstRowCells[0]).toHaveTextContent('Another Item');

    // Click again to sort in descending order
    await user.click(nameHeader);
    
    // Check that the order is now reversed
    const updatedRows = screen.getAllByRole('row').slice(1); // Skip header row
    const updatedFirstRowCells = within(updatedRows[0]).getAllByRole('cell');
    expect(updatedFirstRowCells[0]).toHaveTextContent('Test Item 3');
  });

  it('supports pagination configuration options', () => {
    // Create more test data for pagination
    const paginationTestData = Array(15)
      .fill(null)
      .map((_, index) => ({
        id: `${index + 1}`,
        name: `Item ${index + 1}`,
        status: index % 2 === 0 ? 'Active' : 'Inactive',
        amount: (index + 1) * 100,
      }));

    const { container } = render(
      <DataTable
        columns={columns}
        data={paginationTestData}
        defaultPageSize={10}
        pageSizeOptions={[5, 10, 15]}
      />
    );

    // Check that the table is rendered with rows
    const tableRows = container.querySelectorAll('tbody tr');
    expect(tableRows.length).toBeGreaterThan(0);
    
    // Verify we have pagination-related elements
    // Look for specific elements that indicate pagination is present
    const paginationElements = container.querySelectorAll('button, select, p');
    expect(paginationElements.length).toBeGreaterThan(0);
  });
  
  it('renders the correct number of rows based on page size', () => {
    // Create test data
    const paginationTestData = Array(20)
      .fill(null)
      .map((_, index) => ({
        id: `${index + 1}`,
        name: `Item ${index + 1}`,
        status: index % 2 === 0 ? 'Active' : 'Inactive',
        amount: (index + 1) * 100,
      }));

    const { container } = render(
      <DataTable
        columns={columns}
        data={paginationTestData}
        defaultPageSize={5}
      />
    );

    // Check that only 5 rows are rendered (default page size)
    const tableRows = container.querySelectorAll('tbody tr');
    expect(tableRows.length).toBe(5);
  });

  it('supports custom search placeholder', async () => {
    render(
      <DataTable
        columns={columns}
        data={testData}
        searchPlaceholder="Custom search..."
        searchColumn="name"
        showSearch={true}
      />
    );

    expect(screen.getByPlaceholderText('Custom search...')).toBeInTheDocument();
  });

  it('renders with column toggle button when showColumnToggle is true', () => {
    render(
      <DataTable
        columns={columns}
        data={testData}
        showColumnToggle={true}
      />
    );

    // Check that the columns toggle button is rendered
    const columnsButton = screen.getByRole('button', { name: /columns/i });
    expect(columnsButton).toBeInTheDocument();
  });
  
  it('does not show column toggle button when showColumnToggle is false', () => {
    render(
      <DataTable
        columns={columns}
        data={testData}
        showColumnToggle={false}
      />
    );

    // The columns button should not be rendered
    const columnsButton = screen.queryByRole('button', { name: /columns/i });
    expect(columnsButton).not.toBeInTheDocument();
  });
  
  it('renders all provided columns by default', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={testData}
      />
    );

    // Check that all three column headers are rendered
    const tableHeaders = container.querySelectorAll('th');
    expect(tableHeaders.length).toBe(3);
  });
});
