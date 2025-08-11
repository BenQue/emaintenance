import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssetCodeInput } from '../AssetCodeInput'
import { assetService } from '../../../lib/services/asset-service'

// Mock the asset service
jest.mock('../../../lib/services/asset-service', () => ({
  assetService: {
    getAssetSuggestions: jest.fn(),
    validateAssetCode: jest.fn(),
  },
}))

const mockAssetService = assetService as jest.Mocked<typeof assetService>

const mockAssets = [
  {
    id: '1',
    assetCode: 'EQ-001',
    name: 'Equipment 001',
    location: 'Building A',
    isActive: true,
    description: 'Test equipment',
    model: 'Test Model',
    manufacturer: 'Test Manufacturer',
    serialNumber: 'SN001',
    ownerId: 'owner1',
    owner: { firstName: 'John', lastName: 'Doe' },
    administratorId: 'admin1', 
    administrator: { firstName: 'Jane', lastName: 'Admin' },
    installDate: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: '2', 
    assetCode: 'EQ-002',
    name: 'Equipment 002',
    location: 'Building B',
    isActive: false,
    description: 'Another test equipment',
    model: 'Test Model 2',
    manufacturer: 'Test Manufacturer 2',
    serialNumber: 'SN002',
    ownerId: 'owner2',
    owner: { firstName: 'Bob', lastName: 'Smith' },
    administratorId: 'admin2',
    administrator: { firstName: 'Alice', lastName: 'Manager' },
    installDate: '2023-02-01',
    createdAt: '2023-02-01', 
    updatedAt: '2023-02-01',
  },
]

