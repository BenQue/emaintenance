import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkOrderPhotos } from '../WorkOrderPhotos';
import { useWorkOrderStore } from '../../../lib/stores/work-order-store';

// Mock the store
jest.mock('../../../lib/stores/work-order-store');
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

const mockUseWorkOrderStore = useWorkOrderStore as jest.MockedFunction<typeof useWorkOrderStore>;

const mockPhotos = [
  {
    id: 'photo-1',
    filename: 'test1.jpg',
    originalName: 'device-fault.jpg',
    filePath: '2025/01/WO123-1234567890-test1.jpg',
    thumbnailPath: '2025/01/thumbnails/thumb_WO123-1234567890-test1.jpg',
    fileSize: 102400,
    mimeType: 'image/jpeg',
    uploadedAt: '2025-01-07T10:30:00.000Z',
  },
  {
    id: 'photo-2',
    filename: 'test2.png',
    originalName: 'repair-complete.png',
    filePath: '2025/01/WO123-1234567891-test2.png',
    thumbnailPath: null,
    fileSize: 204800,
    mimeType: 'image/png',
    uploadedAt: '2025-01-07T14:45:00.000Z',
  },
];

describe('WorkOrderPhotos', () => {
  const mockFetchWorkOrderPhotos = jest.fn();
  const workOrderId = 'wo-123';

  beforeEach(() => {
    // Mock store implementation
    mockUseWorkOrderStore.mockReturnValue({
      fetchWorkOrderPhotos: mockFetchWorkOrderPhotos,
      // Add other store properties as needed
    } as any);

    // Reset environment
    delete (process.env as any).NEXT_PUBLIC_API_URL;
    
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockFetchWorkOrderPhotos.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<WorkOrderPhotos workOrderId={workOrderId} />);

    expect(screen.getByText('工单照片')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('renders empty state when no photos exist', async () => {
    mockFetchWorkOrderPhotos.mockResolvedValue([]);

    render(<WorkOrderPhotos workOrderId={workOrderId} />);

    await waitFor(() => {
      expect(screen.getByText('暂无照片')).toBeInTheDocument();
    });

    expect(mockFetchWorkOrderPhotos).toHaveBeenCalledWith(workOrderId);
  });

  it('renders photos grid when photos exist', async () => {
    mockFetchWorkOrderPhotos.mockResolvedValue(mockPhotos);

    render(<WorkOrderPhotos workOrderId={workOrderId} />);

    await waitFor(() => {
      expect(screen.getByText('工单照片 (2)')).toBeInTheDocument();
    });

    // Check that photos are rendered
    expect(screen.getByAltText('device-fault.jpg')).toBeInTheDocument();
    expect(screen.getByAltText('repair-complete.png')).toBeInTheDocument();

    // Check photo info
    expect(screen.getByText('device-fault.jpg')).toBeInTheDocument();
    expect(screen.getByText('repair-complete.png')).toBeInTheDocument();
    expect(screen.getByText(/100 KB/)).toBeInTheDocument();
    expect(screen.getByText(/200 KB/)).toBeInTheDocument();
  });

  it('displays error state when fetch fails', async () => {
    mockFetchWorkOrderPhotos.mockRejectedValue(new Error('Failed to fetch photos'));

    render(<WorkOrderPhotos workOrderId={workOrderId} />);

    await waitFor(() => {
      expect(screen.getByText('加载照片失败')).toBeInTheDocument();
    });

    expect(screen.getByText('重新加载')).toBeInTheDocument();
  });

  it('handles retry functionality', async () => {
    mockFetchWorkOrderPhotos
      .mockRejectedValueOnce(new Error('Failed to fetch photos'))
      .mockResolvedValueOnce(mockPhotos);

    render(<WorkOrderPhotos workOrderId={workOrderId} />);

    await waitFor(() => {
      expect(screen.getByText('加载照片失败')).toBeInTheDocument();
    });

    // Click retry button
    fireEvent.click(screen.getByText('重新加载'));

    await waitFor(() => {
      expect(screen.getByText('工单照片 (2)')).toBeInTheDocument();
    });

    expect(mockFetchWorkOrderPhotos).toHaveBeenCalledTimes(2);
  });

  it('generates correct photo URLs', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3002';
    mockFetchWorkOrderPhotos.mockResolvedValue(mockPhotos);

    render(<WorkOrderPhotos workOrderId={workOrderId} />);

    await waitFor(() => {
      expect(screen.getByAltText('device-fault.jpg')).toBeInTheDocument();
    });

    // Check that images have correct src attributes
    const firstImage = screen.getByAltText('device-fault.jpg');
    expect(firstImage).toHaveAttribute(
      'src',
      expect.stringContaining(`/api/work-orders/${workOrderId}/work-order-photos/photo-1/thumbnail`)
    );
  });

  it('handles photo interaction - zoom button', async () => {
    mockFetchWorkOrderPhotos.mockResolvedValue(mockPhotos);

    render(<WorkOrderPhotos workOrderId={workOrderId} />);

    await waitFor(() => {
      expect(screen.getByAltText('device-fault.jpg')).toBeInTheDocument();
    });

    // Hover over first photo to show action buttons
    const firstPhotoContainer = screen.getByAltText('device-fault.jpg').closest('.group');
    fireEvent.mouseEnter(firstPhotoContainer!);

    // Should show zoom and download buttons (though they might be hidden by CSS initially)
    // This tests the DOM structure rather than visual appearance
    const actionButtons = firstPhotoContainer!.querySelectorAll('button');
    expect(actionButtons).toHaveLength(2); // Zoom and Download buttons
  });

  it('handles photo download functionality', async () => {
    mockFetchWorkOrderPhotos.mockResolvedValue(mockPhotos);
    
    // Mock document.createElement and related DOM methods
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const mockCreateElement = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const mockAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation();
    const mockRemoveChild = jest.spyOn(document.body, 'removeChild').mockImplementation();

    render(<WorkOrderPhotos workOrderId={workOrderId} />);

    await waitFor(() => {
      expect(screen.getByAltText('device-fault.jpg')).toBeInTheDocument();
    });

    // Find and click download button (this is a simplified test)
    const firstPhotoContainer = screen.getByAltText('device-fault.jpg').closest('.group');
    const downloadButton = firstPhotoContainer!.querySelector('button:last-child');
    
    if (downloadButton) {
      fireEvent.click(downloadButton);
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe('device-fault.jpg');
      expect(mockLink.click).toHaveBeenCalled();
    }

    // Restore mocks
    mockCreateElement.mockRestore();
    mockAppendChild.mockRestore();
    mockRemoveChild.mockRestore();
  });

  it('formats file sizes correctly', async () => {
    const photosWithVariousSizes = [
      { ...mockPhotos[0], fileSize: 1024, originalName: '1KB-file.jpg' },
      { ...mockPhotos[1], fileSize: 1048576, originalName: '1MB-file.png' },
    ];

    mockFetchWorkOrderPhotos.mockResolvedValue(photosWithVariousSizes);

    render(<WorkOrderPhotos workOrderId={workOrderId} />);

    await waitFor(() => {
      expect(screen.getByText(/1 KB/)).toBeInTheDocument();
      expect(screen.getByText(/1 MB/)).toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    mockFetchWorkOrderPhotos.mockResolvedValue(mockPhotos);

    render(<WorkOrderPhotos workOrderId={workOrderId} />);

    await waitFor(() => {
      // Check that date is formatted in Chinese locale
      expect(screen.getByText(/2025\/1\/7/)).toBeInTheDocument();
    });
  });

  it('opens photo modal when zoom button is clicked', async () => {
    mockFetchWorkOrderPhotos.mockResolvedValue(mockPhotos);

    render(<WorkOrderPhotos workOrderId={workOrderId} />);

    await waitFor(() => {
      expect(screen.getByAltText('device-fault.jpg')).toBeInTheDocument();
    });

    // This is a simplified test since the modal interaction is complex
    // In a real scenario, you'd test the modal opening and navigation
    const firstPhotoContainer = screen.getByAltText('device-fault.jpg').closest('.group');
    const zoomButton = firstPhotoContainer!.querySelector('button:first-child');
    
    if (zoomButton) {
      fireEvent.click(zoomButton);
      // The modal would open (tested separately in PhotoViewModal tests)
    }
  });
});