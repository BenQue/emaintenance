import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../use-mobile';

// Mock window.matchMedia
const mockMatchMedia = jest.fn();

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  });
});

beforeEach(() => {
  mockMatchMedia.mockClear();
});

describe('useIsMobile', () => {
  it('should return false initially on server side', () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('should detect mobile screen size correctly', () => {
    const mockMql = {
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMql);

    // Mock window.innerWidth for mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    const { result } = renderHook(() => useIsMobile());

    // Trigger useEffect
    act(() => {
      // The hook should have set up the media query listener
      expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 767px)');
      expect(mockMql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    expect(result.current).toBe(true);
  });

  it('should detect desktop screen size correctly', () => {
    const mockMql = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMql);

    // Mock window.innerWidth for desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());

    // Trigger useEffect
    act(() => {
      expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 767px)');
    });

    expect(result.current).toBe(false);
  });

  it('should clean up event listeners on unmount', () => {
    const mockMql = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMql);

    const { unmount } = renderHook(() => useIsMobile());

    act(() => {
      expect(mockMql.addEventListener).toHaveBeenCalled();
    });

    unmount();

    expect(mockMql.removeEventListener).toHaveBeenCalled();
  });

  it('should handle window resize events', () => {
    const mockMql = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    mockMatchMedia.mockReturnValue(mockMql);

    // Start with desktop width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());

    let changeCallback: () => void;
    act(() => {
      changeCallback = mockMql.addEventListener.mock.calls[0][1];
    });

    expect(result.current).toBe(false);

    // Simulate screen resize to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    act(() => {
      changeCallback();
    });

    expect(result.current).toBe(true);
  });
});