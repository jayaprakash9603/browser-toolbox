import { describe, expect, it } from 'vitest'

import { toolRegistry } from '@/core/registry'
import { SECTIONS, getSectionForTool, isPrimaryTool } from '@/core/registry/sections'
import {
  getPrimaryTools,
  getPrimaryToolsForUserCategory,
  resolveUserCategoryId,
} from '@/core/registry/userCategories'
import { WORKSPACES, getWorkspace, getWorkspaceForTool } from '@/core/registry/workspaces'
import { registerModules } from '@/modules'

registerModules()

describe('workspaces', () => {
  it('only reference registered tools and include their host as a view', () => {
    for (const workspace of WORKSPACES) {
      expect(toolRegistry.get(workspace.id), workspace.id).toBeDefined()
      expect(workspace.views.some((view) => view.toolId === workspace.id), workspace.id).toBe(true)
      for (const view of workspace.views) expect(toolRegistry.get(view.toolId), view.toolId).toBeDefined()
    }
  })

  it('never place a tool in two workspaces', () => {
    const members = WORKSPACES.flatMap((workspace) => workspace.views.map((view) => view.toolId))
    expect(new Set(members).size).toBe(members.length)
  })

  it('resolve legacy sub-tools to their workspace', () => {
    expect(getWorkspaceForTool('qa.xpath-tester')?.id).toBe('qa.selector-studio')
    expect(getWorkspaceForTool('browser.speed-test')?.id).toBe('browser.internet-monitor')
    expect(getWorkspaceForTool('storage.inspector')?.id).toBe('browser.toolkit')
    expect(getWorkspaceForTool('text.analyzer')?.id).toBe('text.studio')
    expect(getWorkspaceForTool('developer.id-toolkit')?.id).toBe('developer.formatter-studio')
    expect(getWorkspaceForTool('productivity.timer')?.id).toBe('datetime.toolkit')
    expect(getWorkspaceForTool('design.palette-generator')).toBeUndefined()
    expect(getWorkspace('text.studio')?.views.length).toBe(8)
  })
})

describe('sections', () => {
  it('list every primary tool exactly once', () => {
    const listed = SECTIONS.flatMap((section) => section.toolIds)
    expect(new Set(listed).size).toBe(listed.length)
    const primary = toolRegistry.getAll().filter(isPrimaryTool).map((tool) => tool.id)
    expect([...listed].sort()).toEqual([...primary].sort())
  })

  it('end at 49 primary tools across five sections', () => {
    expect(SECTIONS).toHaveLength(5)
    expect(getPrimaryTools()).toHaveLength(49)
    for (const section of SECTIONS) {
      expect(getPrimaryToolsForUserCategory(section.id).length).toBeGreaterThan(0)
    }
  })

  it('map old category ids onto sections', () => {
    expect(resolveUserCategoryId('text')).toBe('develop-qa')
    expect(resolveUserCategoryId('privacy')).toBe('web-security')
    expect(resolveUserCategoryId('files-media')).toBe('files-media')
    expect(resolveUserCategoryId('nope')).toBeUndefined()
    expect(getSectionForTool('text.analyzer')).toBeUndefined()
  })
})

describe('removals and renames', () => {
  it('no longer register Calculator, HTTP Status Codes or 2FA Authenticator', () => {
    for (const id of ['calculators.calculator', 'qa.http-status', 'security.totp']) {
      expect(toolRegistry.get(id), id).toBeUndefined()
    }
  })

  it('renames tools but keeps ids and the old names searchable', () => {
    expect(toolRegistry.get('sites.whatsapp')?.name).toBe('WhatsApp')
    expect(toolRegistry.get('productivity.tasks')?.name).toBe('To Do')
    expect(toolRegistry.get('screenshots.capture')?.name).toBe('Page Capture')
    expect(toolRegistry.search('chatboost')[0]?.id).toBe('sites.whatsapp')
    expect(toolRegistry.search('tasks').map((tool) => tool.id)).toContain('productivity.tasks')
    expect(toolRegistry.search('capture toolkit')[0]?.id).toBe('screenshots.capture')
  })
})
