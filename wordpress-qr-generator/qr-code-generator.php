<?php
/**
 * Plugin Name:       QR Code Generator
 * Plugin URI:        https://github.com/m-riaz/android_page_curl
 * Description:        Add a designer QR code generator to any page or post with the [qr_generator] shortcode. Styled dots, rounded eyes, colour gradients, and a centre logo - all generated in the browser, ready to download as PNG or SVG.
 * Version:           2.0.0
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

define( 'QRCG_VERSION', '2.0.0' );
define( 'QRCG_PLUGIN_FILE', __FILE__ );
define( 'QRCG_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'QRCG_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );

/**
 * Main plugin class.
 *
 * Registers the [qr_generator] shortcode and its front-end assets. Every QR
 * code is styled and generated in the browser, so the server only renders
 * markup and never contacts an external service.
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
	 * Allowed dot (module) styles.
	 *
	 * @var string[]
	 */
	private $dot_styles = array( 'square', 'rounded', 'dots', 'classy', 'classy-rounded', 'extra-rounded' );

	/**
	 * Allowed eye (finder pattern) styles.
	 *
	 * @var string[]
	 */
	private $eye_styles = array( 'square', 'rounded', 'dot' );

	/**
	 * Allowed gradient modes.
	 *
	 * @var string[]
	 */
	private $gradient_modes = array( 'none', 'linear', 'radial' );

	/**
	 * Allowed quick-style templates.
	 *
	 * @var string[]
	 */
	private $templates = array( 'none', 'classic', 'rounded', 'dots', 'elegant', 'bold', 'ocean' );

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
			'qrcg-vendor-styling',
			QRCG_PLUGIN_URL . 'assets/js/vendor/qr-code-styling.js',
			array(),
			'1.6.0',
			true
		);

		wp_register_script(
			'qrcg-app',
			QRCG_PLUGIN_URL . 'assets/js/qr-generator.js',
			array( 'qrcg-vendor-styling' ),
			QRCG_VERSION,
			true
		);

		// Translatable strings used by the front-end script.
		wp_localize_script(
			'qrcg-app',
			'QRCG_I18N',
			array(
				'empty'        => __( 'Enter some text or a URL above to generate a QR code.', 'qr-code-generator' ),
				'tooLong'      => __( 'That content is too long to fit in a QR code. Try shortening it.', 'qr-code-generator' ),
				'genericErr'   => __( 'Sorry, the QR code could not be generated.', 'qr-code-generator' ),
				'ready'        => __( 'QR code ready. Scan to test before you share it.', 'qr-code-generator' ),
				'lowContrast'  => __( 'Low contrast between colours may be hard to scan.', 'qr-code-generator' ),
				'logoTooBig'   => __( 'Large logos can block scanning. Keep the logo small and test the code.', 'qr-code-generator' ),
				'badImage'     => __( 'That image could not be loaded. Please choose a PNG, JPG, or SVG file.', 'qr-code-generator' ),
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
				'size'        => 320,
				'ecl'         => 'M',
				'fg'          => '#1a1a2e',
				'fg2'         => '#7c3aed',
				'bg'          => '#ffffff',
				'gradient'    => 'none',
				'dot'         => 'rounded',
				'eye'         => 'rounded',
				'logosize'    => 25,
				'template'    => 'none',
				'controls'    => 'yes',
				'download'    => 'yes',
			),
			$atts,
			'qr_generator'
		);

		// Sanitise / validate every attribute before it reaches the markup.
		$size = (int) $atts['size'];
		if ( $size < 120 || $size > 1000 ) {
			$size = 320;
		}

		$ecl = strtoupper( trim( (string) $atts['ecl'] ) );
		if ( ! in_array( $ecl, array( 'L', 'M', 'Q', 'H' ), true ) ) {
			$ecl = 'M';
		}

		$dot = strtolower( trim( (string) $atts['dot'] ) );
		if ( ! in_array( $dot, $this->dot_styles, true ) ) {
			$dot = 'rounded';
		}

		$eye = strtolower( trim( (string) $atts['eye'] ) );
		if ( ! in_array( $eye, $this->eye_styles, true ) ) {
			$eye = 'rounded';
		}

		$gradient = strtolower( trim( (string) $atts['gradient'] ) );
		if ( ! in_array( $gradient, $this->gradient_modes, true ) ) {
			$gradient = 'none';
		}

		$template = strtolower( trim( (string) $atts['template'] ) );
		if ( ! in_array( $template, $this->templates, true ) ) {
			$template = 'none';
		}

		$logosize = (int) $atts['logosize'];
		if ( $logosize < 10 || $logosize > 40 ) {
			$logosize = 25;
		}

		$fg  = $this->sanitize_hex_color( $atts['fg'], '#1a1a2e' );
		$fg2 = $this->sanitize_hex_color( $atts['fg2'], '#7c3aed' );
		$bg  = 'transparent' === strtolower( trim( (string) $atts['bg'] ) )
			? 'transparent'
			: $this->sanitize_hex_color( $atts['bg'], '#ffffff' );

		$show_controls = $this->is_true( $atts['controls'] );
		$show_download = $this->is_true( $atts['download'] );

		$title       = sanitize_text_field( $atts['title'] );
		$content     = sanitize_textarea_field( $atts['content'] );
		$placeholder = sanitize_text_field( $atts['placeholder'] );

		$id = 'qrcg-' . $this->instance;

		// Everything the front-end script needs, passed as one JSON blob.
		$config = array(
			'size'     => $size,
			'ecl'      => $ecl,
			'dot'      => $dot,
			'eye'      => $eye,
			'gradient' => $gradient,
			'fg'       => $fg,
			'fg2'      => $fg2,
			'bg'       => $bg,
			'logoSize' => $logosize,
			'template' => $template,
		);

		ob_start();
		?>
		<div
			class="qrcg"
			id="<?php echo esc_attr( $id ); ?>"
			data-config="<?php echo esc_attr( wp_json_encode( $config ) ); ?>"
		>
			<?php if ( '' !== $title ) : ?>
				<h3 class="qrcg__title"><?php echo esc_html( $title ); ?></h3>
			<?php endif; ?>

			<div class="qrcg__layout">
				<div class="qrcg__form">
					<div class="qrcg__field">
						<label class="qrcg__label" for="<?php echo esc_attr( $id ); ?>-input">
							<?php esc_html_e( 'Content or URL', 'qr-code-generator' ); ?>
						</label>
						<textarea
							id="<?php echo esc_attr( $id ); ?>-input"
							class="qrcg__input"
							rows="2"
							placeholder="<?php echo esc_attr( $placeholder ); ?>"
						><?php echo esc_textarea( $content ); ?></textarea>
					</div>

					<?php if ( $show_controls ) : ?>
						<div class="qrcg__field">
							<span class="qrcg__label"><?php esc_html_e( 'Style', 'qr-code-generator' ); ?></span>
							<div class="qrcg__templates" data-role="templates" role="group" aria-label="<?php esc_attr_e( 'Quick styles', 'qr-code-generator' ); ?>">
								<?php
								$template_labels = array(
									'classic' => __( 'Classic', 'qr-code-generator' ),
									'rounded' => __( 'Rounded', 'qr-code-generator' ),
									'dots'    => __( 'Dots', 'qr-code-generator' ),
									'elegant' => __( 'Elegant', 'qr-code-generator' ),
									'bold'    => __( 'Bold', 'qr-code-generator' ),
									'ocean'   => __( 'Ocean', 'qr-code-generator' ),
								);
								foreach ( $template_labels as $tpl_key => $tpl_label ) :
									?>
									<button type="button" class="qrcg__chip" data-template="<?php echo esc_attr( $tpl_key ); ?>">
										<?php echo esc_html( $tpl_label ); ?>
									</button>
								<?php endforeach; ?>
							</div>
						</div>

						<div class="qrcg__controls">
							<div class="qrcg__control">
								<label for="<?php echo esc_attr( $id ); ?>-dot"><?php esc_html_e( 'Dot style', 'qr-code-generator' ); ?></label>
								<select id="<?php echo esc_attr( $id ); ?>-dot" class="qrcg__select" data-role="dot">
									<option value="square"><?php esc_html_e( 'Square', 'qr-code-generator' ); ?></option>
									<option value="rounded"><?php esc_html_e( 'Rounded', 'qr-code-generator' ); ?></option>
									<option value="dots"><?php esc_html_e( 'Dots', 'qr-code-generator' ); ?></option>
									<option value="classy"><?php esc_html_e( 'Classy', 'qr-code-generator' ); ?></option>
									<option value="classy-rounded"><?php esc_html_e( 'Classy rounded', 'qr-code-generator' ); ?></option>
									<option value="extra-rounded"><?php esc_html_e( 'Extra rounded', 'qr-code-generator' ); ?></option>
								</select>
							</div>

							<div class="qrcg__control">
								<label for="<?php echo esc_attr( $id ); ?>-eye"><?php esc_html_e( 'Eye style', 'qr-code-generator' ); ?></label>
								<select id="<?php echo esc_attr( $id ); ?>-eye" class="qrcg__select" data-role="eye">
									<option value="square"><?php esc_html_e( 'Square', 'qr-code-generator' ); ?></option>
									<option value="rounded"><?php esc_html_e( 'Rounded', 'qr-code-generator' ); ?></option>
									<option value="dot"><?php esc_html_e( 'Dot', 'qr-code-generator' ); ?></option>
								</select>
							</div>

							<div class="qrcg__control">
								<label for="<?php echo esc_attr( $id ); ?>-ecl"><?php esc_html_e( 'Error correction', 'qr-code-generator' ); ?></label>
								<select id="<?php echo esc_attr( $id ); ?>-ecl" class="qrcg__select" data-role="ecl">
									<option value="L"><?php esc_html_e( 'Low (7%)', 'qr-code-generator' ); ?></option>
									<option value="M"><?php esc_html_e( 'Medium (15%)', 'qr-code-generator' ); ?></option>
									<option value="Q"><?php esc_html_e( 'Quartile (25%)', 'qr-code-generator' ); ?></option>
									<option value="H"><?php esc_html_e( 'High (30%)', 'qr-code-generator' ); ?></option>
								</select>
							</div>

							<div class="qrcg__control">
								<label for="<?php echo esc_attr( $id ); ?>-gradient"><?php esc_html_e( 'Fill', 'qr-code-generator' ); ?></label>
								<select id="<?php echo esc_attr( $id ); ?>-gradient" class="qrcg__select" data-role="gradient">
									<option value="none"><?php esc_html_e( 'Solid colour', 'qr-code-generator' ); ?></option>
									<option value="linear"><?php esc_html_e( 'Linear gradient', 'qr-code-generator' ); ?></option>
									<option value="radial"><?php esc_html_e( 'Radial gradient', 'qr-code-generator' ); ?></option>
								</select>
							</div>

							<div class="qrcg__control qrcg__control--color">
								<label for="<?php echo esc_attr( $id ); ?>-fg"><?php esc_html_e( 'Colour', 'qr-code-generator' ); ?></label>
								<input type="color" id="<?php echo esc_attr( $id ); ?>-fg" class="qrcg__color" data-role="fg" value="<?php echo esc_attr( $fg ); ?>">
							</div>

							<div class="qrcg__control qrcg__control--color" data-role="fg2-wrap" hidden>
								<label for="<?php echo esc_attr( $id ); ?>-fg2"><?php esc_html_e( 'Colour 2', 'qr-code-generator' ); ?></label>
								<input type="color" id="<?php echo esc_attr( $id ); ?>-fg2" class="qrcg__color" data-role="fg2" value="<?php echo esc_attr( $fg2 ); ?>">
							</div>

							<div class="qrcg__control qrcg__control--color">
								<label for="<?php echo esc_attr( $id ); ?>-bg"><?php esc_html_e( 'Background', 'qr-code-generator' ); ?></label>
								<input type="color" id="<?php echo esc_attr( $id ); ?>-bg" class="qrcg__color" data-role="bg" value="<?php echo esc_attr( 'transparent' === $bg ? '#ffffff' : $bg ); ?>">
								<label class="qrcg__checkbox">
									<input type="checkbox" data-role="bg-transparent" <?php checked( 'transparent', $bg ); ?>>
									<?php esc_html_e( 'Transparent', 'qr-code-generator' ); ?>
								</label>
							</div>

							<div class="qrcg__control">
								<label for="<?php echo esc_attr( $id ); ?>-size">
									<?php esc_html_e( 'Size', 'qr-code-generator' ); ?>
									<span class="qrcg__size-value" data-role="size-value"><?php echo esc_html( (string) $size ); ?>px</span>
								</label>
								<input type="range" id="<?php echo esc_attr( $id ); ?>-size" class="qrcg__range" data-role="size" min="120" max="1000" step="10" value="<?php echo esc_attr( (string) $size ); ?>">
							</div>

							<div class="qrcg__control qrcg__control--logo">
								<label for="<?php echo esc_attr( $id ); ?>-logo"><?php esc_html_e( 'Centre logo', 'qr-code-generator' ); ?></label>
								<input type="file" id="<?php echo esc_attr( $id ); ?>-logo" class="qrcg__file" data-role="logo" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif">
								<button type="button" class="qrcg__link" data-role="logo-remove" hidden><?php esc_html_e( 'Remove logo', 'qr-code-generator' ); ?></button>
							</div>
						</div>
					<?php endif; ?>
				</div>

				<div class="qrcg__result">
					<div class="qrcg__canvas-wrap" data-role="canvas-wrap"></div>
					<p class="qrcg__status" data-role="status" role="status" aria-live="polite"></p>

					<?php if ( $show_download ) : ?>
						<div class="qrcg__actions" data-role="actions" hidden>
							<button type="button" class="qrcg__btn" data-role="download-png"><?php esc_html_e( 'Download PNG', 'qr-code-generator' ); ?></button>
							<button type="button" class="qrcg__btn qrcg__btn--ghost" data-role="download-svg"><?php esc_html_e( 'Download SVG', 'qr-code-generator' ); ?></button>
						</div>
					<?php endif; ?>
				</div>
			</div>

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
