/**
 * dsh-design-studio — a dependency-free PPTX writer.
 *
 * PowerPoint files are OOXML packages (ZIP + XML). This module builds the
 * smallest package PowerPoint and Keynote accept: content types, package rels,
 * a 16:9 presentation, one slide master, one blank layout, one theme, one slide
 * per exported screenshot and one media part per slide. Every PNG is placed
 * full-bleed on the 12192000×6858000 EMU canvas so a 1920×1080 deck screenshot
 * fills the slide exactly (CONTRACT §3).
 *
 * The archive is produced through `lib/zip.js`, so the writer inherits its
 * deterministic timestamps and unsafe-name rejection. No third-party imports.
 *
 * Public API (CONTRACT §3): createPptx({slides:[{png,width,height}], title}) -> Buffer.
 */

import { createZip } from './zip.js'

/** Slide canvas width in EMU (16:9). */
const SLIDE_CX = 12192000
/** Slide canvas height in EMU (16:9). */
const SLIDE_CY = 6858000
/** Notes canvas in EMU. */
const NOTES_CX = 6858000
/** Notes canvas height in EMU. */
const NOTES_CY = 9144000

/** Namespace URIs. */
const NS = Object.freeze({
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  p: 'http://schemas.openxmlformats.org/presentationml/2006/main',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types',
  cp: 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
  dc: 'http://purl.org/dc/elements/1.1/',
  dcterms: 'http://purl.org/dc/terms/',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
  ep: 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties',
})

/** OOXML content types used by this package. */
const CONTENT_TYPE = Object.freeze({
  presentation: 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml',
  slide: 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml',
  slideMaster: 'application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml',
  slideLayout: 'application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml',
  theme: 'application/vnd.openxmlformats-officedocument.theme+xml',
  core: 'application/vnd.openxmlformats-package.core-properties+xml',
  extended: 'application/vnd.openxmlformats-officedocument.extended-properties+xml',
})

/** Relationship types used by this package. */
const REL = Object.freeze({
  officeDocument: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
  core: 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties',
  extended: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties',
  slideMaster: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster',
  slide: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide',
  slideLayout: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout',
  theme: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme',
  image: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
})

/** XML prolog shared by every part. */
const PROLOG = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

/** The empty group shape tree used by masters and layouts. */
const EMPTY_TREE =
  '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
  '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree>'

/** Build a typed error. */
function fail(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

/** Escape text for XML text/attribute contexts. */
function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&apos;')
}

/** Coerce a slide PNG into a Buffer (accepts base64 strings defensively). */
function pngBufferOf(value, index) {
  if (Buffer.isBuffer(value)) {
    if (value.length === 0) throw fail('invalid_input', 'slide ' + (index + 1) + ' has an empty PNG')
    return value
  }
  if (value instanceof Uint8Array) {
    if (value.byteLength === 0) throw fail('invalid_input', 'slide ' + (index + 1) + ' has an empty PNG')
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  }
  if (typeof value === 'string' && value.length > 0) {
    const decoded = Buffer.from(value, 'base64')
    if (decoded.length === 0) throw fail('invalid_input', 'slide ' + (index + 1) + ' is not a valid PNG payload')
    return decoded
  }
  throw fail('invalid_input', 'slide ' + (index + 1) + ' has no PNG data')
}

/** The `[Content_Types].xml` part. */
function contentTypesXml(slideCount) {
  const overrides = [
    '<Override PartName="/ppt/presentation.xml" ContentType="' + CONTENT_TYPE.presentation + '"/>',
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="' + CONTENT_TYPE.slideMaster + '"/>',
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="' + CONTENT_TYPE.slideLayout + '"/>',
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="' + CONTENT_TYPE.theme + '"/>',
    '<Override PartName="/docProps/core.xml" ContentType="' + CONTENT_TYPE.core + '"/>',
    '<Override PartName="/docProps/app.xml" ContentType="' + CONTENT_TYPE.extended + '"/>',
  ]
  for (let index = 1; index <= slideCount; index += 1) {
    overrides.push('<Override PartName="/ppt/slides/slide' + index + '.xml" ContentType="' + CONTENT_TYPE.slide + '"/>')
  }
  return (
    PROLOG +
    '<Types xmlns="' + NS.ct + '">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Default Extension="png" ContentType="image/png"/>' +
    overrides.join('') +
    '</Types>'
  )
}

/** The package `_rels/.rels` part. */
function packageRelsXml() {
  return (
    PROLOG +
    '<Relationships xmlns="' + NS.rel + '">' +
    '<Relationship Id="rId1" Type="' + REL.officeDocument + '" Target="ppt/presentation.xml"/>' +
    '<Relationship Id="rId2" Type="' + REL.core + '" Target="docProps/core.xml"/>' +
    '<Relationship Id="rId3" Type="' + REL.extended + '" Target="docProps/app.xml"/>' +
    '</Relationships>'
  )
}

