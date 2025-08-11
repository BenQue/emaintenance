'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { assetService, Asset } from '../../lib/services/asset-service'
import { Search, X, CheckCircle, AlertCircle } from 'lucide-react'

interface AssetCodeInputProps {
  onAssetSelected?: (asset: Asset) => void
  placeholder?: string
  className?: string
  filters?: {
    location?: string
    isActive?: boolean
    limit?: number
  }
}

interface AssetSuggestion extends Asset {
  id: string
  assetCode: string
  name: string
  location: string
  isActive: boolean
  description?: string
}

export const AssetCodeInput: React.FC<AssetCodeInputProps> = ({
  onAssetSelected,
  placeholder = "输入资产代码...",
  className = "",
  filters = {}
}) => {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<AssetSuggestion[]>([])
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'none' | 'valid' | 'invalid'>('none')
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Debounced search function
  const debouncedSearch = useCallback(async (searchInput: string) => {
    if (!searchInput || searchInput.trim().length < 1) {
      setSuggestions([])
      setValidationStatus('none')
      return
    }

    setLoading(true)
    try {
      const results = await assetService.getAssetSuggestions(searchInput.trim(), {
        ...filters,
        limit: filters.limit || 10
      })
      
      setSuggestions(results as AssetSuggestion[])
      setShowSuggestions(true)

      // Auto-validate if there's an exact match
      const exactMatch = results.find(asset => 
        asset.assetCode.toLowerCase() === searchInput.trim().toLowerCase()
      )
      
      if (exactMatch) {
        setValidationStatus('valid')
        setSelectedAsset(exactMatch)
        onAssetSelected?.(exactMatch)
      } else {
        setValidationStatus(results.length > 0 ? 'none' : 'invalid')
      }
    } catch (error) {
      console.error('Failed to search assets:', error)
      setSuggestions([])
      setValidationStatus('invalid')
    } finally {
      setLoading(false)
    }
  }, [filters, onAssetSelected])

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)
    setSelectedAsset(null)
    setValidationStatus('none')

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Set new timer for debounced search
    const timer = setTimeout(() => {
      debouncedSearch(value)
    }, 300)
    
    setDebounceTimer(timer)
  }

  // Handle suggestion selection
  const handleSuggestionClick = (asset: AssetSuggestion) => {
    setInput(asset.assetCode)
    setSelectedAsset(asset)
    setValidationStatus('valid')
    setShowSuggestions(false)
    onAssetSelected?.(asset)
  }

  // Handle manual validation when user presses Enter or clicks search
  const handleValidation = async () => {
    if (!input.trim()) return

    setLoading(true)
    try {
      const result = await assetService.validateAssetCode(input.trim())
      
      if (result.exists && result.asset) {
        setValidationStatus('valid')
        setSelectedAsset(result.asset)
        onAssetSelected?.(result.asset)
      } else {
        setValidationStatus('invalid')
        setSelectedAsset(null)
      }
    } catch (error) {
      console.error('Failed to validate asset code:', error)
      setValidationStatus('invalid')
      setSelectedAsset(null)
    } finally {
      setLoading(false)
    }
    
    setShowSuggestions(false)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions.length === 1) {
        handleSuggestionClick(suggestions[0])
      } else {
        handleValidation()
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  // Clear selection
  const handleClear = () => {
    setInput('')
    setSelectedAsset(null)
    setValidationStatus('none')
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  const getInputClassName = () => {
    let baseClass = "pr-20"
    
    if (validationStatus === 'valid') {
      baseClass += " border-green-500 focus:border-green-500"
    } else if (validationStatus === 'invalid') {
      baseClass += " border-red-500 focus:border-red-500"
    }
    
    return baseClass
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={getInputClassName()}
          disabled={loading}
        />
        
        {/* Status and action icons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600" />
          )}
          
          {validationStatus === 'valid' && !loading && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          
          {validationStatus === 'invalid' && !loading && (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          
          {input && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleValidation}
            disabled={!input.trim() || loading}
          >
            <Search className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Selected asset display */}
      {selectedAsset && validationStatus === 'valid' && (
        <div className="mt-2">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedAsset.assetCode}
                    </Badge>
                    {selectedAsset.isActive ? (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        活跃
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                        非活跃
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-medium text-sm mt-1">{selectedAsset.name}</h4>
                  {selectedAsset.location && (
                    <p className="text-xs text-gray-600">位置: {selectedAsset.location}</p>
                  )}
                  {selectedAsset.description && (
                    <p className="text-xs text-gray-500 mt-1">{selectedAsset.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="absolute z-50 w-full mt-1">
          <Card className="border shadow-lg">
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto">
                {suggestions.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => handleSuggestionClick(asset)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            {asset.assetCode}
                          </Badge>
                          {asset.isActive ? (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              活跃
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                              非活跃
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium mt-1">{asset.name}</p>
                        {asset.location && (
                          <p className="text-xs text-gray-600">位置: {asset.location}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No results message */}
      {showSuggestions && suggestions.length === 0 && input && !loading && validationStatus === 'invalid' && (
        <div ref={suggestionsRef} className="absolute z-50 w-full mt-1">
          <Card className="border border-red-200">
            <CardContent className="p-3 text-center">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">未找到匹配的资产代码</p>
              <p className="text-xs text-gray-500 mt-1">请检查输入或尝试其他搜索词</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}