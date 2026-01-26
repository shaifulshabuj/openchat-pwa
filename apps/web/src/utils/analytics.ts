type AnalyticsEvent = {
  name: string
  properties?: Record<string, string | number | boolean>
}

const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT

const send = (payload: Record<string, unknown>) => {
  if (!endpoint || typeof window === 'undefined' || !navigator.sendBeacon) {
    return
  }

  const data = JSON.stringify(payload)
  navigator.sendBeacon(endpoint, data)
}

export const trackEvent = ({ name, properties }: AnalyticsEvent) => {
  send({
    type: 'event',
    name,
    properties,
    timestamp: new Date().toISOString()
  })
}

export const trackPerformance = () => {
  if (typeof window === 'undefined' || !window.performance) {
    return
  }

  const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  if (!navigation) {
    return
  }

  send({
    type: 'performance',
    metrics: {
      ttfb: Math.round(navigation.responseStart),
      domInteractive: Math.round(navigation.domInteractive),
      domComplete: Math.round(navigation.domComplete),
      loadEventEnd: Math.round(navigation.loadEventEnd)
    },
    timestamp: new Date().toISOString()
  })
}
