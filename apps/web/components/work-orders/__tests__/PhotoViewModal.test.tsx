import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhotoViewModal } from '../PhotoViewModal';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

const mockPhotos = [
  {
    id: 'photo-1',
    url: 'http://localhost:3002/api/work-orders/wo-123/work-order-photos/photo-1',
    name: 'device-fault.jpg',
    size: 102400,
    uploadedAt: '2025-01-07T10:30:00.000Z',
  },
  {
    id: 'photo-2',
    url: 'http://localhost:3002/api/work-orders/wo-123/work-order-photos/photo-2',
    name: 'repair-complete.png',
    size: 204800,
    uploadedAt: '2025-01-07T14:45:00.000Z',
  },
  {
    id: 'photo-3',
    url: 'http://localhost:3002/api/work-orders/wo-123/work-order-photos/photo-3',
    name: 'final-inspection.jpg',
    size: 153600,
    uploadedAt: '2025-01-07T16:15:00.000Z',
  },
];

describe('PhotoViewModal', () => {
  const mockOnClose = jest.fn();
  const mockOnDownload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with correct initial photo', () => {
    render(
      <PhotoViewModal
        photos={mockPhotos}
        initialIndex={1}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByAltText('repair-complete.png')).toBeInTheDocument();
    expect(screen.getByText('repair-complete.png')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument(); // Current position
    expect(screen.getByText(/200 KB/)).toBeInTheDocument();
  });

  it('navigates between photos using arrow buttons', () => {
    render(
      <PhotoViewModal
        photos={mockPhotos}
        initialIndex={1}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    // Initially showing photo 2
    expect(screen.getByAltText('repair-complete.png')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    // Click next button
    fireEvent.click(screen.getByRole('button', { name: /right/i }));
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(screen.getByAltText('final-inspection.jpg')).toBeInTheDocument();

    // Click previous button
    fireEvent.click(screen.getByRole('button', { name: /left/i }));
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByAltText('repair-complete.png')).toBeInTheDocument();
  });

  it('wraps around when navigating past boundaries', () => {
    render(
      <PhotoViewModal
        photos={mockPhotos}
        initialIndex={0}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    // At first photo, click previous should go to last
    fireEvent.click(screen.getByRole('button', { name: /left/i }));
    expect(screen.getByText('3 / 3')).toBeInTheDocument();

    // At last photo, click next should go to first
    fireEvent.click(screen.getByRole('button', { name: /right/i }));
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('handles zoom functionality', () => {
    render(
      <PhotoViewModal
        photos={mockPhotos}
        initialIndex={0}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    // Initially at 100%
    expect(screen.getByText('100%')).toBeInTheDocument();

    // Click zoom in
    fireEvent.click(screen.getByTitle('放大 (+)'));
    expect(screen.getByText('120%')).toBeInTheDocument();

    // Click zoom out
    fireEvent.click(screen.getByTitle('缩小 (-)'));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('handles rotation functionality', () => {
    render(
      <PhotoViewModal
        photos={mockPhotos}
        initialIndex={0}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    const imageContainer = screen.getByAltText('device-fault.jpg').parentElement;
    
    // Initially no rotation
    expect(imageContainer).toHaveStyle('transform: scale(1) rotate(0deg)');

    // Click rotate button
    fireEvent.click(screen.getByTitle('旋转 (R)'));
    expect(imageContainer).toHaveStyle('transform: scale(1) rotate(90deg)');

    // Rotate again
    fireEvent.click(screen.getByTitle('旋转 (R)'));
    expect(imageContainer).toHaveStyle('transform: scale(1) rotate(180deg)');
  });

  it('resets zoom and rotation when changing photos', () => {
    render(
      <PhotoViewModal
        photos={mockPhotos}
        initialIndex={0}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    // Zoom and rotate first photo
    fireEvent.click(screen.getByTitle('放大 (+)'));
    fireEvent.click(screen.getByTitle('旋转 (R)'));
    
    expect(screen.getByText('120%')).toBeInTheDocument();
    
    // Navigate to next photo
    fireEvent.click(screen.getByRole('button', { name: /right/i }));
    
    // Should reset to 100% and 0 degrees
    expect(screen.getByText('100%')).toBeInTheDocument();
    const newImageContainer = screen.getByAltText('repair-complete.png').parentElement;
    expect(newImageContainer).toHaveStyle('transform: scale(1) rotate(0deg)');
  });

  it('handles reset functionality', () => {
    render(
      <PhotoViewModal
        photos={mockPhotos}
        initialIndex={0}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    // Zoom and rotate
    fireEvent.click(screen.getByTitle('放大 (+)'));
    fireEvent.click(screen.getByTitle('旋转 (R)'));
    
    // Reset
    fireEvent.click(screen.getByTitle('重置 (0)'));
    
    expect(screen.getByText('100%')).toBeInTheDocument();
    const imageContainer = screen.getByAltText('device-fault.jpg').parentElement;
    expect(imageContainer).toHaveStyle('transform: scale(1) rotate(0deg)');
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <PhotoViewModal
        photos={mockPhotos}
        initialIndex={0}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    fireEvent.click(screen.getByTitle('关闭 (Esc)'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    render(
      <PhotoViewModal
        photos={mockPhotos}
        initialIndex={0}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    // Click on backdrop (div with cursor-pointer class)
    const backdrop = document.querySelector('.cursor-pointer');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('calls onDownload when download button is clicked', () => {
    render(
      <PhotoViewModal
        photos={mockPhotos}
        initialIndex={1}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    fireEvent.click(screen.getByTitle('下载'));
    expect(mockOnDownload).toHaveBeenCalledWith(1); // Current index
  });

  it('navigates using keyboard shortcuts', () => {
    render(
      <PhotoViewModal
        photos={mockPhotos}
        initialIndex={1}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    // Test arrow key navigation
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByText('3 / 3')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    // Test zoom shortcuts
    fireEvent.keyDown(document, { key: '+' });
    expect(screen.getByText('120%')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: '-' });
    expect(screen.getByText('100%')).toBeInTheDocument();

    // Test rotation shortcut
    fireEvent.keyDown(document, { key: 'r' });
    const imageContainer = screen.getByAltText('repair-complete.png').parentElement;
    expect(imageContainer).toHaveStyle('transform: scale(1) rotate(90deg)');

    // Test reset shortcut
    fireEvent.keyDown(document, { key: '0' });
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(imageContainer).toHaveStyle('transform: scale(1) rotate(0deg)');

    // Test escape shortcut
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('navigates using dot navigation', () => {
    render(
      <PhotoViewModal
        photos={mockPhotos}
        initialIndex={0}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    // Find navigation dots
    const dots = screen.getAllByRole('button').filter(button => 
      button.className.includes('w-3 h-3 rounded-full')
    );
    
    expect(dots).toHaveLength(3);

    // Click on third dot
    fireEvent.click(dots[2]);
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  it('shows correct keyboard shortcuts hint', () => {
    render(
      <PhotoViewModal
        photos={mockPhotos}
        initialIndex={0}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText(/键盘快捷键:/)).toBeInTheDocument();
    expect(screen.getByText(/← → 导航/)).toBeInTheDocument();
    expect(screen.getByText(/\+ - 缩放/)).toBeInTheDocument();
  });

  it('handles single photo correctly', () => {
    const singlePhoto = [mockPhotos[0]];

    render(
      <PhotoViewModal
        photos={singlePhoto}
        initialIndex={0}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    
    // Navigation buttons should not be present for single photo
    expect(screen.queryByRole('button', { name: /left/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /right/i })).not.toBeInTheDocument();
    
    // Navigation dots should not be present for single photo
    const dots = screen.queryAllByRole('button').filter(button => 
      button.className.includes('w-3 h-3 rounded-full')
    );
    expect(dots).toHaveLength(0);
  });

  it('formats file sizes and dates correctly', () => {
    render(
      <PhotoViewModal
        photos={mockPhotos}
        initialIndex={0}
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText(/100 KB/)).toBeInTheDocument();
    expect(screen.getByText(/2025\/1\/7/)).toBeInTheDocument();
  });
});