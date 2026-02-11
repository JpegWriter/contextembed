# Pillar 5: Workflow Integration

## Definition

Workflow Integration refers to how ContextEmbed fits into photographers' existing tools: Lightroom, Capture One, Photo Mechanic, DAMs, and web platforms. The export formats are designed for maximum compatibility with professional workflows.

This pillar is about output formats and consumption patterns, not the internal pipeline.

---

## Implementation Locations

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Export Presets | `packages/core/src/exports/export-presets.ts` | Preset definitions |
| Export Options | `packages/core/src/exports/index.ts` | Option types |
| Export Processor | `apps/api/src/services/export-processor.ts` | Format conversion |
| Advanced Export Route | `apps/api/src/routes/exports.ts` | API endpoint |
| XMP Sidecar Writer | `packages/metadata/src/exiftool-writer.ts` | .xmp sidecar generation |

---

## Export Presets

| Preset | Format | Use Case |
|--------|--------|----------|
| `lightroom-ready` | Original + XMP sidecar | Import to Lightroom catalog |
| `web-optimized` | JPEG 85% sRGB | Website/blog upload |
| `archive-quality` | TIFF LZW | Long-term archival |
| `social-media` | JPEG 82% max 2400px | Social platform upload |
| `client-delivery` | JPEG 95% | High-quality delivery |
| `custom` | User-defined | Flexible options |

---

## Output Formats

### Embedded Metadata Formats

| Format | XMP | IPTC | EXIF | Notes |
|--------|-----|------|------|-------|
| JPEG | ✅ | ✅ | ✅ | Full support |
| TIFF | ✅ | ✅ | ✅ | Full support |
| PNG | ✅ | ❌ | ❌ | XMP only via iTXt |
| RAW | ⚠️ | ⚠️ | ✅ | Sidecar recommended |

### Sidecar Files

| File | Purpose |
|------|---------|
| `.xmp` | Adobe-compatible sidecar |
| `manifest.json` | Full contract backup |

---

## Database Tables

| Table | Field | Purpose |
|-------|-------|---------|
| `exports` | `destinationType`, `outputPath`, `status` | Export tracking |
| `export_assets` | `exportId`, `assetId` | Asset-export linkage |

---

## Export Behavior

1. **Preset selection**: User chooses preset or custom options
2. **Format conversion**: Sharp handles resize/format (if needed)
3. **Metadata embedding**: ExifTool writes IPTC/XMP/EXIF
4. **Sidecar generation**: Optional .xmp files
5. **Manifest generation**: `manifest.json` with checksums
6. **ZIP packaging**: Optional single-file download
7. **Supabase upload**: Persistent storage (Render has ephemeral disk)

---

## Workflow Compatibility

### Lightroom

- Export with `lightroom-ready` preset
- Import folder + enable "Read from XMP sidecar"
- All metadata visible in Library module

### Capture One

- Import embedded JPEG/TIFF directly
- Custom XMP namespace readable in Metadata panel

### Photo Mechanic

- Full IPTC support
- Keywords, caption, creator visible
- Stationary pads can extend

### WordPress

- Upload JPEG; most themes preserve IPTC
- Alt text from Caption-Abstract
- Plugin: "Media Library Assistant" shows all fields

### DAMs (PhotoShelter, SmugMug, etc.)

- Full IPTC ingestion
- Keywords indexed
- Copyright enforced

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Platform strips XMP | MEDIUM | Manifest serves as backup |
| RAW file modification | LOW | Sidecar-only for RAW |
| Large export sizes | LOW | Presets optimize for use case |
| Supabase storage limit | MEDIUM | Auto-cleanup of old exports |

---

## Integration Status

| Tool | Status |
|------|--------|
| Lightroom Classic | ✅ Full support (XMP sidecar) |
| Lightroom CC | ⚠️ Limited (no sidecar import) |
| Capture One | ✅ Full support |
| Photo Mechanic | ✅ Full support |
| WordPress | ✅ IPTC preserved |
| Squarespace | ⚠️ Partial (some fields stripped) |
| Instagram | ❌ All XMP stripped |
| Facebook | ❌ All XMP stripped |

---

## Maturity Level

**✅ REAL**

- All export presets implemented
- Format conversion working
- XMP sidecar generation
- Manifest included in exports
- Professional workflow tested
