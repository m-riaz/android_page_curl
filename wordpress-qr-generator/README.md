# QR Code Generator (WordPress plugin)

A lightweight WordPress plugin that adds an interactive **QR code generator** to
any page or post through a simple `[qr_generator]` shortcode. Visitors type a URL
or text and instantly get a scannable QR code they can download as **PNG** or
**SVG**.

Everything runs **client-side** in the browser using the bundled, MIT-licensed
[`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator) library —
no external services, no API keys, no data leaving the visitor's browser.

## Features

- `[qr_generator]` shortcode — works in the Classic editor, the Block editor
  (Shortcode block), and widget areas.
- 100% client-side generation (private, fast, offline-capable once the page loads).
- Live preview that updates as you type.
- Download as **PNG** or scalable **SVG**.
- Adjustable size, error-correction level (L/M/Q/H), and foreground/background colours.
- Full UTF-8 support (non-Latin scripts and emoji).
- Multiple independent generators per page.
- Responsive, accessible markup with light **and** dark mode styling.
- Assets load only on pages that actually use the shortcode.

## Installation

1. Copy the `wordpress-qr-generator` folder into `wp-content/plugins/` **or**
   zip the folder and upload it via **Plugins → Add New → Upload Plugin**.
2. Activate **QR Code Generator** from the **Plugins** screen.
3. Add `[qr_generator]` to any page, post, or text widget.

To create the installable ZIP from this repository:

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
[qr_generator title="Scan me" content="https://example.com" size="360" ecl="H" fg="#0a0a0a" bg="#ffffff" controls="yes" download="yes"]
```

### Shortcode attributes

| Attribute     | Description                                              | Default                 |
|---------------|----------------------------------------------------------|-------------------------|
| `title`       | Heading above the widget (empty to hide)                 | `QR Code Generator`     |
| `content`     | Pre-filled text or URL                                   | *(empty)*               |
| `placeholder` | Input placeholder text                                   | `https://example.com`   |
| `size`        | Initial output size in pixels (100–1000)                 | `300`                   |
| `ecl`         | Error-correction level: `L`, `M`, `Q`, `H`               | `M`                     |
| `fg`          | Foreground (module) colour, hex                          | `#000000`               |
| `bg`          | Background colour, hex                                    | `#ffffff`               |
| `controls`    | Show customisation controls (`yes`/`no`)                 | `yes`                   |
| `download`    | Show PNG/SVG download buttons (`yes`/`no`)               | `yes`                   |

## Project structure

```
wordpress-qr-generator/
├── qr-code-generator.php          # Main plugin file: shortcode + asset registration
├── readme.txt                     # WordPress.org-style readme
├── README.md                      # This file
├── LICENSE                        # GPL-2.0-or-later
└── assets/
    ├── css/
    │   └── qr-generator.css        # Scoped widget styles (light + dark)
    └── js/
        ├── qr-generator.js         # Front-end controller (draw, colours, download)
        └── vendor/
            └── qrcode.js           # Bundled qrcode-generator (MIT, Kazuhiko Arase)
```

## How it works

- The shortcode renders accessible, escaped markup and exposes its defaults via
  `data-*` attributes. Assets are registered on `wp_enqueue_scripts` and only
  enqueued (in the footer) when the shortcode is present on the request.
- On the client, `qr-generator.js` reads the input, builds the QR model with
  `qrcode(0, ecl)` (auto version selection), reads the module matrix via
  `getModuleCount()` / `isDark()`, and draws it onto a `<canvas>` with the chosen
  colours and a standard 4-module quiet zone.
- PNG downloads come from `canvas.toDataURL`; SVG downloads are built directly
  from the module matrix so they stay crisp at any size.

## Privacy

No network requests are made to generate a code. All processing happens locally
in the visitor's browser.

## License

- Plugin code: **GPL-2.0-or-later** (see `LICENSE`).
- Bundled `assets/js/vendor/qrcode.js`: **MIT**, © 2009 Kazuhiko Arase.
