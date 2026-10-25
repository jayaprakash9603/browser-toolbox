import type { CSSProperties } from 'react'
import {
  ApertureIcon,
  BlendIcon,
  Columns3Icon,
  HexagonIcon,
  LayersIcon,
  LayoutGridIcon,
  Move3dIcon,
  PlayIcon,
  SparklesIcon,
  SquareDashedIcon,
  SquareRoundCornerIcon,
  TypeIcon,
  type LucideIcon,
} from 'lucide-react'

import {
  AnimationEditor,
  BorderEditor,
  ClipPathEditor,
  FilterEditor,
  FlexEditor,
  GlassEditor,
  GradientEditor,
  GridEditor,
  RadiusEditor,
  ShadowEditor,
  TextShadowEditor,
  TransformEditor,
  type Editor,
} from './editors'
import {
  animationDefaults,
  animationPresets,
  borderDefaults,
  borderPresets,
  buildAnimation,
  buildBorder,
  buildClipPath,
  buildFilter,
  buildFlex,
  buildGlass,
  buildGradient,
  buildGrid,
  buildRadius,
  buildShadow,
  buildTextShadow,
  buildTransform,
  clipPathDefaults,
  clipPathPresets,
  clipPathValue,
  colorWithOpacity,
  filterDefaults,
  filterPresets,
  filterValue,
  flexDefaults,
  flexPresets,
  glassDefaults,
  glassPresets,
  gradientDefaults,
  gradientPresets,
  gradientValue,
  gridDefaults,
  gridPresets,
  radiusDefaults,
  radiusPresets,
  shadowDefaults,
  shadowPresets,
  textShadowDefaults,
  textShadowPresets,
  transformDefaults,
  transformPresets,
  type CssResult,
  type GeneratorId,
  type Preset,
} from './generators'

export const GROUPS = ['backgrounds', 'effects', 'shapes', 'motion', 'layout'] as const
export type GroupId = (typeof GROUPS)[number]

export interface GeneratorDef<S = unknown> {
  id: GeneratorId
  group: GroupId
  icon: LucideIcon
  defaults: S
  presets: Preset<S>[]
  build: (state: S) => CssResult
  Editor: Editor<S>
  /** Small visual for a preset chip. */
  swatch?: (state: S) => CSSProperties
}

const SAMPLE = 'linear-gradient(135deg, #6366f1, #ec4899)'

function define<S>(def: GeneratorDef<S>): GeneratorDef {
  return def as unknown as GeneratorDef
}

export const GENERATORS: GeneratorDef[] = [
  define({
    id: 'gradient',
    group: 'backgrounds',
    icon: BlendIcon,
    defaults: gradientDefaults,
    presets: gradientPresets,
    build: buildGradient,
    Editor: GradientEditor,
    swatch: (s) => ({ background: gradientValue(s) }),
  }),
  define({
    id: 'glass',
    group: 'backgrounds',
    icon: SparklesIcon,
    defaults: glassDefaults,
    presets: glassPresets,
    build: buildGlass,
    Editor: GlassEditor,
    swatch: (s) => ({ background: `linear-gradient(${colorWithOpacity(s.tint, s.tintOpacity + 30)}, ${colorWithOpacity(s.tint, s.tintOpacity)}), ${SAMPLE}` }),
  }),
  define({ id: 'shadow', group: 'effects', icon: LayersIcon, defaults: shadowDefaults, presets: shadowPresets, build: buildShadow, Editor: ShadowEditor }),
  define({
    id: 'text-shadow',
    group: 'effects',
    icon: TypeIcon,
    defaults: textShadowDefaults,
    presets: textShadowPresets,
    build: buildTextShadow,
    Editor: TextShadowEditor,
  }),
  define({
    id: 'filter',
    group: 'effects',
    icon: ApertureIcon,
    defaults: filterDefaults,
    presets: filterPresets,
    build: buildFilter,
    Editor: FilterEditor,
    swatch: (s) => ({ background: 'linear-gradient(180deg, #38bdf8, #f9a8d4 60%, #16a34a 60%)', filter: filterValue({ ...s, blur: Math.min(s.blur, 1) }) }),
  }),
  define({
    id: 'radius',
    group: 'shapes',
    icon: SquareRoundCornerIcon,
    defaults: radiusDefaults,
    presets: radiusPresets,
    build: buildRadius,
    Editor: RadiusEditor,
    swatch: (s) => {
      const scale = (n: number) => (s.unit === '%' ? `${n}%` : `${Math.min(n / 4, 8)}px`)
      return { background: SAMPLE, borderRadius: `${scale(s.tl)} ${scale(s.tr)} ${scale(s.br)} ${scale(s.bl)}` }
    },
  }),
  define({
    id: 'border',
    group: 'shapes',
    icon: SquareDashedIcon,
    defaults: borderDefaults,
    presets: borderPresets,
    build: buildBorder,
    Editor: BorderEditor,
    swatch: (s) => ({ border: `${Math.min(Math.max(s.width, 1), 3)}px ${s.style === 'double' ? 'double' : s.style === 'dotted' || s.style === 'dashed' ? s.style : 'solid'} ${s.color}`, borderRadius: Math.min(s.radius, 4) }),
  }),
  define({
    id: 'clip-path',
    group: 'shapes',
    icon: HexagonIcon,
    defaults: clipPathDefaults,
    presets: clipPathPresets,
    build: buildClipPath,
    Editor: ClipPathEditor,
    swatch: (s) => ({ background: SAMPLE, clipPath: clipPathValue(s) }),
  }),
  define({
    id: 'transform',
    group: 'motion',
    icon: Move3dIcon,
    defaults: transformDefaults,
    presets: transformPresets,
    build: buildTransform,
    Editor: TransformEditor,
  }),
  define({
    id: 'animation',
    group: 'motion',
    icon: PlayIcon,
    defaults: animationDefaults,
    presets: animationPresets,
    build: buildAnimation,
    Editor: AnimationEditor,
  }),
  define({ id: 'flexbox', group: 'layout', icon: Columns3Icon, defaults: flexDefaults, presets: flexPresets, build: buildFlex, Editor: FlexEditor }),
  define({ id: 'grid', group: 'layout', icon: LayoutGridIcon, defaults: gridDefaults, presets: gridPresets, build: buildGrid, Editor: GridEditor }),
]

export const GENERATOR_BY_ID = Object.fromEntries(GENERATORS.map((g) => [g.id, g])) as Record<GeneratorId, GeneratorDef>
