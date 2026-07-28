<?php
/**
 * Plugin Name:       QR Code Generator
 * Plugin URI:        https://github.com/m-riaz/android_page_curl
 * Description:        Add a fully client-side QR code generator to any page or post with the [qr_generator] shortcode. Visitors type a URL or text and download the QR as PNG or SVG. No external services, no data leaves the browser.
 * Version:           1.0.0
 * Requires at least: 5.0
 * Requires PHP:      7.0
 * Author:            m-riaz
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       qr-code-generator
 * Domain Path:       /languages
 *
 * @package QR_Code_Generator
 */

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

define( 'QRCG_VERSION', '1.0.0' );
define( 'QRCG_PLUGIN_FILE', __FILE__ );
define( 'QRCG_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'QRCG_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );

/**
 * Main plugin class.
 *
 * Registers the [qr_generator] shortcode and its front-end assets. All QR
 * generation happens in the browser, so the server only ever renders markup.
 */
final class QRCG_Plugin {

	/**
	 * Whether the shortcode was used on the current request (controls asset output).
	 *
	 * @var bool
	 */
	private $shortcode_used = false;

	/**
	 * Counter to give every shortcode instance on a page a unique DOM id.
	 *
	 * @var int
	 */
	private $instance = 0;

	/**
	 * Singleton instance.
	 *
	 * @var QRCG_Plugin|null
	 */
	private static $singleton = null;

	/**
	 * Bootstraps the singleton.
	 *
	 * @return QRCG_Plugin
	 */
	public static function instance() {
		if ( null === self::$singleton ) {
			self::$singleton = new self();
		}
		return self::$singleton;
	}

	/**
	 * Hooks everything up.
	 */
	private function __construct() {
		add_shortcode( 'qr_generator', array( $this, 'render_shortcode' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'register_assets' ) );
		add_action( 'wp_footer', array( $this, 'maybe_enqueue_assets' ) );
	}

	/**
	 * Registers (but does not enqueue) the scripts and styles.
	 *
	 * Assets are only enqueued when the shortcode is actually present, so pages
	 * without a QR generator stay lightweight.
	 */
	public function register_assets() {
		wp_register_style(
			'qrcg-style',
			QRCG_PLUGIN_URL . 'assets/css/qr-generator.css',
			array(),
			QRCG_VERSION
		);

		wp_register_script(
			'qrcg-vendor-qrcode',
			QRCG_PLUGIN_URL . 'assets/js/vendor/qrcode.js',
			array(),
			'1.4.4',
			true
		);

		wp_register_script(
			'qrcg-app',
			QRCG_PLUGIN_URL . 'assets/js/qr-generator.js',
			array( 'qrcg-vendor-qrcode' ),
			QRCG_VERSION,
			true
		);

		// Translatable strings used by the front-end script.
		wp_localize_script(
			'qrcg-app',
			'QRCG_I18N',
			array(
				'empty'       => __( 'Enter some text or a URL above to generate a QR code.', 'qr-code-generator' ),
				'tooLong'     => __( 'That content is too long to fit in a QR code. Try shortening it.', 'qr-code-generator' ),
				'genericErr'  => __( 'Sorry, the QR code could not be generated.', 'qr-code-generator' ),
				'ready'       => __( 'QR code ready.', 'qr-code-generator' ),
				'downloadPng' => __( 'Download PNG', 'qr-code-generator' ),
				'downloadSvg' => __( 'Download SVG', 'qr-code-generator' ),
			)
		);
	}

	/**
	 * Enqueues the registered assets in the footer, only if the shortcode ran.
	 */
	public function maybe_enqueue_assets() {
		if ( ! $this->shortcode_used ) {
			return;
		}
		wp_enqueue_style( 'qrcg-style' );
		wp_enqueue_script( 'qrcg-app' );
	}