describe('AssetCodeInput', () => {
  const mockOnAssetSelected = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders with default placeholder', () => {
    render(<AssetCodeInput />)
    
    expect(screen.getByPlaceholderText('输入资产代码...')).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    render(<AssetCodeInput placeholder="Custom placeholder" />)
    
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
  })

  it('shows suggestions when typing', async () => {
    const user = userEvent.setup()
    mockAssetService.getAssetSuggestions.mockResolvedValue(mockAssets)

    render(<AssetCodeInput onAssetSelected={mockOnAssetSelected} />)
    
    const input = screen.getByPlaceholderText('输入资产代码...')
    
    await user.type(input, 'EQ')
    
    // Wait for debounced search
    await waitFor(() => {
      expect(mockAssetService.getAssetSuggestions).toHaveBeenCalledWith('EQ', { limit: 10 })
    }, { timeout: 500 })

    // Check if suggestions appear
    await waitFor(() => {
      expect(screen.getByText('Equipment 001')).toBeInTheDocument()
      expect(screen.getByText('Equipment 002')).toBeInTheDocument()
    })
  })

  it('handles suggestion selection', async () => {
    const user = userEvent.setup()
    mockAssetService.getAssetSuggestions.mockResolvedValue(mockAssets)

    render(<AssetCodeInput onAssetSelected={mockOnAssetSelected} />)
    
    const input = screen.getByPlaceholderText('输入资产代码...')
    await user.type(input, 'EQ')
    
    await waitFor(() => {
      expect(screen.getByText('Equipment 001')).toBeInTheDocument()
    })

    // Click on first suggestion
    await user.click(screen.getByText('Equipment 001'))
    
    expect(mockOnAssetSelected).toHaveBeenCalledWith(mockAssets[0])
    expect(input).toHaveValue('EQ-001')
  })

  it('validates asset code on Enter press', async () => {
    const user = userEvent.setup()
    mockAssetService.validateAssetCode.mockResolvedValue({
      exists: true,
      asset: mockAssets[0]
    })

    render(<AssetCodeInput onAssetSelected={mockOnAssetSelected} />)
    
    const input = screen.getByPlaceholderText('输入资产代码...')
    await user.type(input, 'EQ-001')
    await user.keyboard('{Enter}')
    
    await waitFor(() => {
      expect(mockAssetService.validateAssetCode).toHaveBeenCalledWith('EQ-001')
    })
    
    expect(mockOnAssetSelected).toHaveBeenCalledWith(mockAssets[0])
  })

  it('shows validation error for non-existing asset', async () => {
    const user = userEvent.setup()
    mockAssetService.validateAssetCode.mockResolvedValue({
      exists: false
    })

    render(<AssetCodeInput onAssetSelected={mockOnAssetSelected} />)
    
    const input = screen.getByPlaceholderText('输入资产代码...')
    await user.type(input, 'INVALID')
    await user.keyboard('{Enter}')
    
    await waitFor(() => {
      expect(mockAssetService.validateAssetCode).toHaveBeenCalledWith('INVALID')
    })
    
    // Should show error state
    await waitFor(() => {
      expect(input).toHaveClass('border-red-500')
    })
  })

  it('shows selected asset details', async () => {
    const user = userEvent.setup()
    mockAssetService.getAssetSuggestions.mockResolvedValue(mockAssets)

    render(<AssetCodeInput onAssetSelected={mockOnAssetSelected} />)
    
    const input = screen.getByPlaceholderText('输入资产代码...')
    await user.type(input, 'EQ')
    
    await waitFor(() => {
      expect(screen.getByText('Equipment 001')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Equipment 001'))
    
    // Should show selected asset card
    expect(screen.getByText('EQ-001')).toBeInTheDocument()
    expect(screen.getByText('Equipment 001')).toBeInTheDocument()
    expect(screen.getByText('位置: Building A')).toBeInTheDocument()
    expect(screen.getByText('活跃')).toBeInTheDocument()
  })

  it('applies filters correctly', async () => {
    const user = userEvent.setup()
    mockAssetService.getAssetSuggestions.mockResolvedValue(mockAssets)

    const filters = { location: 'Building A', isActive: true, limit: 5 }
    render(<AssetCodeInput filters={filters} />)
    
    const input = screen.getByPlaceholderText('输入资产代码...')
    await user.type(input, 'EQ')
    
    await waitFor(() => {
      expect(mockAssetService.getAssetSuggestions).toHaveBeenCalledWith('EQ', filters)
    })
  })

  it('handles clear button click', async () => {
    const user = userEvent.setup()
    
    render(<AssetCodeInput onAssetSelected={mockOnAssetSelected} />)
    
    const input = screen.getByPlaceholderText('输入资产代码...')
    await user.type(input, 'EQ-001')
    
    // Find and click clear button
    const clearButton = screen.getByRole('button', { name: '' })
    await user.click(clearButton)
    
    expect(input).toHaveValue('')
  })

  it('shows loading state', async () => {
    const user = userEvent.setup()
    mockAssetService.getAssetSuggestions.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockAssets), 1000))
    )

    render(<AssetCodeInput />)
    
    const input = screen.getByPlaceholderText('输入资产代码...')
    await user.type(input, 'EQ')
    
    // Should show loading spinner
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    mockAssetService.getAssetSuggestions.mockRejectedValue(new Error('API Error'))

    render(<AssetCodeInput />)
    
    const input = screen.getByPlaceholderText('输入资产代码...')
    await user.type(input, 'EQ')
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to search assets:', expect.any(Error))
    })
    
    // Should show error state
    await waitFor(() => {
      expect(input).toHaveClass('border-red-500')
    })

    consoleSpy.mockRestore()
  })

  it('debounces search input correctly', async () => {
    const user = userEvent.setup({ delay: null })
    mockAssetService.getAssetSuggestions.mockResolvedValue(mockAssets)

    render(<AssetCodeInput />)
    
    const input = screen.getByPlaceholderText('输入资产代码...')
    
    // Type rapidly
    await user.type(input, 'E')
    await user.type(input, 'Q')
    await user.type(input, '-')
    
    // Should only call API once after debounce delay
    await waitFor(() => {
      expect(mockAssetService.getAssetSuggestions).toHaveBeenCalledTimes(1)
      expect(mockAssetService.getAssetSuggestions).toHaveBeenCalledWith('EQ-', { limit: 10 })
    }, { timeout: 500 })
  })

  it('closes suggestions on Escape key', async () => {
    const user = userEvent.setup()
    mockAssetService.getAssetSuggestions.mockResolvedValue(mockAssets)

    render(<AssetCodeInput />)
    
    const input = screen.getByPlaceholderText('输入资产代码...')
    await user.type(input, 'EQ')
    
    await waitFor(() => {
      expect(screen.getByText('Equipment 001')).toBeInTheDocument()
    })

    await user.keyboard('{Escape}')
    
    await waitFor(() => {
      expect(screen.queryByText('Equipment 001')).not.toBeInTheDocument()
    })
  })
})