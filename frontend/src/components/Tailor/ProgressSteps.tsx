'use client'

interface ProgressStepsProps {
  currentStep: number
  steps: Array<{ label: string; number: number }>
}

export default function ProgressSteps({ currentStep, steps }: ProgressStepsProps) {
  return (
    <div className="flex items-center justify-center">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step.number <= currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.number <= currentStep ? '✓' : step.number}
            </div>
            <span
              className={`mt-2 text-xs font-medium ${
                step.number <= currentStep ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-16 h-0.5 mx-4 transition-colors ${
                step.number < currentStep ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

