/**
 * QR Code Generator - front-end logic.
 *
 * Wires up every [qr_generator] instance on the page. All work is done in the
 * browser using the bundled qrcode-generator library (MIT, Kazuhiko Arase);
 * nothing is sent to any server.
 *
 * @package QR_Code_Generator
 */
( function () {
	'use strict';

	// Localised strings, with safe fallbacks if wp_localize_script did not run.
	var I18N = window.QRCG_I18N || {};
	var STR = {
		empty: I18N.empty || 'Enter some text or a URL above to generate a QR code.',
		tooLong: I18N.tooLong || 'That content is too long to fit in a QR code. Try shortening it.',
		genericErr: I18N.genericErr || 'Sorry, the QR code could not be generated.',
		ready: I18N.ready || 'QR code ready.'
	};

	// Standard QR quiet zone, expressed in modules.
	var QUIET_ZONE = 4;

	// Make the bundled library encode input as UTF-8 so non-ASCII text works.
	if ( window.qrcode && window.qrcode.stringToBytesFuncs && window.qrcode.stringToBytesFuncs['UTF-8'] ) {
		window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs['UTF-8'];
	}

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
	 * Controller for a single QR generator widget.
	 *
	 * @param {HTMLElement} root Widget root element.
	 * @constructor
	 */
	function QrWidget( root ) {
		this.root = root;
		this.input = root.querySelector( '.qrcg__input' );
		this.canvasWrap = root.querySelector( '[data-role="canvas-wrap"]' );
		this.status = root.querySelector( '[data-role="status"]' );
		this.actions = root.querySelector( '[data-role="actions"]' );

		this.sizeInput = root.querySelector( '[data-role="size"]' );
		this.sizeValue = root.querySelector( '[data-role="size-value"]' );
		this.eclInput = root.querySelector( '[data-role="ecl"]' );
		this.fgInput = root.querySelector( '[data-role="fg"]' );
		this.bgInput = root.querySelector( '[data-role="bg"]' );

		this.downloadPngBtn = root.querySelector( '[data-role="download-png"]' );
		this.downloadSvgBtn = root.querySelector( '[data-role="download-svg"]' );

		// Defaults come from the server-rendered data attributes.
		this.defaults = {
			size: parseInt( root.getAttribute( 'data-size' ), 10 ) || 300,
			ecl: root.getAttribute( 'data-ecl' ) || 'M',
			fg: root.getAttribute( 'data-fg' ) || '#000000',
			bg: root.getAttribute( 'data-bg' ) || '#ffffff'
		};

		// State captured from the last successful render (used for downloads).
		this.lastModules = null;
		this.lastCount = 0;

		this.bind();
		this.render();
	}

	/**
	 * Current settings, reading from controls when present or defaults otherwise.
	 *
	 * @return {{text:string,size:number,ecl:string,fg:string,bg:string}}
	 */
	QrWidget.prototype.settings = function () {
		return {
			text: this.input ? this.input.value : '',
			size: this.sizeInput ? parseInt( this.sizeInput.value, 10 ) : this.defaults.size,
			ecl: this.eclInput ? this.eclInput.value : this.defaults.ecl,
			fg: this.fgInput ? this.fgInput.value : this.defaults.fg,
			bg: this.bgInput ? this.bgInput.value : this.defaults.bg
		};
	};

	/**
	 * Attaches DOM event listeners.
	 */
	QrWidget.prototype.bind = function () {
		var self = this;
		var rerender = debounce( function () {
			self.render();
		}, 200 );

		if ( this.input ) {
			this.input.addEventListener( 'input', rerender );
		}
		if ( this.eclInput ) {
			this.eclInput.addEventListener( 'change', function () {
				self.render();
			} );
		}
		if ( this.fgInput ) {
			this.fgInput.addEventListener( 'input', rerender );
		}
		if ( this.bgInput ) {
			this.bgInput.addEventListener( 'input', rerender );
		}
		if ( this.sizeInput ) {
			this.sizeInput.addEventListener( 'input', function () {
				if ( self.sizeValue ) {
					self.sizeValue.textContent = self.sizeInput.value + 'px';
				}
				rerender();
			} );
		}
		if ( this.downloadPngBtn ) {
			this.downloadPngBtn.addEventListener( 'click', function () {
				self.downloadPng();
			} );
		}
		if ( this.downloadSvgBtn ) {
			this.downloadSvgBtn.addEventListener( 'click', function () {
				self.downloadSvg();
			} );
		}
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
	 * Builds the QR model and draws it, or reports why it could not be built.
	 */
	QrWidget.prototype.render = function () {
		var opts = this.settings();
		var text = ( opts.text || '' ).trim();

		this.canvasWrap.innerHTML = '';
		this.lastModules = null;
		this.lastCount = 0;

		if ( '' === text ) {
			this.setStatus( STR.empty, false );
			return;
		}

		if ( typeof window.qrcode !== 'function' ) {
			this.setStatus( STR.genericErr, false );
			return;
		}

		var qr;
		try {
			// typeNumber 0 lets the library auto-select the smallest version.
			qr = window.qrcode( 0, opts.ecl );
			qr.addData( text );
			qr.make();
		} catch ( e ) {
			// The library throws when data overflows the largest QR version.
			this.setStatus( STR.tooLong, false );
			return;
		}

		var count = qr.getModuleCount();
		var modules = [];
		var r;
		var c;
		for ( r = 0; r < count; r++ ) {
			modules[ r ] = [];
			for ( c = 0; c < count; c++ ) {
				modules[ r ][ c ] = qr.isDark( r, c );
			}
		}

		this.lastModules = modules;
		this.lastCount = count;
		this.lastColors = { fg: opts.fg, bg: opts.bg };

		this.drawCanvas( modules, count, opts );
		this.setStatus( STR.ready, true );
	};

	/**
	 * Draws the module matrix onto a canvas.
	 *
	 * @param {boolean[][]} modules Dark/light matrix.
	 * @param {number}      count   Modules per side.
	 * @param {object}      opts    Current settings.
	 */
	QrWidget.prototype.drawCanvas = function ( modules, count, opts ) {
		var totalModules = count + QUIET_ZONE * 2;
		// Pixels per module, chosen so the final image is close to the requested size.
		var cell = Math.max( 1, Math.round( opts.size / totalModules ) );
		var dim = cell * totalModules;

		var canvas = document.createElement( 'canvas' );
		canvas.width = dim;
		canvas.height = dim;
		canvas.className = 'qrcg__canvas';
		canvas.setAttribute( 'role', 'img' );
		canvas.setAttribute( 'aria-label', STR.ready );
		// Display responsively without upscaling beyond the natural size.
		canvas.style.maxWidth = '100%';
		canvas.style.width = dim + 'px';
		canvas.style.height = 'auto';

		var ctx = canvas.getContext( '2d' );
		ctx.fillStyle = opts.bg;
		ctx.fillRect( 0, 0, dim, dim );

		ctx.fillStyle = opts.fg;
		var r;
		var c;
		for ( r = 0; r < count; r++ ) {
			for ( c = 0; c < count; c++ ) {
				if ( modules[ r ][ c ] ) {
					ctx.fillRect(
						( c + QUIET_ZONE ) * cell,
						( r + QUIET_ZONE ) * cell,
						cell,
						cell
					);
				}
			}
		}

		this.canvasWrap.appendChild( canvas );
		this.lastCanvas = canvas;
	};

	/**
	 * Builds a scalable SVG string from the last rendered matrix.
	 *
	 * @return {string|null}
	 */
	QrWidget.prototype.buildSvg = function () {
		if ( ! this.lastModules || ! this.lastCount ) {
			return null;
		}
		var count = this.lastCount;
		var total = count + QUIET_ZONE * 2;
		var colors = this.lastColors || { fg: '#000000', bg: '#ffffff' };

		var path = '';
		var r;
		var c;
		for ( r = 0; r < count; r++ ) {
			for ( c = 0; c < count; c++ ) {
				if ( this.lastModules[ r ][ c ] ) {
					// One unit square per dark module, offset by the quiet zone.
					path += 'M' + ( c + QUIET_ZONE ) + ',' + ( r + QUIET_ZONE ) + 'h1v1h-1z';
				}
			}
		}

		return (
			'<?xml version="1.0" encoding="UTF-8"?>\n' +
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" ' +
			'shape-rendering="crispEdges" width="' + total + '" height="' + total + '">' +
			'<rect width="' + total + '" height="' + total + '" fill="' + colors.bg + '"/>' +
			'<path d="' + path + '" fill="' + colors.fg + '"/>' +
			'</svg>\n'
		);
	};

	/**
	 * Triggers a file download from a data/object URL.
	 *
	 * @param {string} url      Href.
	 * @param {string} filename Suggested file name.
	 */
	QrWidget.prototype.triggerDownload = function ( url, filename ) {
		var link = document.createElement( 'a' );
		link.href = url;
		link.download = filename;
		document.body.appendChild( link );
		link.click();
		document.body.removeChild( link );
	};

	/**
	 * Downloads the current QR code as a PNG.
	 */
	QrWidget.prototype.downloadPng = function () {
		if ( ! this.lastCanvas ) {
			return;
		}
		try {
			var url = this.lastCanvas.toDataURL( 'image/png' );
			this.triggerDownload( url, 'qr-code.png' );
		} catch ( e ) {
			this.setStatus( STR.genericErr, true );
		}
	};

	/**
	 * Downloads the current QR code as an SVG.
	 */
	QrWidget.prototype.downloadSvg = function () {
		var svg = this.buildSvg();
		if ( ! svg ) {
			return;
		}
		var blob = new Blob( [ svg ], { type: 'image/svg+xml;charset=utf-8' } );
		var url = window.URL.createObjectURL( blob );
		this.triggerDownload( url, 'qr-code.svg' );
		// Release the object URL after the click has been processed.
		window.setTimeout( function () {
			window.URL.revokeObjectURL( url );
		}, 1000 );
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
