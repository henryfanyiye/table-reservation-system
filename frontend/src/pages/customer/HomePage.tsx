export default function HomePage() {
  return (
    <div class="text-center py-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">欢迎来到餐厅预订系统</h1>
      <p class="text-lg text-gray-600 mb-8">使用我们的在线预订系统，轻松预订您的餐桌</p>
      <div class="flex justify-center gap-4">
        <a
          href="/login"
          class="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          客户登录
        </a>
        <a
          href="/staff/login"
          class="inline-block px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          员工登录
        </a>
      </div>
    </div>
  );
}
