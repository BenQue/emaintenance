import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">页面未找到</h1>
      <p className="text-muted-foreground">您访问的页面不存在或已被移动。</p>
      <Link href="/" className="underline text-primary">返回首页</Link>
    </div>
  );
}


