=== QR Code Generator ===
Contributors: m-riaz
Tags: qr code, qr generator, qrcode, shortcode, logo qr
Requires at least: 5.0
Tested up to: 6.5
Requires PHP: 7.0
Stable tag: 2.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Add a designer QR code generator to any page. Styled dots, rounded eyes, colour gradients, and a centre logo - download as PNG or SVG.

== Description ==

QR Code Generator adds a `[qr_generator]` shortcode that renders an interactive, Canva-style QR code designer anywhere on your WordPress site. Visitors type a link or text, pick a look, and download a scannable QR code as PNG or SVG.

Everything runs in the visitor's browser using the bundled, MIT-licensed qr-code-styling library. No data is ever sent to a third-party service and no API keys are required.

= Design features =

* One-click style templates: Classic, Rounded, Dots, Elegant, Bold, Ocean.
* Six dot styles (square, rounded, dots, classy, classy rounded, extra rounded).
* Three eye (finder pattern) styles (square, rounded, dot).
* Solid colour **or** linear / radial gradient fills.
* Custom foreground and background colours, plus a transparent background option.
* Upload a **centre logo** - the plugin automatically switches to the highest error-correction level and clears the space behind it so the code still scans.
* Adjustable size and error-correction level.
* Live preview that updates as you type.
* Download as **PNG** or scalable **SVG**.

= Built to stay scannable =

* A standard quiet zone is always kept around the code.
* Logos are size-limited and sit on a clear background patch.
* A gentle warning appears if colour contrast is low or a logo is too large.

= Other features =

* Full UTF-8 support (non-Latin scripts and emoji).
* Multiple independent generators per page.
* Responsive, accessible markup with light and dark mode styles.
* Lightweight: assets only load on pages that actually use the shortcode.
* 100% client-side - private, fast, and offline once the page has loaded.

== Installation ==

1. Upload the `wordpress-qr-generator` folder to `/wp-content/plugins/`, or install the ZIP via **Plugins > Add New > Upload Plugin**.
2. Activate **QR Code Generator** through the **Plugins** menu in WordPress.
3. Add the `[qr_generator]` shortcode to any page, post, or widget.

== Usage ==

Basic:

`[qr_generator]`

With attributes:

`[qr_generator title="Scan me" content="https://example.com" template="elegant" size="360" dot="rounded" eye="rounded" gradient="linear" fg="#4f46e5" fg2="#9333ea" bg="#ffffff"]`

= Shortcode attributes =

* `title` - Heading above the widget (empty to hide). Default: "QR Code Generator".
* `content` - Pre-filled text or URL. Default: empty.
* `placeholder` - Placeholder text for the input. Default: "https://example.com".
* `template` - Starting look: `classic`, `rounded`, `dots`, `elegant`, `bold`, `ocean`, or `none`. Default: `none`.
* `size` - Initial output size in pixels (120-1000). Default: 320.
* `dot` - Dot style: `square`, `rounded`, `dots`, `classy`, `classy-rounded`, `extra-rounded`. Default: `rounded`.
* `eye` - Eye (finder) style: `square`, `rounded`, `dot`. Default: `rounded`.
* `gradient` - Fill: `none`, `linear`, or `radial`. Default: `none`.
* `fg` - Foreground colour (gradient start), hex. Default: `#1a1a2e`.
* `fg2` - Gradient end colour, hex. Default: `#7c3aed`.
* `bg` - Background colour (hex) or `transparent`. Default: `#ffffff`.
* `logosize` - Centre logo size as a percentage of the code (10-40). Default: 25.
* `ecl` - Error-correction level: `L`, `M`, `Q`, `H`. Default: `M` (forced to `H` when a logo is used).
* `controls` - Show the customisation controls (`yes`/`no`). Default: `yes`.
* `download` - Show the PNG/SVG download buttons (`yes`/`no`). Default: `yes`.

== Frequently Asked Questions ==

= Does this send data to an external server? =

No. QR codes are generated entirely in the visitor's browser. Nothing is transmitted anywhere.

= Will a styled QR code with a logo still scan? =

Yes, within reason. The plugin keeps a quiet zone, raises error correction to the highest level when a logo is present, and clears the area behind the logo. Very low contrast colours or an oversized logo can still hurt scanning, so a warning is shown and you should always test the code with a phone before sharing it.

= Can I use it on WordPress.com? =

The plugin requires the ability to upload plugins, which is available on WordPress.com Business/Commerce plans and on any self-hosted WordPress.org site.

= Can I put more than one generator on a page? =

Yes. Each `[qr_generator]` instance is independent.

== Changelog ==

= 2.0.0 =
* Redesigned as a Canva-style QR designer: style templates, dot/eye styles, gradients, and centre-logo upload.
* Switched the rendering engine to qr-code-styling.
* Added scannability safeguards (quiet zone, auto error correction with logos, contrast/logo warnings).
* Two-column layout with live preview and PNG/SVG download.

= 1.0.0 =
* Initial release: basic [qr_generator] shortcode with PNG/SVG download.

== Credits ==

QR rendering is powered by the qr-code-styling library by Denys Kozak, distributed under the MIT license.
