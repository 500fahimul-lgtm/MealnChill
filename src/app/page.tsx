import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MealNChill</h1>
          <p className="text-gray-600">Your Meal Management System</p>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/auth/login"
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors text-center block"
          >
            Login to Your Account
          </Link>
          
          <Link 
            href="/auth/register"
            className="w-full bg-white text-primary-600 py-3 px-4 rounded-lg font-medium border-2 border-primary-600 hover:bg-primary-50 transition-colors text-center block"
          >
            Create New Account
          </Link>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Welcome to MealNChill - Manage your mess meals efficiently</p>
        </div>
      </div>
    </main>
  )
}
