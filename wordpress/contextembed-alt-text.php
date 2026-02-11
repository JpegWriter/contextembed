<?php
/**
 * Plugin Name:  ContextEmbed — Alt Text from Embedded Metadata
 * Plugin URI:   https://contextembed.com
 * Description:  Automatically populates the WordPress Media Library "Alt Text" field
 *               from XMP / EXIF / IPTC metadata embedded by the ContextEmbed pipeline.
 * Version:      1.0.0
 * Author:       ContextEmbed
 * License:      GPL-2.0-or-later
 *
 * Hooks:
 *   add_attachment              — fires immediately after the attachment post is inserted.
 *   wp_generate_attachment_metadata — fires after WP creates thumbnails / reads EXIF.
 *
 * Priority order for alt text extraction:
 *   1. XMP  dc:description  OR  photoshop:Caption
 *   2. EXIF ImageDescription
 *   3. IPTC Caption/Abstract  (2#120)
 *
 * The value is sanitised, limited to 140 chars, and written to
 *   _wp_attachment_image_alt   (the Media Library "Alt Text" field).
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// ============================================================================
// ADMIN SETTINGS — toggle on Settings → Media
// ============================================================================

add_action( 'admin_init', 'ce_alt_register_setting' );

function ce_alt_register_setting() {
    register_setting( 'media', 'ce_auto_alt_enabled', array(
        'type'              => 'boolean',
        'default'           => true,
        'sanitize_callback' => 'rest_sanitize_boolean',
    ) );

    add_settings_field(
        'ce_auto_alt_enabled',
        'ContextEmbed Auto Alt Text',
        'ce_alt_render_setting',
        'media',
        'default'
    );
}

function ce_alt_render_setting() {
    $enabled = get_option( 'ce_auto_alt_enabled', true );
    ?>
    <label>
        <input type="checkbox"
               name="ce_auto_alt_enabled"
               value="1"
               <?php checked( $enabled ); ?> />
        Auto-fill alt text from embedded metadata (ContextEmbed)
    </label>
    <p class="description">
        When an image is uploaded, the plugin reads XMP / EXIF / IPTC description
        fields embedded by ContextEmbed and writes them to the Media Library alt text.
    </p>
    <?php
}

// ============================================================================
// HOOK 1 — add_attachment  (earliest, before thumbnails are generated)
// ============================================================================

add_action( 'add_attachment', 'ce_set_alt_on_add_attachment', 10, 1 );

function ce_set_alt_on_add_attachment( $attachment_id ) {
    ce_maybe_set_alt( $attachment_id, 'add_attachment' );
}

// ============================================================================
// HOOK 2 — wp_generate_attachment_metadata  (after WP reads EXIF / creates sizes)
// ============================================================================

add_filter( 'wp_generate_attachment_metadata', 'ce_set_alt_on_generate_metadata', 10, 2 );

function ce_set_alt_on_generate_metadata( $metadata, $attachment_id ) {
    ce_maybe_set_alt( $attachment_id, 'wp_generate_attachment_metadata' );
    return $metadata; // must return $metadata — it's a filter
}

// ============================================================================
// CORE LOGIC
// ============================================================================

/**
 * Read embedded metadata from the uploaded image and set _wp_attachment_image_alt
 * if it is currently empty.
 *
 * @param int    $attachment_id  WP attachment post ID.
 * @param string $hook_source    Which hook triggered this (for logging).
 */
function ce_maybe_set_alt( $attachment_id, $hook_source ) {

    // ── Guard: feature toggle ──
    if ( ! get_option( 'ce_auto_alt_enabled', true ) ) {
        ce_alt_log( $attachment_id, 'skipped', 'toggle_off', 0, $hook_source );
        return;
    }

    // ── Guard: must be an image ──
    if ( ! wp_attachment_is_image( $attachment_id ) ) {
        return;
    }

    // ── Guard: don't overwrite existing alt text ──
    $existing = get_post_meta( $attachment_id, '_wp_attachment_image_alt', true );
    if ( ! empty( trim( (string) $existing ) ) ) {
        ce_alt_log( $attachment_id, 'skipped', 'existing_alt', strlen( $existing ), $hook_source );
        return;
    }

    // ── Read the file path ──
    $file = get_attached_file( $attachment_id );
    if ( ! $file || ! file_exists( $file ) ) {
        ce_alt_log( $attachment_id, 'skipped', 'no_file', 0, $hook_source );
        return;
    }

    // ── Extract alt text ──
    $result = ce_extract_alt_from_file( $file );

    if ( empty( $result['text'] ) ) {
        ce_alt_log( $attachment_id, 'skipped', 'no_metadata', 0, $hook_source );
        return;
    }

    // ── Sanitise ──
    $alt_text = ce_sanitise_alt( $result['text'] );

    if ( empty( $alt_text ) ) {
        ce_alt_log( $attachment_id, 'skipped', 'empty_after_sanitise', 0, $hook_source );
        return;
    }

    // ── Write ──
    update_post_meta( $attachment_id, '_wp_attachment_image_alt', $alt_text );

    ce_alt_log( $attachment_id, 'wrote', $result['source'], strlen( $alt_text ), $hook_source );
}

// ============================================================================
// METADATA EXTRACTION
// ============================================================================

/**
 * Extract a description string from an image file.
 *
 * Priority:
 *   1. XMP  dc:description  or  photoshop:Caption
 *   2. EXIF ImageDescription
 *   3. IPTC Caption/Abstract  (record 2, dataset 120)
 *
 * @param  string $file  Absolute path to the image.
 * @return array{text: string, source: string}
 */
