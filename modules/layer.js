import { StreamViewOptions } from './options.js';

export class StreamViewLayer extends InteractionLayer {
	constructor() {
		super();
		this._previewData = {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
		}
		this._createPreview();
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

	_createPreview() {
		this._preview ||= this.addChild(new PIXI.Graphics());
	}

	_drawPreview({ x, y, width, height }) {
		this._preview.clear();
		const previewMode = game.settings.get('stream-view', 'preview-display');
		if (previewMode === StreamViewOptions.PreviewDisplay.NEVER || (previewMode === StreamViewOptions.PreviewDisplay.LAYER && !this.active)) {
			return;
		}
		this._preview.beginFill(0x0000dd, 0.05)
			.lineStyle({ color: 0x0000dd, alpha: 0.2, width: 1 })
			.drawRect(x, y, width, height)
			.endFill();
	}

	/** @override */
	async _draw(options) {
		this.interactiveChildren = false;
		this._createPreview()
	}

	/** @override */
	async _tearDown(options) {
		if (this._preview) {
			this._preview.clear();
		}
		this._preview = undefined;
		super._tearDown(options);
	}

	/** @override */
	_activate() {
		super._activate();
		if (game.settings.get('stream-view', 'preview-display') === StreamViewOptions.PreviewDisplay.LAYER) {
			this._drawPreview(this._previewData);
		}
	}

	/** @override */
	_deactivate() {
		if (game.settings.get('stream-view', 'preview-display') === StreamViewOptions.PreviewDisplay.LAYER) {
			this._preview.clear();
		}
		super._deactivate();
	}

	refresh() {
		this._drawPreview(this._previewData);
	}

	drawPreview({ x, y, width, height }) {
		this._previewData = { x, y, width, height };
		this._drawPreview({ x, y, width, height });
	}
}