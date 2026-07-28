# QR Code Generator (WordPress plugin)

A WordPress plugin that adds a **Canva-style QR code designer** to any page or
post through a `[qr_generator]` shortcode. Visitors type a URL or text, pick a
look, and download a scannable QR code as **PNG** or **SVG**.

Everything runs **client-side** in the browser using the bundled, MIT-licensed
[`qr-code-styling`](https://github.com/kozakdenys/qr-code-styling) library — no
external services, no API keys, no data leaving the visitor's browser.

|                              | Preview |
|------------------------------|---------|
| Rounded dots + gradient eyes | styled, coloured modules |
| Centre logo (auto ECL "H")   | logo with a clear zone behind it |

## Features

- **One-click style templates:** Classic, Rounded, Dots, Elegant, Bold, Ocean.
- **6 dot styles:** square, rounded, dots, classy, classy-rounded, extra-rounded.
- **3 eye (finder) styles:** square, rounded, dot.
- **Solid or gradient fills** (linear / radial) with two colours.
- **Custom foreground/background colours**, plus a transparent background option.
- **Centre logo upload** — auto-switches to the highest error-correction level and
  clears the space behind the logo so the code still scans.
- Adjustable size and error-correction level.
- Live preview that updates as you type.
- Download as **PNG** or scalable **SVG**.
- Full UTF-8 support, multiple generators per page, responsive + dark-mode styles.
- Assets load only on pages that actually use the shortcode.

## Staying scannable

QR "design" only helps if phones can still read it, so the plugin:

- always keeps a standard quiet zone around the code,
- forces error correction to **H** whenever a logo is present and limits the logo
  size, drawing it on a cleared background patch,
- shows a gentle warning when colour contrast is low or a logo is oversized.

The styled output has been verified end-to-end: rendered variants (rounded +
gradient, dots, and logo-in-centre at ECL H) were decoded back to their original
URL with an independent QR reader.

> Always test a designed code with a real phone before you publish it.

## Installation

1. Copy the `wordpress-qr-generator` folder into `wp-content/plugins/` **or**
   zip the folder and upload it via **Plugins → Add New → Upload Plugin**.
2. Activate **QR Code Generator** from the **Plugins** screen.
3. Add `[qr_generator]` to any page, post, or text widget.

To build the installable ZIP from this repository:

```bash
cd wordpress-qr-generator
zip -r ../qr-code-generator.zip . -x ".*"
```

## Usage

Minimal:

```
[qr_generator]
```

Fully configured:

```
[qr_generator title="Scan me" content="https://example.com" template="elegant" size="360" dot="rounded" eye="rounded" gradient="linear" fg="#4f46e5" fg2="#9333ea" bg="#ffffff"]
```

### Shortcode attributes

| Attribute     | Description                                                        | Default             |
|---------------|--------------------------------------------------------------------|---------------------|
| `title`       | Heading above the widget (empty to hide)                           | `QR Code Generator` |
| `content`     | Pre-filled text or URL                                             | *(empty)*           |
| `placeholder` | Input placeholder text                                             | `https://example.com` |
| `template`    | Starting look: `classic`/`rounded`/`dots`/`elegant`/`bold`/`ocean`/`none` | `none`      |
| `size`        | Initial output size in pixels (120–1000)                           | `320`               |
| `dot`         | Dot style (`square`,`rounded`,`dots`,`classy`,`classy-rounded`,`extra-rounded`) | `rounded` |
| `eye`         | Eye style (`square`,`rounded`,`dot`)                               | `rounded`           |
| `gradient`    | Fill (`none`,`linear`,`radial`)                                    | `none`              |
| `fg`          | Foreground / gradient-start colour, hex                            | `#1a1a2e`           |
| `fg2`         | Gradient-end colour, hex                                           | `#7c3aed`           |
| `bg`          | Background colour (hex) or `transparent`                           | `#ffffff`           |
| `logosize`    | Centre-logo size as % of the code (10–40)                          | `25`                |
| `ecl`         | Error correction `L`/`M`/`Q`/`H` (forced to `H` with a logo)       | `M`                 |
| `controls`    | Show customisation controls (`yes`/`no`)                           | `yes`               |
| `download`    | Show PNG/SVG download buttons (`yes`/`no`)                         | `yes`               |

## Project structure

```
wordpress-qr-generator/
├── qr-code-generator.php          # Shortcode, attribute sanitisation, asset registration
├── readme.txt                     # WordPress.org-style readme
├── README.md                      # This file
├── LICENSE                        # GPL-2.0-or-later
└── assets/
    ├── css/
    │   └── qr-generator.css        # Two-column layout, light + dark
    └── js/
        ├── qr-generator.js         # Controller: templates, options, logo, downloads, scan guards
        └── vendor/
            ├── qr-code-styling.js  # Bundled qr-code-styling (MIT, Denys Kozak)
            └── qr-code-styling.LICENSE
```

## How it works

- The shortcode renders accessible, escaped markup and passes its defaults to the
  browser as a single JSON `data-config` attribute. Assets are registered on
  `wp_enqueue_scripts` and only enqueued (in the footer) when the shortcode is
  present on the request.
- On the client, `qr-generator.js` reads the controls, maps the friendly choices
  (dot style, eye style, gradient, logo) onto `qr-code-styling` options, and keeps
  a live preview via `update()`. Downloads come from the library's `getRawData()`
  for both PNG and SVG.

## Privacy

No network requests are made to generate a code. All processing happens locally in
the visitor's browser.

## License

- Plugin code: **GPL-2.0-or-later** (see `LICENSE`).
- Bundled `assets/js/vendor/qr-code-styling.js`: **MIT**, © 2019 Denys Kozak.
