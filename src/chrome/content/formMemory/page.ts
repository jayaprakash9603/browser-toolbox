import { runFormMemoryPage } from './run'
import { pageScope } from './scope'

// Injected before every action, so the background always calls this build's runner.
pageScope().__tbxFormMemoryRun = runFormMemoryPage
