'use client';

export default function Error({ 
  error, 
  reset 
}: { 
  error: Error & { digest?: string }; 
  reset: () => void 
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '600' }}>出错了</h1>
      <p style={{ color: '#666' }}>{error?.message || 'Unknown error'}</p>
      <button 
        style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#1E88E5', color: 'white', border: 'none', cursor: 'pointer' }}
        onClick={reset}
      >
        重试
      </button>
    </div>
  );
}