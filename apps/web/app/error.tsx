'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">出错了</h1>
      <p className="text-muted-foreground">{error?.message || 'Unknown error'}</p>
      <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground" onClick={() => reset()}>
        重试
      </button>
    </div>
  )
}