/** The `docProps/core.xml` part. */
function coreXml(title) {
  return (
    PROLOG +
    '<cp:coreProperties xmlns:cp="' + NS.cp + '" xmlns:dc="' + NS.dc + '" xmlns:dcterms="' + NS.dcterms + '" xmlns:xsi="' + NS.xsi + '">' +
    '<dc:title>' + xmlEscape(title) + '</dc:title>' +
    '<dc:creator>dsh-design-studio</dc:creator>' +
    '<cp:lastModifiedBy>dsh-design-studio</cp:lastModifiedBy>' +
    '</cp:coreProperties>'
  )
}

/** The `docProps/app.xml` part. */
function appXml(slideCount) {
  return (
    PROLOG +
    '<Properties xmlns="' + NS.ep + '">' +
    '<Application>dsh-design-studio</Application>' +
    '<Slides>' + slideCount + '</Slides>' +
    '</Properties>'
  )
}

/** The `ppt/presentation.xml` part. */
function presentationXml(slideCount) {
  const slideIds = []
  for (let index = 1; index <= slideCount; index += 1) {
    slideIds.push('<p:sldId id="' + (256 + index - 1) + '" r:id="rId' + (index + 1) + '"/>')
  }
  return (
    PROLOG +
    '<p:presentation xmlns:a="' + NS.a + '" xmlns:r="' + NS.r + '" xmlns:p="' + NS.p + '" saveSubsetFonts="1">' +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    '<p:sldIdLst>' + slideIds.join('') + '</p:sldIdLst>' +
    '<p:sldSz cx="' + SLIDE_CX + '" cy="' + SLIDE_CY + '" type="screen16x9"/>' +
    '<p:notesSz cx="' + NOTES_CX + '" cy="' + NOTES_CY + '"/>' +
    '</p:presentation>'
  )
}

/** The `ppt/_rels/presentation.xml.rels` part. */
function presentationRelsXml(slideCount) {
  const rows = ['<Relationship Id="rId1" Type="' + REL.slideMaster + '" Target="slideMasters/slideMaster1.xml"/>']
  for (let index = 1; index <= slideCount; index += 1) {
    rows.push('<Relationship Id="rId' + (index + 1) + '" Type="' + REL.slide + '" Target="slides/slide' + index + '.xml"/>')
  }
  return PROLOG + '<Relationships xmlns="' + NS.rel + '">' + rows.join('') + '</Relationships>'
}

/** The `ppt/slideMasters/slideMaster1.xml` part. */
function slideMasterXml() {
  return (
    PROLOG +
    '<p:sldMaster xmlns:a="' + NS.a + '" xmlns:r="' + NS.r + '" xmlns:p="' + NS.p + '">' +
    '<p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>' + EMPTY_TREE + '</p:cSld>' +
    '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
    '</p:sldMaster>'
  )
}

/** The `ppt/slideMasters/_rels/slideMaster1.xml.rels` part. */
function slideMasterRelsXml() {
  return (
    PROLOG +
    '<Relationships xmlns="' + NS.rel + '">' +
    '<Relationship Id="rId1" Type="' + REL.slideLayout + '" Target="../slideLayouts/slideLayout1.xml"/>' +
    '<Relationship Id="rId2" Type="' + REL.theme + '" Target="../theme/theme1.xml"/>' +
    '</Relationships>'
  )
}

/** The `ppt/slideLayouts/slideLayout1.xml` part. */
function slideLayoutXml() {
  return (
    PROLOG +
    '<p:sldLayout xmlns:a="' + NS.a + '" xmlns:r="' + NS.r + '" xmlns:p="' + NS.p + '" type="blank" preserve="1">' +
    '<p:cSld name="Blank">' + EMPTY_TREE + '</p:cSld>' +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
    '</p:sldLayout>'
  )
}

/** The `ppt/slideLayouts/_rels/slideLayout1.xml.rels` part. */
function slideLayoutRelsXml() {
  return (
    PROLOG +
    '<Relationships xmlns="' + NS.rel + '">' +
    '<Relationship Id="rId1" Type="' + REL.slideMaster + '" Target="../slideMasters/slideMaster1.xml"/>' +
    '</Relationships>'
  )
}