	/**
	 * Renders the [qr_generator] shortcode.
	 *
	 * Supported attributes:
	 *  - title       Heading text shown above the widget. Empty hides it.
	 *  - content     Pre-filled content for the input.
	 *  - placeholder Placeholder text for the input.
	 *  - size        Initial output size in pixels (100-1000). Default 300.
	 *  - ecl         Error correction level: L, M, Q or H. Default M.
	 *  - fg          Foreground (module) colour as a hex value. Default #000000.
	 *  - bg          Background colour as a hex value. Default #ffffff.
	 *  - controls    "yes" to show the customisation controls, "no" to hide them.
	 *  - download    "yes" to show the PNG/SVG download buttons, "no" to hide them.
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string HTML markup.
	 */
	public function render_shortcode( $atts ) {
		$this->shortcode_used = true;
		$this->instance++;

		$atts = shortcode_atts(
			array(
				'title'       => __( 'QR Code Generator', 'qr-code-generator' ),
				'content'     => '',
				'placeholder' => __( 'https://example.com', 'qr-code-generator' ),
				'size'        => 300,
				'ecl'         => 'M',
				'fg'          => '#000000',
				'bg'          => '#ffffff',
				'controls'    => 'yes',
				'download'    => 'yes',
			),
			$atts,
			'qr_generator'
		);

		// Sanitise / validate every attribute before it reaches the markup.
		$size = (int) $atts['size'];
		if ( $size < 100 || $size > 1000 ) {
			$size = 300;
		}

		$ecl = strtoupper( trim( (string) $atts['ecl'] ) );
		if ( ! in_array( $ecl, array( 'L', 'M', 'Q', 'H' ), true ) ) {
			$ecl = 'M';
		}

		$fg = $this->sanitize_hex_color( $atts['fg'], '#000000' );
		$bg = $this->sanitize_hex_color( $atts['bg'], '#ffffff' );

		$show_controls = $this->is_true( $atts['controls'] );
		$show_download = $this->is_true( $atts['download'] );

		$title       = sanitize_text_field( $atts['title'] );
		$content     = sanitize_textarea_field( $atts['content'] );
		$placeholder = sanitize_text_field( $atts['placeholder'] );

		$id = 'qrcg-' . $this->instance;

		ob_start();
		?>
		<div
			class="qrcg"
			id="<?php echo esc_attr( $id ); ?>"
			data-size="<?php echo esc_attr( (string) $size ); ?>"
			data-ecl="<?php echo esc_attr( $ecl ); ?>"
			data-fg="<?php echo esc_attr( $fg ); ?>"
			data-bg="<?php echo esc_attr( $bg ); ?>"
		>
			<?php if ( '' !== $title ) : ?>
				<h3 class="qrcg__title"><?php echo esc_html( $title ); ?></h3>
			<?php endif; ?>

			<div class="qrcg__field">
				<label class="qrcg__label" for="<?php echo esc_attr( $id ); ?>-input">
					<?php esc_html_e( 'Content or URL', 'qr-code-generator' ); ?>
				</label>
				<textarea
					id="<?php echo esc_attr( $id ); ?>-input"
					class="qrcg__input"
					rows="3"
					placeholder="<?php echo esc_attr( $placeholder ); ?>"
				><?php echo esc_textarea( $content ); ?></textarea>
			</div>

			<?php if ( $show_controls ) : ?>
				<div class="qrcg__controls">
					<div class="qrcg__control">
						<label for="<?php echo esc_attr( $id ); ?>-size">
							<?php esc_html_e( 'Size', 'qr-code-generator' ); ?>
							<span class="qrcg__size-value" data-role="size-value"><?php echo esc_html( (string) $size ); ?>px</span>
						</label>
						<input type="range" id="<?php echo esc_attr( $id ); ?>-size" class="qrcg__range" data-role="size" min="100" max="1000" step="10" value="<?php echo esc_attr( (string) $size ); ?>">
					</div>

					<div class="qrcg__control">
						<label for="<?php echo esc_attr( $id ); ?>-ecl"><?php esc_html_e( 'Error correction', 'qr-code-generator' ); ?></label>
						<select id="<?php echo esc_attr( $id ); ?>-ecl" class="qrcg__select" data-role="ecl">
							<option value="L" <?php selected( $ecl, 'L' ); ?>><?php esc_html_e( 'Low (7%)', 'qr-code-generator' ); ?></option>
							<option value="M" <?php selected( $ecl, 'M' ); ?>><?php esc_html_e( 'Medium (15%)', 'qr-code-generator' ); ?></option>
							<option value="Q" <?php selected( $ecl, 'Q' ); ?>><?php esc_html_e( 'Quartile (25%)', 'qr-code-generator' ); ?></option>
							<option value="H" <?php selected( $ecl, 'H' ); ?>><?php esc_html_e( 'High (30%)', 'qr-code-generator' ); ?></option>
						</select>
					</div>

					<div class="qrcg__control qrcg__control--color">
						<label for="<?php echo esc_attr( $id ); ?>-fg"><?php esc_html_e( 'Foreground', 'qr-code-generator' ); ?></label>
						<input type="color" id="<?php echo esc_attr( $id ); ?>-fg" class="qrcg__color" data-role="fg" value="<?php echo esc_attr( $fg ); ?>">
					</div>

					<div class="qrcg__control qrcg__control--color">
						<label for="<?php echo esc_attr( $id ); ?>-bg"><?php esc_html_e( 'Background', 'qr-code-generator' ); ?></label>
						<input type="color" id="<?php echo esc_attr( $id ); ?>-bg" class="qrcg__color" data-role="bg" value="<?php echo esc_attr( $bg ); ?>">
					</div>
				</div>
			<?php endif; ?>

			<div class="qrcg__result">
				<div class="qrcg__canvas-wrap" data-role="canvas-wrap"></div>
				<p class="qrcg__status" data-role="status" role="status" aria-live="polite"></p>
			</div>

			<?php if ( $show_download ) : ?>
				<div class="qrcg__actions" data-role="actions" hidden>
					<button type="button" class="qrcg__btn" data-role="download-png"><?php esc_html_e( 'Download PNG', 'qr-code-generator' ); ?></button>
					<button type="button" class="qrcg__btn qrcg__btn--ghost" data-role="download-svg"><?php esc_html_e( 'Download SVG', 'qr-code-generator' ); ?></button>
				</div>
			<?php endif; ?>

			<noscript>
				<p class="qrcg__status"><?php esc_html_e( 'This QR code generator needs JavaScript enabled in your browser.', 'qr-code-generator' ); ?></p>
			</noscript>
		</div>
		<?php
		return trim( ob_get_clean() );
	}

	/**
	 * Interprets a truthy shortcode attribute value.
	 *
	 * @param string $value Raw attribute value.
	 * @return bool
	 */
	private function is_true( $value ) {
		return in_array( strtolower( (string) $value ), array( 'yes', 'true', '1', 'on' ), true );
	}

	/**
	 * Validates a hex colour, falling back to a default when invalid.
	 *
	 * @param string $value    Candidate colour.
	 * @param string $fallback Fallback colour.
	 * @return string A #rrggbb (or #rgb) colour string.
	 */
	private function sanitize_hex_color( $value, $fallback ) {
		$value = trim( (string) $value );
		if ( '' !== $value && '#' !== $value[0] ) {
			$value = '#' . $value;
		}
		if ( preg_match( '/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $value ) ) {
			return $value;
		}
		return $fallback;
	}
}

QRCG_Plugin::instance();
