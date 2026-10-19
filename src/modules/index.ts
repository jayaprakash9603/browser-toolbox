import { categoryRegistry, toolRegistry } from '@/core/registry'
import { CATEGORIES } from '@/core/registry/categories'
import { clipboardTools } from './clipboard/registry'
import { textTools } from './text/registry'
import { developerTools } from './developer/registry'
import { qaTools } from './qa/registry'
import { apiTools } from './api/registry'
import { webTools } from './web/registry'
import { dataTools } from './data/registry'
import { securityTools } from './security/registry'
import { designTools } from './design/registry'
import { screenshotsTools } from './screenshots/registry'
import { calculatorsTools } from './calculators/registry'
import { datetimeTools } from './datetime/registry'
import { generatorsTools } from './generators/registry'
import { imageTools } from './image/registry'
import { seoTools } from './seo/registry'
import { productivityTools } from './productivity/registry'
import { browserTools } from './browser/registry'
import { storageTools } from './storage/registry'
import { accessibilityTools } from './accessibility/registry'
import { filesTools } from './files/registry'
import { privacyTools } from './privacy/registry'

let initialized = false

export function registerModules() {
  if (initialized) return
  initialized = true
  categoryRegistry.registerAll(CATEGORIES)
  toolRegistry.registerAll(clipboardTools)
  toolRegistry.registerAll(textTools)
  toolRegistry.registerAll(developerTools)
  toolRegistry.registerAll(qaTools)
  toolRegistry.registerAll(apiTools)
  toolRegistry.registerAll(webTools)
  toolRegistry.registerAll(dataTools)
  toolRegistry.registerAll(securityTools)
  toolRegistry.registerAll(privacyTools)
  toolRegistry.registerAll(designTools)
  toolRegistry.registerAll(screenshotsTools)
  toolRegistry.registerAll(calculatorsTools)
  toolRegistry.registerAll(datetimeTools)
  toolRegistry.registerAll(generatorsTools)
  toolRegistry.registerAll(imageTools)
  toolRegistry.registerAll(seoTools)
  toolRegistry.registerAll(productivityTools)
  toolRegistry.registerAll(browserTools)
  toolRegistry.registerAll(storageTools)
  toolRegistry.registerAll(accessibilityTools)
  toolRegistry.registerAll(filesTools)
}
