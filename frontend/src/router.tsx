import { Route, useNavigate } from '@solidjs/router';
import { Component, lazy, onMount, Suspense } from 'solid-js';
import { StaffLayout } from '@/pages/staff/StaffLayout';
import { isAuthenticated, isStaff } from '@/stores/auth';

// 懒加载页面组件
const HomePage = lazy(() => import('@/pages/customer/HomePage'));
const CustomerLoginPage = lazy(() => import('@/pages/customer/LoginPage'));
const ReservationPage = lazy(() => import('@/pages/customer/ReservationPage'));
const MyReservationsPage = lazy(() => import('@/pages/customer/MyReservationsPage'));
const StaffLoginPage = lazy(() => import('@/pages/staff/LoginPage'));
const ReservationsPage = lazy(() => import('@/pages/staff/ReservationsPage'));
const StoresListPage = lazy(() => import('@/pages/staff/StoresListPage'));

// 包装函数：为客户页面添加登录检查
function withCustomerAuth(PageComponent: Component) {
  return function ProtectedCustomerPage() {
    const navigate = useNavigate();

    onMount(() => {
      if (!isAuthenticated()) {
        navigate('/login', { replace: true });
      }
    });

    return (
      <Suspense fallback={<div class="flex items-center justify-center h-screen">加载中...</div>}>
        <PageComponent />
      </Suspense>
    );
  };
}

// 包装函数：为员工页面添加登录检查和布局
function withStaffAuth(PageComponent: Component) {
  return function ProtectedStaffPage() {
    const navigate = useNavigate();

    onMount(() => {
      if (!isAuthenticated() || !isStaff()) {
        navigate('/staff/login', { replace: true });
      }
    });

    return (
      <StaffLayout>
        <Suspense fallback={<div class="flex items-center justify-center h-screen">加载中...</div>}>
          <PageComponent />
        </Suspense>
      </StaffLayout>
    );
  };
}

// 路由配置
export function AppRoutes() {
  return (
    <Suspense fallback={<div class="flex items-center justify-center h-screen">加载中...</div>}>
      {/* 客户登录页（公开访问） */}
      <Route path="/login" component={CustomerLoginPage} />

      {/* 员工登录页（公开访问） */}
      <Route path="/staff/login" component={StaffLoginPage} />

      {/* 客户路由 */}
      <Route path="/">
        <Route path="/" component={HomePage} />
        <Route path="/reservation" component={withCustomerAuth(ReservationPage)} />
        <Route path="/my-reservations" component={withCustomerAuth(MyReservationsPage)} />
      </Route>

      {/* 员工路由（需要认证） */}
      <Route path="/staff/reservations" component={withStaffAuth(ReservationsPage)} />
      <Route path="/staff/stores" component={withStaffAuth(StoresListPage)} />

      {/* 404 处理 */}
      <Route
        path="*"
        component={() => {
          const navigate = useNavigate();
          onMount(() => navigate('/', { replace: true }));
          return (
            <div class="flex items-center justify-center h-screen">页面未找到，正在跳转...</div>
          );
        }}
      />
    </Suspense>
  );
}

export default AppRoutes;
