'use client'

import { useState, useEffect } from 'react'
import { Loader2, Zap, Eye, Calculator, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface AnalyzeProgressProps {
  onComplete: (result: any) => void
  onError: (error: string) => void
  measurementData: {
    placeId: string
    lat: number
    lng: number
    address?: string
  }
}

interface ProgressStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  duration: number
}

const PROGRESS_STEPS: ProgressStep[] = [
  {
    id: 'imagery',
    title: 'Accessing Satellite Imagery',
    description: 'Loading high-resolution satellite data for your property',
    icon: Eye,
    duration: 2000
  },
  {
    id: 'detection',
    title: 'AI Roof Detection',
    description: 'Identifying roof sections and analyzing structure',
    icon: Zap,
    duration: 3000
  },
  {
    id: 'measurement',
    title: 'Measuring Roof Areas',
    description: 'Calculating precise measurements and complexity factors',
    icon: Calculator,
    duration: 2500
  },
  {
    id: 'complete',
    title: 'Analysis Complete',
    description: 'Your roof measurement is ready',
    icon: CheckCircle,
    duration: 500
  }
]

export function AnalyzeProgress({ onComplete, onError, measurementData }: AnalyzeProgressProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let progressInterval: NodeJS.Timeout

    const runStep = (stepIndex: number) => {
      if (stepIndex >= PROGRESS_STEPS.length) {
        performActualMeasurement()
        return
      }

      const step = PROGRESS_STEPS[stepIndex]
      const baseProgress = (stepIndex / PROGRESS_STEPS.length) * 100
      const stepProgress = (1 / PROGRESS_STEPS.length) * 100

      setCurrentStepIndex(stepIndex)

      // Animate progress within the step
      let startTime = Date.now()
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const stepCompletion = Math.min(elapsed / step.duration, 1)
        setProgress(baseProgress + (stepCompletion * stepProgress))

        if (stepCompletion >= 1) {
          clearInterval(progressInterval)
        }
      }, 50)

      // Move to next step after duration
      timeoutId = setTimeout(() => {
        clearInterval(progressInterval)
        runStep(stepIndex + 1)
      }, step.duration)
    }

    // Start the progress animation
    runStep(0)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(progressInterval)
    }
  }, [measurementData])

  const performActualMeasurement = async () => {
    try {
      const response = await fetch('/api/measure/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurementData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Measurement failed')
      }

      const result = await response.json()

      // Complete the progress
      setProgress(100)
      setIsComplete(true)
      setCurrentStepIndex(PROGRESS_STEPS.length - 1)

      // Small delay before calling onComplete
      setTimeout(() => {
        onComplete(result)
      }, 800)
    } catch (error) {
      console.error('Measurement error:', error)
      onError(error instanceof Error ? error.message : 'Analysis failed. Please try again.')
    }
  }

  const currentStep = PROGRESS_STEPS[currentStepIndex]
  const CurrentIcon = currentStep?.icon || Loader2

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Analyzing Your Roof</h2>
        <p className="text-muted-foreground">
          Our AI is examining your property to create precise measurements
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="relative">
              <CurrentIcon
                className={`h-6 w-6 ${isComplete ? 'text-green-600' : 'text-primary'} ${
                  currentStep?.id !== 'complete' && !isComplete ? 'animate-pulse' : ''
                }`}
              />
              {currentStep?.id !== 'complete' && !isComplete && (
                <Loader2 className="h-6 w-6 absolute inset-0 animate-spin text-primary/30" />
              )}
            </div>
            {currentStep?.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {Math.round(progress)}% Complete
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {currentStep?.description}
            </p>
          </div>

          {/* Step indicators */}
          <div className="grid grid-cols-4 gap-2 mt-6">
            {PROGRESS_STEPS.map((step, index) => {
              const StepIcon = step.icon
              const isActive = index === currentStepIndex
              const isCompleted = index < currentStepIndex || isComplete

              return (
                <div
                  key={step.id}
                  className={`text-center p-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary/10 border-2 border-primary'
                      : isCompleted
                      ? 'bg-green-50 border-2 border-green-200'
                      : 'bg-muted/30 border-2 border-transparent'
                  }`}
                >
                  <StepIcon
                    className={`h-5 w-5 mx-auto mb-2 ${
                      isActive
                        ? 'text-primary'
                        : isCompleted
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                    }`}
                  />
                  <p
                    className={`text-xs font-medium ${
                      isActive
                        ? 'text-primary'
                        : isCompleted
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {step.title.replace(/^(AI |Analyzing |Measuring |Analysis )/, '')}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground max-w-2xl mx-auto">
        <p>
          This process typically takes 10-15 seconds. We're using advanced computer vision
          to identify your roof sections and measure them precisely.
        </p>
      </div>
    </div>
  )
}