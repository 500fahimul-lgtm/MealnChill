'use client'

import { Info as InfoIcon, Schedule } from '@mui/icons-material'

interface DemoModeAlertProps {
  messName: string
  messStatus: 'created' | 'started' | 'ended'
  isAdmin: boolean
}

export default function DemoModeAlert({ messName, messStatus, isAdmin }: DemoModeAlertProps) {
  if (messStatus === 'started') {
    return null // Don't show if mess is active
  }

  return (
    <div className="mb-6">
      {messStatus === 'created' && !isAdmin && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Schedule className="w-6 h-6 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-orange-800">Demo Mode Active</h3>
              <p className="text-orange-700 mt-1">
                Welcome to <strong>{messName}</strong>! You're currently viewing the interface in demo mode. 
                All features are visible but calculations haven't started yet.
              </p>
              <div className="mt-3 p-3 bg-orange-100 rounded-md">
                <p className="text-sm text-orange-800 font-medium">
                  📢 Ask your mess admin to start the mess when ready to begin meal tracking and billing.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {messStatus === 'created' && isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <InfoIcon className="w-6 h-6 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-blue-800">Ready to Start Your Mess</h3>
              <p className="text-blue-700 mt-1">
                Your mess <strong>{messName}</strong> is set up and ready! Members can see the interface but 
                all calculations are on hold until you start the mess.
              </p>
              <div className="mt-3 p-3 bg-blue-100 rounded-md">
                <p className="text-sm text-blue-800">
                  💡 Go to <strong>Settings → Mess Lifecycle</strong> to start the mess when you're ready.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {messStatus === 'ended' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <InfoIcon className="w-6 h-6 text-gray-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-800">Mess Has Ended</h3>
              <p className="text-gray-700 mt-1">
                The mess <strong>{messName}</strong> has been officially ended. All calculations are complete 
                and final overview has been generated.
              </p>
              {isAdmin && (
                <div className="mt-3 p-3 bg-gray-100 rounded-md">
                  <p className="text-sm text-gray-800">
                    📊 Check <strong>Settings → Mess Lifecycle</strong> to view the final overview.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
