export const speedtestStrings = {
  'tools.browser.speed-test.name': 'Speed Test',
  'tools.browser.speed-test.description':
    'Measure your download and upload speed, ping and jitter with an animated gauge and history.',

  'speedtest.go': 'GO',
  'speedtest.start': 'Start speed test',
  'speedtest.again': 'Run again',
  'speedtest.cancel': 'Cancel',
  'speedtest.unit': 'Mbps',
  'speedtest.ms': 'ms',

  'speedtest.phase.idle': 'Ready',
  'speedtest.phase.latency': 'Measuring ping',
  'speedtest.phase.download': 'Testing download',
  'speedtest.phase.upload': 'Testing upload',
  'speedtest.phase.done': 'Test complete',
  'speedtest.phase.error': 'Test failed',

  'speedtest.step.ping': 'Ping',
  'speedtest.step.download': 'Download',
  'speedtest.step.upload': 'Upload',

  'speedtest.metric.ping': 'Ping',
  'speedtest.metric.jitter': 'Jitter',
  'speedtest.metric.download': 'Download',
  'speedtest.metric.upload': 'Upload',

  'speedtest.server.label': 'Server',
  'speedtest.server.provider': 'Provider',
  'speedtest.server.ip': 'Your IP',
  'speedtest.server.cloudflare': 'Cloudflare',
  'speedtest.server.pending': 'Nearest edge',
  'speedtest.server.looking': 'Looking up…',

  'speedtest.location.label': 'Location',
  'speedtest.location.approx': '{{place}} (approx.)',
  'speedtest.location.approxTitle': 'Estimated from your IP address. Allow location for a precise result.',
  'speedtest.location.use': 'Use precise',
  'speedtest.location.retry': 'Retry',
  'speedtest.location.useTitle': 'Ask the browser for your device location',
  'speedtest.location.preciseTitle': 'Device location {{coords}} (±{{accuracy}} m)',
  'speedtest.location.denied': 'Location access is blocked. Showing an estimate from your IP address.',
  'speedtest.location.unavailable': 'Could not get your device location.',

  'speedtest.rating.slow': 'Slow — basic browsing only',
  'speedtest.rating.ok': 'OK — fine for HD video',
  'speedtest.rating.good': 'Good — 4K streaming and calls',
  'speedtest.rating.great': 'Great — handles anything',

  'speedtest.chart.title': 'Throughput',
  'speedtest.chart.description': 'Live speed over the test, in Mbps',
  'speedtest.chart.label': 'Download and upload throughput chart',
  'speedtest.chart.empty': 'Start a test to see download and upload speed over time.',
  'speedtest.chart.seconds': '{{value}} s',

  'speedtest.history.title': 'History',
  'speedtest.history.description': 'Your last 30 results, stored on this device',
  'speedtest.history.empty': 'No tests yet. Results appear here after each run.',
  'speedtest.history.clear': 'Clear',
  'speedtest.history.clearTitle': 'Clear speed test history?',
  'speedtest.history.clearBody': 'This removes all saved results. It cannot be undone.',
  'speedtest.history.when': 'When',

  'speedtest.error.body': 'Check your connection and try again. Firewalls or VPNs can block speed.cloudflare.com.',
  'speedtest.note':
    'Runs against Cloudflare’s nearest server using several parallel connections, and skips the first 2 seconds of each phase so connection ramp-up doesn’t lower the result. A test can use a few hundred MB on fast connections.',

  'speedtest.monitor.title': 'Speed test',
  'speedtest.monitor.description': 'Download, upload and ping in about 20 s',
  'speedtest.monitor.last': 'Last test {{when}}',
  'speedtest.monitor.never': 'No tests run yet',
  'speedtest.monitor.run': 'Run speed test',
  'speedtest.popover.open': 'Speed test',
  'speedtest.popover.last': 'Last speed test',
} as const
