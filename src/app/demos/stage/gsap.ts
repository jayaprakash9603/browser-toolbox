import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { Physics2DPlugin } from 'gsap/Physics2DPlugin'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { TextPlugin } from 'gsap/TextPlugin'

gsap.registerPlugin(useGSAP, DrawSVGPlugin, MotionPathPlugin, Physics2DPlugin, ScrambleTextPlugin, TextPlugin)
gsap.defaults({ ease: 'expo.out', duration: 0.9 })

export const MOTION_QUERIES = {
  motion: '(prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
} as const

export { gsap, useGSAP }
