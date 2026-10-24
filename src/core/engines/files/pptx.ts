import { strToU8, zipSync } from 'fflate'

import { xmlEscape } from './docx'

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const EMU_PER_POINT = 12700
const EMPTY_TREE =
  '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'

export interface SlideImage {
  bytes: Uint8Array
  format: 'jpg' | 'png'
  /** Page size in points; the picture is fitted and centred on the slide. */
  width: number
  height: number
}

function relationships(entries: [string, string, string][]): string {
  return `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${entries
    .map(([id, type, target]) => `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`)
    .join('')}</Relationships>`
}

const THEME = `${XML_HEAD}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`

/** One picture per slide, sized from the first page, as an editable PowerPoint deck. */
export function imagesToPptx(images: SlideImage[], title = 'Presentation', now = new Date()): Uint8Array {
  if (!images.length) throw new Error('Nothing to put on slides')
  const clamp = (value: number) => Math.min(51206400, Math.max(914400, Math.round(value)))
  const cx = clamp(images[0].width * EMU_PER_POINT)
  const cy = clamp(images[0].height * EMU_PER_POINT)
  const files: Record<string, Uint8Array> = {}

  images.forEach((image, index) => {
    const number = index + 1
    const ext = image.format === 'png' ? 'png' : 'jpeg'
    const ratio = Math.min(cx / (image.width * EMU_PER_POINT), cy / (image.height * EMU_PER_POINT))
    const w = Math.round(image.width * EMU_PER_POINT * ratio)
    const h = Math.round(image.height * EMU_PER_POINT * ratio)
    const x = Math.round((cx - w) / 2)
    const y = Math.round((cy - h) / 2)
    files[`ppt/media/image${number}.${ext}`] = image.bytes
    files[`ppt/slides/slide${number}.xml`] = strToU8(
      `${XML_HEAD}<p:sld ${NS}><p:cSld><p:spTree>${EMPTY_TREE}<p:pic><p:nvPicPr><p:cNvPr id="2" name="Page ${number}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
    )
    files[`ppt/slides/_rels/slide${number}.xml.rels`] = strToU8(
      relationships([
        ['rId1', `${REL}/slideLayout`, '../slideLayouts/slideLayout1.xml'],
        ['rId2', `${REL}/image`, `../media/image${number}.${ext}`],
      ]),
    )
  })

  const slideIds = images.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 3}"/>`).join('')
  files['ppt/presentation.xml'] = strToU8(
    `${XML_HEAD}<p:presentation ${NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="${cx}" cy="${cy}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
  )
  files['ppt/_rels/presentation.xml.rels'] = strToU8(
    relationships([
      ['rId1', `${REL}/slideMaster`, 'slideMasters/slideMaster1.xml'],
      ['rId2', `${REL}/theme`, 'theme/theme1.xml'],
      ...images.map((_, index): [string, string, string] => [`rId${index + 3}`, `${REL}/slide`, `slides/slide${index + 1}.xml`]),
    ]),
  )
  files['ppt/slideMasters/slideMaster1.xml'] = strToU8(
    `${XML_HEAD}<p:sldMaster ${NS}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${EMPTY_TREE}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`,
  )
  files['ppt/slideMasters/_rels/slideMaster1.xml.rels'] = strToU8(
    relationships([
      ['rId1', `${REL}/slideLayout`, '../slideLayouts/slideLayout1.xml'],
      ['rId2', `${REL}/theme`, '../theme/theme1.xml'],
    ]),
  )
  files['ppt/slideLayouts/slideLayout1.xml'] = strToU8(
    `${XML_HEAD}<p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${EMPTY_TREE}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
  )
  files['ppt/slideLayouts/_rels/slideLayout1.xml.rels'] = strToU8(relationships([['rId1', `${REL}/slideMaster`, '../slideMasters/slideMaster1.xml']]))
  files['ppt/theme/theme1.xml'] = strToU8(THEME)

  const stamp = now.toISOString().replace(/\.\d{3}Z$/, 'Z')
  files['docProps/core.xml'] = strToU8(
    `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(title)}</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified></cp:coreProperties>`,
  )
  files['docProps/app.xml'] = strToU8(
    `${XML_HEAD}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Browser Toolbox</Application><Slides>${images.length}</Slides></Properties>`,
  )
  files['_rels/.rels'] = strToU8(
    relationships([
      ['rId1', `${REL}/officeDocument`, 'ppt/presentation.xml'],
      ['rId2', 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', 'docProps/core.xml'],
      ['rId3', `${REL}/extended-properties`, 'docProps/app.xml'],
    ]),
  )
  files['[Content_Types].xml'] = strToU8(
    `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${images
      .map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)
      .join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
  )
  return zipSync(files, { level: 6 })
}
