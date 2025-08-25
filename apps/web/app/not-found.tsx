export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '32px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '600' }}>页面未找到</h1>
      <p style={{ color: '#666' }}>您访问的页面不存在或已被移动。</p>
      <a href="/" style={{ textDecoration: 'underline', color: '#1E88E5' }}>
        返回首页
      </a>
    </div>
  );
}