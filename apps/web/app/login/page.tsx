import { LoginForm } from '../../components/forms/LoginForm';
import '../fix-styles.css';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            企业设备维修管理系统
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            登录到您的账户
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="login-card bg-card py-8 px-4 shadow-lg border border-border rounded-lg sm:px-10">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}