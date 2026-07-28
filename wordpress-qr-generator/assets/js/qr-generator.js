/**
 * QR Code Generator - front-end logic.
 *
 * Wires up every [qr_generator] instance on the page. All work happens in the
 * browser using the bundled qr-code-styling library (MIT, Denys Kozak), which
 * renders designer QR codes (styled dots, rounded eyes, gradients, centre
 * logo). Nothing is sent to any server.
 *
 * @package QR_Code_Generator
 */
( function () {
	'use strict';

	var QRCodeStyling = window.QRCodeStyling;

	// Localised strings, with safe fallbacks if wp_localize_script did not run.
	var I18N = window.QRCG_I18N || {};
	var STR = {
		empty: I18N.empty || 'Enter some text or a URL above to generate a QR code.',
		tooLong: I18N.tooLong || 'That content is too long to fit in a QR code. Try shortening it.',
		genericErr: I18N.genericErr || 'Sorry, the QR code could not be generated.',
		ready: I18N.ready || 'QR code ready. Scan to test before you share it.',
		lowContrast: I18N.lowContrast || 'Low contrast between colours may be hard to scan.',
		logoTooBig: I18N.logoTooBig || 'Large logos can block scanning. Keep the logo small and test the code.',
		badImage: I18N.badImage || 'That image could not be loaded. Please choose a PNG, JPG, or SVG file.'
	};

	/**
	 * Quick-style templates. Each overrides a subset of the current settings to
	 * give a one-click "look", the way Canva-style pickers do.
	 */
	var TEMPLATES = {
		classic: { dot: 'square', eye: 'square', gradient: 'none', fg: '#000000', bg: '#ffffff' },
		rounded: { dot: 'rounded', eye: 'rounded', gradient: 'none', fg: '#1a1a2e', bg: '#ffffff' },
		dots: { dot: 'dots', eye: 'dot', gradient: 'none', fg: '#0f766e', bg: '#ffffff' },
		elegant: { dot: 'classy-rounded', eye: 'rounded', gradient: 'linear', fg: '#4f46e5', fg2: '#9333ea', bg: '#ffffff' },
		bold: { dot: 'extra-rounded', eye: 'rounded', gradient: 'none', fg: '#e11d48', bg: '#ffffff' },
		ocean: { dot: 'rounded', eye: 'rounded', gradient: 'linear', fg: '#0ea5e9', fg2: '#2563eb', bg: '#ffffff' }
	};

	/**
	 * Debounce helper.
	 *
	 * @param {Function} fn    Callback.
	 * @param {number}   delay Delay in ms.
	 * @return {Function}
	 */
	function debounce( fn, delay ) {
		var timer = null;
		return function () {
			var context = this;
			var args = arguments;
			window.clearTimeout( timer );
			timer = window.setTimeout( function () {
				fn.apply( context, args );
			}, delay );
		};
	}

	/**
	 * Relative luminance of a hex colour (WCAG), for a contrast sanity check.
	 *
	 * @param {string} hex Colour like #rrggbb or #rgb.
	 * @return {number} 0 (black) to 1 (white).
	 */
	function luminance( hex ) {
		var h = ( hex || '' ).replace( '#', '' );
		if ( 3 === h.length ) {
			h = h[ 0 ] + h[ 0 ] + h[ 1 ] + h[ 1 ] + h[ 2 ] + h[ 2 ];
		}
		if ( 6 !== h.length ) {
			return 0;
		}
		var rgb = [ 0, 1, 2 ].map( function ( i ) {
			var c = parseInt( h.substr( i * 2, 2 ), 16 ) / 255;
			return c <= 0.03928 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 );
		} );
		return 0.2126 * rgb[ 0 ] + 0.7152 * rgb[ 1 ] + 0.0722 * rgb[ 2 ];
	}

	/**
	 * Contrast ratio between two hex colours (1 to 21).
	 *
	 * @param {string} a First colour.
	 * @param {string} b Second colour.
	 * @return {number}
	 */
	function contrastRatio( a, b ) {
		var la = luminance( a );
		var lb = luminance( b );
		var hi = Math.max( la, lb );
		var lo = Math.min( la, lb );
		return ( hi + 0.05 ) / ( lo + 0.05 );
	}

	/**
	 * Controller for a single QR generator widget.
	 *
	 * @param {HTMLElement} root Widget root element.
	 * @constructor
	 */
	function QrWidget( root ) {
		this.root = root;

		var config = {};
		try {
			config = JSON.parse( root.getAttribute( 'data-config' ) || '{}' );
		} catch ( e ) {
			config = {};
		}
		this.config = config;

		this.input = root.querySelector( '.qrcg__input' );
		this.canvasWrap = root.querySelector( '[data-role="canvas-wrap"]' );
		this.status = root.querySelector( '[data-role="status"]' );
		this.actions = root.querySelector( '[data-role="actions"]' );

		this.dotInput = root.querySelector( '[data-role="dot"]' );
		this.eyeInput = root.querySelector( '[data-role="eye"]' );
		this.eclInput = root.querySelector( '[data-role="ecl"]' );
		this.gradientInput = root.querySelector( '[data-role="gradient"]' );
		this.fgInput = root.querySelector( '[data-role="fg"]' );
		this.fg2Input = root.querySelector( '[data-role="fg2"]' );
		this.fg2Wrap = root.querySelector( '[data-role="fg2-wrap"]' );
		this.bgInput = root.querySelector( '[data-role="bg"]' );
		this.bgTransparent = root.querySelector( '[data-role="bg-transparent"]' );
		this.sizeInput = root.querySelector( '[data-role="size"]' );
		this.sizeValue = root.querySelector( '[data-role="size-value"]' );
		this.logoInput = root.querySelector( '[data-role="logo"]' );
		this.logoRemove = root.querySelector( '[data-role="logo-remove"]' );

		this.downloadPngBtn = root.querySelector( '[data-role="download-png"]' );
		this.downloadSvgBtn = root.querySelector( '[data-role="download-svg"]' );

		this.logoData = null;
		this.qr = null;
		this.hasResult = false;

		this.applyConfigToControls();
		this.bind();

		// Apply an initial template if one was requested via the shortcode.
		if ( this.config.template && TEMPLATES[ this.config.template ] ) {
			this.applyTemplate( this.config.template );
		} else {
			this.render();
		}
	}

	/**
	 * Seeds the form controls from the server-provided config.
	 */
	QrWidget.prototype.applyConfigToControls = function () {
		var c = this.config;
		if ( this.dotInput && c.dot ) {
			this.dotInput.value = c.dot;
		}
		if ( this.eyeInput && c.eye ) {
			this.eyeInput.value = c.eye;
		}
		if ( this.eclInput && c.ecl ) {
			this.eclInput.value = c.ecl;
		}
		if ( this.gradientInput && c.gradient ) {
			this.gradientInput.value = c.gradient;
		}
		if ( this.fgInput && c.fg ) {
			this.fgInput.value = c.fg;
		}
		if ( this.fg2Input && c.fg2 ) {
			this.fg2Input.value = c.fg2;
		}
		if ( this.sizeInput && c.size ) {
			this.sizeInput.value = c.size;
		}
		this.syncGradientVisibility();
		this.syncBackgroundToggle();
	};

	/**
	 * Shows the second colour picker only when a gradient fill is selected.
	 */
	QrWidget.prototype.syncGradientVisibility = function () {
		if ( ! this.fg2Wrap || ! this.gradientInput ) {
			return;
		}
		this.fg2Wrap.hidden = 'none' === this.gradientInput.value;
	};

	/**
	 * Disables the background colour picker when "transparent" is ticked.
	 */
	QrWidget.prototype.syncBackgroundToggle = function () {
		if ( ! this.bgInput || ! this.bgTransparent ) {
			return;
		}
		this.bgInput.disabled = this.bgTransparent.checked;
	};

	/**
	 * Reads the current settings from the controls (or config defaults).
	 *
	 * @return {object}
	 */
	QrWidget.prototype.settings = function () {
		var c = this.config;
		var s = {
			text: this.input ? this.input.value : '',
			dot: this.dotInput ? this.dotInput.value : ( c.dot || 'rounded' ),
			eye: this.eyeInput ? this.eyeInput.value : ( c.eye || 'rounded' ),
			ecl: this.eclInput ? this.eclInput.value : ( c.ecl || 'M' ),
			gradient: this.gradientInput ? this.gradientInput.value : ( c.gradient || 'none' ),
			fg: this.fgInput ? this.fgInput.value : ( c.fg || '#000000' ),
			fg2: this.fg2Input ? this.fg2Input.value : ( c.fg2 || '#7c3aed' ),
			size: this.sizeInput ? parseInt( this.sizeInput.value, 10 ) : ( c.size || 320 ),
			logoSize: ( c.logoSize || 25 ) / 100
		};

		if ( this.bgTransparent && this.bgTransparent.checked ) {
			s.bg = 'transparent';
		} else if ( this.bgInput ) {
			s.bg = this.bgInput.value;
		} else {
			s.bg = c.bg || '#ffffff';
		}

		return s;
	};

	/**
	 * Attaches DOM event listeners.
	 */
	QrWidget.prototype.bind = function () {
		var self = this;
		var rerender = debounce( function () {
			self.render();
		}, 180 );

		if ( this.input ) {
			this.input.addEventListener( 'input', rerender );
		}

		[ this.dotInput, this.eyeInput, this.eclInput ].forEach( function ( el ) {
			if ( el ) {
				el.addEventListener( 'change', function () {
					self.render();
				} );
			}
		} );

		if ( this.gradientInput ) {
			this.gradientInput.addEventListener( 'change', function () {
				self.syncGradientVisibility();
				self.render();
			} );
		}

		[ this.fgInput, this.fg2Input, this.bgInput ].forEach( function ( el ) {
			if ( el ) {
				el.addEventListener( 'input', rerender );
			}
		} );

		if ( this.bgTransparent ) {
			this.bgTransparent.addEventListener( 'change', function () {
				self.syncBackgroundToggle();
				self.render();
			} );
		}

		if ( this.sizeInput ) {
			this.sizeInput.addEventListener( 'input', function () {
				if ( self.sizeValue ) {
					self.sizeValue.textContent = self.sizeInput.value + 'px';
				}
				rerender();
			} );
		}

		// Quick-style template chips.
		var chips = this.root.querySelectorAll( '[data-template]' );
		var i;
		for ( i = 0; i < chips.length; i++ ) {
			( function ( chip ) {
				chip.addEventListener( 'click', function () {
					self.applyTemplate( chip.getAttribute( 'data-template' ) );
				} );
			} )( chips[ i ] );
		}

		if ( this.logoInput ) {
			this.logoInput.addEventListener( 'change', function ( ev ) {
				self.handleLogo( ev.target.files && ev.target.files[ 0 ] );
			} );
		}
		if ( this.logoRemove ) {
			this.logoRemove.addEventListener( 'click', function () {
				self.clearLogo();
			} );
		}

		if ( this.downloadPngBtn ) {
			this.downloadPngBtn.addEventListener( 'click', function () {
				self.download( 'png' );
			} );
		}
		if ( this.downloadSvgBtn ) {
			this.downloadSvgBtn.addEventListener( 'click', function () {
				self.download( 'svg' );
			} );
		}
	};

	/**
	 * Applies a quick-style template to the controls, then re-renders.
	 *
	 * @param {string} name Template key.
	 */
	QrWidget.prototype.applyTemplate = function ( name ) {
		var tpl = TEMPLATES[ name ];
		if ( ! tpl ) {
			return;
		}
		if ( this.dotInput && tpl.dot ) {
			this.dotInput.value = tpl.dot;
		}
		if ( this.eyeInput && tpl.eye ) {
			this.eyeInput.value = tpl.eye;
		}
		if ( this.gradientInput && tpl.gradient ) {
			this.gradientInput.value = tpl.gradient;
		}
		if ( this.fgInput && tpl.fg ) {
			this.fgInput.value = tpl.fg;
		}
		if ( this.fg2Input && tpl.fg2 ) {
			this.fg2Input.value = tpl.fg2;
		}
		if ( this.bgInput && tpl.bg ) {
			this.bgInput.value = tpl.bg;
		}
		if ( this.bgTransparent ) {
			this.bgTransparent.checked = false;
		}

		// Reflect the active chip.
		var chips = this.root.querySelectorAll( '[data-template]' );
		var i;
		for ( i = 0; i < chips.length; i++ ) {
			chips[ i ].classList.toggle( 'is-active', chips[ i ].getAttribute( 'data-template' ) === name );
		}

		this.syncGradientVisibility();
		this.syncBackgroundToggle();
		this.render();
	};

	/**
	 * Reads a chosen logo file into a data URL.
	 *
	 * @param {File} file The selected file.
	 */
	QrWidget.prototype.handleLogo = function ( file ) {
		var self = this;
		if ( ! file ) {
			return;
		}
		var reader = new FileReader();
		reader.onload = function ( e ) {
			self.logoData = e.target.result;
			if ( self.logoRemove ) {
				self.logoRemove.hidden = false;
			}
			// A logo needs the highest error correction to stay scannable.
			if ( self.eclInput ) {
				self.eclInput.value = 'H';
			}
			self.render();
		};
		reader.onerror = function () {
			self.setStatus( STR.badImage, self.hasResult );
		};
		reader.readAsDataURL( file );
	};

	/**
	 * Removes the current logo.
	 */
	QrWidget.prototype.clearLogo = function () {
		this.logoData = null;
		if ( this.logoInput ) {
			this.logoInput.value = '';
		}
		if ( this.logoRemove ) {
			this.logoRemove.hidden = true;
		}
		this.render();
	};

	/**
	 * Shows a status message and toggles the download actions.
	 *
	 * @param {string}  message   Message to display (empty to clear).
	 * @param {boolean} hasResult Whether a valid QR code is currently shown.
	 */
	QrWidget.prototype.setStatus = function ( message, hasResult ) {
		if ( this.status ) {
			this.status.textContent = message;
		}
		if ( this.actions ) {
			this.actions.hidden = ! hasResult;
		}
	};

	/**
	 * Builds the qr-code-styling options object from the current settings.
	 *
	 * @param {object} opts Settings from settings().
	 * @return {object}
	 */
	QrWidget.prototype.buildOptions = function ( opts ) {
		var hasLogo = !! this.logoData;
		// Force high error correction whenever a logo covers part of the code.
		var ecl = hasLogo ? 'H' : opts.ecl;

		// Corner (eye) styles mapped from the friendly "eye" choice.
		var cornerSquareType = 'square';
		var cornerDotType = 'square';
		if ( 'rounded' === opts.eye ) {
			cornerSquareType = 'extra-rounded';
			cornerDotType = 'dot';
		} else if ( 'dot' === opts.eye ) {
			cornerSquareType = 'dot';
			cornerDotType = 'dot';
		}

		var fill;
		if ( 'none' === opts.gradient ) {
			fill = { color: opts.fg };
		} else {
			fill = {
				gradient: {
					type: opts.gradient,
					rotation: Math.PI / 4,
					colorStops: [
						{ offset: 0, color: opts.fg },
						{ offset: 1, color: opts.fg2 }
					]
				}
			};
		}

		var options = {
			width: opts.size,
			height: opts.size,
			type: 'canvas',
			data: opts.text,
			margin: Math.max( 8, Math.round( opts.size * 0.08 ) ),
			qrOptions: { typeNumber: 0, errorCorrectionLevel: ecl },
			dotsOptions: cloneFill( fill, opts.dot ),
			cornersSquareOptions: cloneFill( fill, cornerSquareType ),
			cornersDotOptions: cloneFill( fill, cornerDotType ),
			backgroundOptions: { color: opts.bg }
		};

		if ( hasLogo ) {
			options.image = this.logoData;
			options.imageOptions = {
				hideBackgroundDots: true,
				imageSize: opts.logoSize,
				margin: Math.max( 2, Math.round( opts.size * 0.015 ) ),
				crossOrigin: 'anonymous'
			};
		}

		return options;
	};

	/**
	 * Merges a fill (solid or gradient) with a figure type into one options obj.
	 *
	 * @param {object} fill A { color } or { gradient } object.
	 * @param {string} type Figure type.
	 * @return {object}
	 */
	function cloneFill( fill, type ) {
		var out = { type: type };
		if ( fill.color ) {
			out.color = fill.color;
		}
		if ( fill.gradient ) {
			// Clone so each figure gets an independent gradient definition.
			out.gradient = {
				type: fill.gradient.type,
				rotation: fill.gradient.rotation,
				colorStops: fill.gradient.colorStops.map( function ( s ) {
					return { offset: s.offset, color: s.color };
				} )
			};
		}
		return out;
	}

	/**
	 * Builds / updates the QR code and reports its status.
	 */
	QrWidget.prototype.render = function () {
		if ( 'function' !== typeof QRCodeStyling ) {
			this.setStatus( STR.genericErr, false );
			return;
		}

		var opts = this.settings();
		var text = ( opts.text || '' ).trim();

		if ( '' === text ) {
			this.hasResult = false;
			if ( this.qr && this.canvasWrap ) {
				this.canvasWrap.innerHTML = '';
				this.qr = null;
			}
			this.setStatus( STR.empty, false );
			return;
		}

		var options = this.buildOptions( opts );

		try {
			if ( ! this.qr ) {
				this.qr = new QRCodeStyling( options );
				this.canvasWrap.innerHTML = '';
				this.qr.append( this.canvasWrap );
			} else {
				this.qr.update( options );
			}
		} catch ( e ) {
			this.hasResult = false;
			this.setStatus( this.isOverflow( e ) ? STR.tooLong : STR.genericErr, false );
			return;
		}

		this.hasResult = true;
		this.setStatus( this.scanWarning( opts ) || STR.ready, true );
	};

	/**
	 * Detects the library's "code length overflow" error.
	 *
	 * @param {Error|string} e Thrown value.
	 * @return {boolean}
	 */
	QrWidget.prototype.isOverflow = function ( e ) {
		var msg = ( e && e.message ) ? e.message : String( e );
		return /overflow/i.test( msg );
	};

	/**
	 * Returns a non-blocking scannability caution, or empty string.
	 *
	 * @param {object} opts Current settings.
	 * @return {string}
	 */
	QrWidget.prototype.scanWarning = function ( opts ) {
		if ( this.logoData && opts.logoSize > 0.3 ) {
			return STR.logoTooBig;
		}
		if ( 'transparent' !== opts.bg ) {
			var ratio = contrastRatio( opts.fg, opts.bg );
			if ( 'none' !== opts.gradient ) {
				ratio = Math.min( ratio, contrastRatio( opts.fg2, opts.bg ) );
			}
			if ( ratio < 2.5 ) {
				return STR.lowContrast;
			}
		}
		return '';
	};

	/**
	 * Downloads the current QR code in the requested format.
	 *
	 * @param {string} ext "png" or "svg".
	 */
	QrWidget.prototype.download = function ( ext ) {
		if ( ! this.qr || ! this.hasResult ) {
			return;
		}
		var self = this;
		this.qr.getRawData( ext ).then( function ( blob ) {
			if ( ! blob ) {
				self.setStatus( STR.genericErr, true );
				return;
			}
			var url = window.URL.createObjectURL( blob );
			var link = document.createElement( 'a' );
			link.href = url;
			link.download = 'qr-code.' + ext;
			document.body.appendChild( link );
			link.click();
			document.body.removeChild( link );
			window.setTimeout( function () {
				window.URL.revokeObjectURL( url );
			}, 1000 );
		} ).catch( function () {
			self.setStatus( STR.genericErr, true );
		} );
	};

	/**
	 * Boots every widget on the page.
	 */
	function init() {
		var nodes = document.querySelectorAll( '.qrcg' );
		var i;
		for ( i = 0; i < nodes.length; i++ ) {
			if ( ! nodes[ i ].getAttribute( 'data-qrcg-ready' ) ) {
				nodes[ i ].setAttribute( 'data-qrcg-ready', '1' );
				new QrWidget( nodes[ i ] );
			}
		}
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
