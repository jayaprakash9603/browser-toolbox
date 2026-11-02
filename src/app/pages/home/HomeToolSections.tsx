import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CommandIcon,
  LayersIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import { getHomeWorkbenchGroups } from '@/app/pages/home/homeConfig'
import { useInViewport, usePageVisible } from '@/app/pages/home/useDemoCycle'
import { Link } from '@/app/router'
import type { ToolDefinition } from '@/core/registry'
import { useToolLabels } from '@/shared/hooks/useToolLabels'

import './home-tool-sections.css'

type WorkbenchGroup = ReturnType<typeof getHomeWorkbenchGroups>[number]

export function HomeToolSections() {
  const { t } = useTranslation()
  const groups = getHomeWorkbenchGroups()
  const total = groups.reduce((count, group) => count + group.tools.length, 0)

  return (
    <div id="all-tools" className="home-workbenches mb-[var(--density-section-gap)] scroll-mt-4">
      {groups.map((group) => (
        <HomeWorkbench key={group.id} group={group} />
      ))}
      <Link to="/tools" className="home-library-link">
        {t('home.browseAllTools', { count: total })}
        <ArrowRightIcon className="size-4" aria-hidden />
      </Link>
    </div>
  )
}

function HomeWorkbench({ group }: { group: WorkbenchGroup }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLElement>(null)
  const inViewport = useInViewport(ref)
  const reduce = useReducedMotion()
  const pageVisible = usePageVisible()
  const [deckOpen, setDeckOpen] = useState(true)
  const isDesign = group.id === 'design-accessibility'
  const Icon = group.icon
  const name = t(`home.workbenches.${group.id}.name`, {
    defaultValue: t(`categories.${group.id}.name`, { defaultValue: group.name }),
  })
  const description = t(`home.workbenches.${group.id}.description`, {
    defaultValue: t(`categories.${group.id}.description`, { defaultValue: group.description }),
  })
  const headingId = `home-suite-${group.id}`
  const tools = [...group.tools, ...group.shortcuts]

  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      className="home-tool-suite"
      data-suite={group.id}
      data-motion={inViewport && pageVisible && !reduce ? 'active' : 'off'}
      data-deck={deckOpen ? 'open' : 'closed'}
    >
      <header className="home-suite-heading">
        <span className="home-suite-emblem">
          <Icon aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 id={headingId} className="text-[13px] font-semibold leading-5">
              {name}
            </h2>
            <span className="home-suite-count">{t('home.toolCount', { count: tools.length })}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </header>

      <div className="home-suite-stage">
        <WorkbenchVisual id={group.id} />
        {isDesign && (
          <button
            type="button"
            className="home-deck-toggle"
            aria-expanded={deckOpen}
            aria-controls={`${headingId}-tools`}
            onClick={() => setDeckOpen((open) => !open)}
          >
            <LayersIcon className="size-4" aria-hidden />
            {deckOpen
              ? t('home.workbenches.stackCards')
              : t('home.workbenches.spreadCards', { count: tools.length })}
          </button>
        )}
        <motion.ul
          id={`${headingId}-tools`}
          className="home-suite-tools"
          inert={isDesign && !deckOpen}
          aria-hidden={isDesign && !deckOpen ? true : undefined}
          initial={false}
          animate={
            isDesign ? { height: deckOpen ? 'auto' : 0, opacity: deckOpen ? 1 : 0 } : undefined
          }
          transition={{ duration: reduce ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={isDesign ? { overflow: 'clip' } : undefined}
        >
          {tools.map((tool, index) => (
            <li
              key={tool.id}
              className="home-suite-item"
              data-tool={tool.id}
              style={{ '--tool-order': index } as CSSProperties}
            >
              <WorkbenchTool tool={tool} index={index} />
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}

function WorkbenchTool({ tool, index }: { tool: ToolDefinition; index: number }) {
  const { name, description } = useToolLabels(tool)
  const Icon = tool.icon

  return (
    <Link to={tool.route} title={description} className="home-suite-link">
      <span className="home-tool-art" aria-hidden>
        <span className="home-tool-halo" />
        <Icon className="home-tool-glyph" />
      </span>
      <span className="home-tool-name">{name}</span>
      <span className="home-tool-index" aria-hidden>
        {String(index + 1).padStart(2, '0')}
      </span>
      <ArrowUpRightIcon className="home-tool-arrow" aria-hidden />
    </Link>
  )
}

function WorkbenchVisual({ id }: { id: string }) {
  switch (id) {
    case 'develop-qa':
      return (
        <div className="home-code-console" aria-hidden>
          <div className="home-console-bar">
            <span className="home-window-dots">
              <i />
              <i />
              <i />
            </span>
            <span>onepanel.dev</span>
            <CommandIcon className="ml-auto size-3" />
          </div>
          <div className="home-console-body">
            <span className="home-console-line">01</span>
            <span className="home-terminal-command">$ onepanel --tools</span>
            <span className="home-console-line">02</span>
            <span>
              <b>const</b> workspace = {'{'}
              <br />
              &nbsp; format, inspect, test
              <br />
              {'}'};
            </span>
            <span className="home-console-line">03</span>
            <span className="home-terminal-cursor">&gt; _</span>
          </div>
        </div>
      )
    case 'design-accessibility':
      return (
        <div className="home-design-ribbon" aria-hidden>
          <span className="home-type-specimen">
            Aa<span>0123</span>
          </span>
          <div className="home-swatch-fan">
            {['#7C3AED', '#A855F7', '#EC4899', '#14B8A6', '#3B82F6'].map((color, index) => (
              <span
                key={color}
                style={{ background: color, '--swatch-order': index } as CSSProperties}
              />
            ))}
          </div>
          <span className="home-design-crosshair">+</span>
        </div>
      )
    case 'web-security':
      return (
        <div className="home-network-visual" aria-hidden>
          <div className="home-radar">
            <span className="home-radar-sweep" />
            <ShieldCheckIcon />
          </div>
          <div className="home-network-lines">
            <i />
            <i />
            <i />
          </div>
          <span className="home-network-code">
            https://
            <br />
            <b>localhost</b>
            <br />
            {'{ }'}
          </span>
        </div>
      )
    case 'productivity':
      return (
        <div className="home-planner-ruler" aria-hidden>
          <b className="home-planner-progress" />
          {Array.from({ length: 14 }, (_, index) => (
            <i key={index} />
          ))}
          <span>
            <i />
            <i />
            <i />
          </span>
        </div>
      )
    case 'browser':
      return (
        <div className="home-browser-chrome" aria-hidden>
          <div className="home-browser-tabs">
            <i />
            <i />
            <i />
            <span>+</span>
          </div>
          <div className="home-browser-address">
            <span>&lt; &gt;</span>
            <span>onepanel://workspace</span>
            <i />
          </div>
          <span className="home-browser-loading" />
        </div>
      )
    case 'social':
      return (
        <div className="home-social-wave" aria-hidden>
          {Array.from({ length: 25 }, (_, index) => (
            <i
              key={index}
              style={
                {
                  '--wave-height': `${8 + ((index * 17) % 29)}px`,
                  '--wave-order': index,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )
    case 'files-media':
      return (
        <div className="home-file-path" aria-hidden>
          <span>~/onepanel</span>
          <span>/</span>
          <b>assets</b>
          <span>/</span>
          <span>_</span>
          <span className="home-file-path-dots">
            <i />
            <i />
            <i />
          </span>
        </div>
      )
    default:
      return null
  }
}