function ce_extract_alt_from_file( $file ) {

    // ── 1. XMP (embedded XML) ──
    $xmp = ce_read_xmp_description( $file );
    if ( ! empty( $xmp ) ) {
        return array( 'text' => $xmp, 'source' => 'xmp' );
    }

    // ── 2. EXIF ──
    if ( function_exists( 'exif_read_data' ) ) {
        // Suppress warnings — exif_read_data can be noisy on non-JPEG
        $exif = @exif_read_data( $file, 'IFD0', false );
        if ( is_array( $exif ) && ! empty( $exif['ImageDescription'] ) ) {
            $desc = trim( (string) $exif['ImageDescription'] );
            if ( $desc !== '' && strtolower( $desc ) !== 'untitled' ) {
                return array( 'text' => $desc, 'source' => 'exif' );
            }
        }
    }

    // ── 3. IPTC ──
    $size = @getimagesize( $file, $info );
    if ( isset( $info['APP13'] ) ) {
        $iptc = iptcparse( $info['APP13'] );
        if ( is_array( $iptc ) && ! empty( $iptc['2#120'][0] ) ) {
            $caption = trim( (string) $iptc['2#120'][0] );
            if ( $caption !== '' ) {
                return array( 'text' => $caption, 'source' => 'iptc' );
            }
        }
    }

    return array( 'text' => '', 'source' => 'none' );
}

/**
 * Read XMP dc:description or photoshop:Caption from raw file bytes.
 *
 * We parse the XMP packet directly rather than relying on a PHP extension
 * that may not be installed.
 *
 * @param  string $file  Absolute path.
 * @return string        Extracted text (may be empty).
 */
function ce_read_xmp_description( $file ) {

    // Read first 200 KB — XMP packet is always near the start
    $content = @file_get_contents( $file, false, null, 0, 200 * 1024 );
    if ( $content === false ) {
        return '';
    }

    // Find the XMP packet boundaries
    $start = strpos( $content, '<x:xmpmeta' );
    if ( $start === false ) {
        $start = strpos( $content, '<rdf:RDF' );
    }
    if ( $start === false ) {
        return '';
    }

    $end = strpos( $content, '</x:xmpmeta>', $start );
    if ( $end === false ) {
        $end = strpos( $content, '</rdf:RDF>', $start );
        if ( $end === false ) {
            return '';
        }
        $end += strlen( '</rdf:RDF>' );
    } else {
        $end += strlen( '</x:xmpmeta>' );
    }

    $xmp_xml = substr( $content, $start, $end - $start );

    // ── Try dc:description ──
    // Handles both <dc:description>text</dc:description>
    // and <dc:description><rdf:Alt><rdf:li ...>text</rdf:li></rdf:Alt></dc:description>
    if ( preg_match( '/<dc:description[^>]*>.*?<rdf:li[^>]*>(.+?)<\/rdf:li>/si', $xmp_xml, $m ) ) {
        $text = trim( strip_tags( $m[1] ) );
        if ( $text !== '' ) {
            return $text;
        }
    }
    // Simple form (no rdf:Alt wrapper)
    if ( preg_match( '/<dc:description[^>]*>([^<]+)<\/dc:description>/si', $xmp_xml, $m ) ) {
        $text = trim( $m[1] );
        if ( $text !== '' ) {
            return $text;
        }
    }

    // ── Try photoshop:Caption ──
    if ( preg_match( '/<photoshop:Caption[^>]*>(.+?)<\/photoshop:Caption>/si', $xmp_xml, $m ) ) {
        $text = trim( strip_tags( $m[1] ) );
        if ( $text !== '' ) {
            return $text;
        }
    }

    return '';
}

// ============================================================================
// SANITISATION
// ============================================================================

/**
 * Clean and truncate a raw metadata string for use as WP alt text.
 *
 * - Decode HTML entities
 * - Strip tags
 * - Remove quotes, newlines, excess whitespace
 * - Limit to 140 characters (no mid-word break)
 *
 * @param  string $raw  Raw string from metadata.
 * @return string       Cleaned alt text.
 */
function ce_sanitise_alt( $raw ) {
    $text = html_entity_decode( $raw, ENT_QUOTES, 'UTF-8' );
    $text = wp_strip_all_tags( $text );
    $text = str_replace( array( '"', "'", "\r", "\n", "\t" ), ' ', $text );
    $text = preg_replace( '/\s+/', ' ', $text );
    $text = trim( $text );

    // Truncate to 140 chars without breaking a word
    if ( mb_strlen( $text ) > 140 ) {
        $text = mb_substr( $text, 0, 140 );
        $last_space = mb_strrpos( $text, ' ' );
        if ( $last_space !== false && $last_space > 100 ) {
            $text = mb_substr( $text, 0, $last_space );
        }
    }

    return sanitize_text_field( $text );
}

// ============================================================================
// DEBUG LOGGING
// ============================================================================

/**
 * Log alt-text activity when WP_DEBUG_LOG is enabled.
 *
 * @param int    $id          Attachment ID.
 * @param string $action      'wrote' | 'skipped'.
 * @param string $source      'xmp' | 'exif' | 'iptc' | 'none' | reason.
 * @param int    $length      Length of final alt text (0 if skipped).
 * @param string $hook        Which hook triggered this.
 */
function ce_alt_log( $id, $action, $source, $length, $hook ) {
    if ( ! defined( 'WP_DEBUG_LOG' ) || ! WP_DEBUG_LOG ) {
        return;
    }

    $msg = sprintf(
        '[CE Alt Text] attachment=%d action=%s source=%s alt_length=%d hook=%s',
        $id,
        $action,
        $source,
        $length,
        $hook
    );

    error_log( $msg );
}
