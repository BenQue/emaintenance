'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AssetForm } from '../../../../../components/assets/AssetForm';
import { Asset, assetService } from '../../../../../lib/services/asset-service';

interface EditAssetPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditAssetPage({ params }: EditAssetPageProps) {
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (resolvedParams?.id) {
      loadAsset(resolvedParams.id);
    }
  }, [resolvedParams]);

  const loadAsset = async (id: string) => {
    try {
      setIsLoading(true);
      const assetData = await assetService.getAssetById(id);
      setAsset(assetData);
    } catch (error) {
      console.error('Failed to load asset:', error);
      setError('Failed to load asset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/assets');
  };

  const handleSuccess = (updatedAsset: Asset) => {
    router.push('/dashboard/assets');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            {error || 'Asset not found'}
          </h1>
          <button
            onClick={() => router.push('/dashboard/assets')}
            className="text-blue-600 hover:text-blue-800"
          >
            返回设备列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <AssetForm
        asset={asset}
        mode="edit"
        onCancel={handleCancel}
        onSuccess={handleSuccess}
      />
    </div>
  );
}