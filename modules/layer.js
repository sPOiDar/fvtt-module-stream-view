import { StreamViewOptions } from './options.js';
import './types.js';

export class StreamViewLayer extends InteractionLayer {
	/**
	 * @type {LayerPreview}
	 */
	#previewData = {
		x: 0,
		y: 0,
		width: 0,
		height: 0,
	}

	/**
	 * @type {PIXI.DisplayObject|null}
	 */
	#preview = null;

	constructor() {
		super();
		this.#createPreview();
	}

	static documentName = 'StreamViewLayer';

	/** @override */
	static get layerOptions() {
		return foundry.utils.mergeObject(super.layerOptions, {
			name: "stream-view",
			sortActiveTop: true,
			zIndex: 999,
		});
	}

	/**
	 * @private
	 */
	#createPreview() {
		this.#preview ||= this.addChild(new PIXI.Graphics());
	}

	/**
	 * @param {LayerPreview} view
	 * @private
	 */
	#drawPreview({ x, y, width, height }) {
		this.#preview.clear();
		const previewMode = game.settings.get('stream-view', 'preview-display');
		if (previewMode === StreamViewOptions.PreviewDisplay.NEVER || (previewMode === StreamViewOptions.PreviewDisplay.LAYER && !this.active)) {
			return;
		}
		this.#preview.beginFill(0x0000dd, 0.05)
			.lineStyle({ color: 0x0000dd, alpha: 0.2, width: 1 })
			.drawRect(x, y, width, height)
			.endFill();
	}

	/** @override */
	async _draw(options) {
		this.interactiveChildren = false;
		this.#createPreview()
	}

	/** @override */
	async _tearDown(options) {
		if (this.#preview) {
			this.#preview.clear();
		}
		this.#preview = undefined;
		super._tearDown(options);
	}

	/** @override */
	_activate() {
		super._activate();
		if (game.settings.get('stream-view', 'preview-display') === StreamViewOptions.PreviewDisplay.LAYER) {
			this.#drawPreview(this.#previewData);
		}
	}

	/** @override */
	_deactivate() {
		if (game.settings.get('stream-view', 'preview-display') === StreamViewOptions.PreviewDisplay.LAYER) {
			this.#preview.clear();
		}
		super._deactivate();
	}

	refresh() {
		this.#drawPreview(this.#previewData);
	}

	/**
	 * @param {LayerPreview} view
	 */
	drawPreview({ x, y, width, height }) {
		this.#previewData = { x, y, width, height };
		this.#drawPreview({ x, y, width, height });
	}
}