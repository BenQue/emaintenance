'use client';

import { useRouter } from 'next/navigation';
import { AssetForm } from '../../../../components/assets/AssetForm';
import { Asset } from '../../../../lib/services/asset-service';

export default function CreateAssetPage() {
  const router = useRouter();

  const handleCancel = () => {
    router.push('/dashboard/assets');
  };

  const handleSuccess = (asset: Asset) => {
    router.push('/dashboard/assets');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <AssetForm
        mode="create"
        onCancel={handleCancel}
        onSuccess={handleSuccess}
      />
    </div>
  );
}