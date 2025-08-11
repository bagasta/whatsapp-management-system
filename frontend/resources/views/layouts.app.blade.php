<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WA Management</title>
  @vite(['resources/css/app.css','resources/js/app.js'])
</head>
<body class="bg-gray-50 text-gray-900">
  <nav class="bg-white border-b">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="font-semibold">WA Management</div>
      <div><a href="/dashboard" class="text-blue-600">Dashboard</a></div>
    </div>
  </nav>
  <main>
    @yield('content')
  </main>
</body>
</html>
