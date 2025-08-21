'use client'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
          <h1 className="text-2xl font-semibold">应用发生错误</h1>
          <p className="text-muted-foreground">{error?.message || 'Unknown error'}</p>
          {error?.stack ? (
            <pre className="max-w-[90vw] overflow-auto text-xs bg-gray-100 p-4 rounded-md">
              {error.stack}
            </pre>
          ) : null}
        </div>
      </body>
    </html>
  )
}


