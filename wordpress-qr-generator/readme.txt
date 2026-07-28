=== QR Code Generator ===
Contributors: m-riaz
Tags: qr code, qr generator, qrcode, shortcode, download qr
Requires at least: 5.0
Tested up to: 6.5
Requires PHP: 7.0
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Drop a live QR code generator onto any page or post with a shortcode. Visitors type a URL or text and download the code as PNG or SVG.

== Description ==

QR Code Generator adds a `[qr_generator]` shortcode that renders an interactive QR code widget anywhere on your WordPress site. Your visitors type in a link or any text and instantly get a scannable QR code they can download.

Everything runs in the visitor's browser using a bundled, MIT-licensed QR library. No data is ever sent to a third-party service, and no API keys are required.

= Features =

* Simple `[qr_generator]` shortcode - works in the Classic editor, the Block editor (Shortcode block), and widgets.
* 100% client-side generation - private and fast, with no external requests.
* Live preview that updates as you type.
* Download as **PNG** (raster) or **SVG** (infinitely scalable).
* Customisable size, error-correction level, and foreground / background colours.
* Full UTF-8 support (works with non-Latin text and emoji).
* Multiple generators on the same page.
* Responsive, accessible markup with light and dark mode styles.
* Lightweight: assets only load on pages that actually use the shortcode.

== Installation ==

1. Upload the `wordpress-qr-generator` folder to `/wp-content/plugins/`, or install the ZIP via **Plugins > Add New > Upload Plugin**.
2. Activate **QR Code Generator** through the **Plugins** menu in WordPress.
3. Add the `[qr_generator]` shortcode to any page, post, or widget.

== Usage ==

Basic:

`[qr_generator]`

With attributes:

`[qr_generator title="Scan me" content="https://example.com" size="360" ecl="H" fg="#0a0a0a" bg="#ffffff" controls="yes" download="yes"]`

= Shortcode attributes =

* `title` - Heading shown above the widget. Leave empty to hide it. Default: "QR Code Generator".
* `content` - Pre-filled text or URL. Default: empty.
* `placeholder` - Placeholder text for the input. Default: "https://example.com".
* `size` - Initial output size in pixels (100-1000). Default: 300.
* `ecl` - Error-correction level: `L`, `M`, `Q`, or `H`. Higher survives more damage but stores less. Default: `M`.
* `fg` - Foreground (module) colour as a hex value. Default: `#000000`.
* `bg` - Background colour as a hex value. Default: `#ffffff`.
* `controls` - `yes` to show the size / error-correction / colour controls, `no` to hide them. Default: `yes`.
* `download` - `yes` to show the PNG/SVG download buttons, `no` to hide them. Default: `yes`.

== Frequently Asked Questions ==

= Does this send data to an external server? =

No. QR codes are generated entirely in the visitor's browser. Nothing is transmitted anywhere.

= Can I use it on WordPress.com? =

The plugin requires the ability to upload plugins, which is available on WordPress.com Business/Commerce plans and on any self-hosted WordPress.org site.

= Can I put more than one generator on a page? =

Yes. Each `[qr_generator]` instance is independent.

= Why does very long text fail? =

QR codes have a maximum capacity. If the content is too long the widget shows a message asking you to shorten it. Lowering the error-correction level (`ecl="L"`) increases capacity.

== Changelog ==

= 1.0.0 =
* Initial release.

== Credits ==

QR encoding is powered by the qrcode-generator library by Kazuhiko Arase, distributed under the MIT license.