/** The `ppt/theme/theme1.xml` part. */
function themeXml() {
  const color = (name, value) => '<a:' + name + '><a:srgbClr val="' + value + '"/></a:' + name + '>'
  const solidFill = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'
  const line = '<a:ln w="6350" cap="flat" cmpd="sng" algn="ctr">' + solidFill + '<a:prstDash val="solid"/></a:ln>'
  return (
    PROLOG +
    '<a:theme xmlns:a="' + NS.a + '" name="Design Studio">' +
    '<a:themeElements>' +
    '<a:clrScheme name="Design Studio">' +
    color('dk1', '1A1A1A') +
    color('lt1', 'FFFFFF') +
    color('dk2', '2F3437') +
    color('lt2', 'F4EFE4') +
    color('accent1', 'A8401C') +
    color('accent2', '1D3F42') +
    color('accent3', '6B6B66') +
    color('accent4', 'C8D2CD') +
    color('accent5', 'D8D0BE') +
    color('accent6', '565A52') +
    color('hlink', 'A8401C') +
    color('folHlink', '565A52') +
    '</a:clrScheme>' +
    '<a:fontScheme name="Design Studio">' +
    '<a:majorFont><a:latin typeface="Iowan Old Style"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
    '<a:minorFont><a:latin typeface="Corbel"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>' +
    '</a:fontScheme>' +
    '<a:fmtScheme name="Design Studio">' +
    '<a:fillStyleLst>' + solidFill + solidFill + solidFill + '</a:fillStyleLst>' +
    '<a:lnStyleLst>' + line + line + line + '</a:lnStyleLst>' +
    '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
    '<a:bgFillStyleLst>' + solidFill + solidFill + solidFill + '</a:bgFillStyleLst>' +
    '</a:fmtScheme>' +
    '</a:themeElements>' +
    '<a:objectDefaults/><a:extraClrSchemeLst/>' +
    '</a:theme>'
  )
}

/** One full-bleed picture slide. */
function slideXml(index) {
  return (
    PROLOG +
    '<p:sld xmlns:a="' + NS.a + '" xmlns:r="' + NS.r + '" xmlns:p="' + NS.p + '">' +
    '<p:cSld><p:spTree>' +
    '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    '<p:pic>' +
    '<p:nvPicPr><p:cNvPr id="' + (index + 1) + '" name="Slide ' + index + '"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>' +
    '<p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>' +
    '<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + SLIDE_CX + '" cy="' + SLIDE_CY + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>' +
    '</p:pic>' +
    '</p:spTree></p:cSld>' +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
    '</p:sld>'
  )
}

/** One slide's relationships (layout + its media image). */
function slideRelsXml(index) {
  return (
    PROLOG +
    '<Relationships xmlns="' + NS.rel + '">' +
    '<Relationship Id="rId1" Type="' + REL.slideLayout + '" Target="../slideLayouts/slideLayout1.xml"/>' +
    '<Relationship Id="rId2" Type="' + REL.image + '" Target="../media/image' + index + '.png"/>' +
    '</Relationships>'
  )
}

/**
 * Build a PPTX package.
 * @param {{slides: Array<{png: Buffer|Uint8Array|string, width?: number, height?: number}>, title?: string}} input
 * @returns {Buffer}
 */
export function createPptx(input = {}) {
  const slides = Array.isArray(input.slides) ? input.slides : []
  if (slides.length === 0) throw fail('invalid_input', 'a PPTX export needs at least one slide')
  if (slides.length > 200) throw fail('too_large', 'a PPTX export is limited to 200 slides')
  const title = typeof input.title === 'string' && input.title.trim().length > 0 ? input.title.trim().slice(0, 200) : 'dsh-design-studio deck'
  const images = slides.map((slide, index) => {
    if (slide === null || typeof slide !== 'object') throw fail('invalid_input', 'slide ' + (index + 1) + ' must be an object with a png field')
    return pngBufferOf(slide.png, index)
  })

  const entries = [
    { name: '[Content_Types].xml', data: contentTypesXml(slides.length) },
    { name: '_rels/.rels', data: packageRelsXml() },
    { name: 'docProps/core.xml', data: coreXml(title) },
    { name: 'docProps/app.xml', data: appXml(slides.length) },
    { name: 'ppt/presentation.xml', data: presentationXml(slides.length) },
    { name: 'ppt/_rels/presentation.xml.rels', data: presentationRelsXml(slides.length) },
    { name: 'ppt/slideMasters/slideMaster1.xml', data: slideMasterXml() },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: slideMasterRelsXml() },
    { name: 'ppt/slideLayouts/slideLayout1.xml', data: slideLayoutXml() },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: slideLayoutRelsXml() },
    { name: 'ppt/theme/theme1.xml', data: themeXml() },
  ]
  for (let index = 1; index <= slides.length; index += 1) {
    entries.push({ name: 'ppt/slides/slide' + index + '.xml', data: slideXml(index) })
    entries.push({ name: 'ppt/slides/_rels/slide' + index + '.xml.rels', data: slideRelsXml(index) })
    entries.push({ name: 'ppt/media/image' + index + '.png', data: images[index - 1] })
  }
  return createZip(entries)
}
