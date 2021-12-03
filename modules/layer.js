import { StreamViewOptions } from './options.js';

export class StreamViewLayer extends CanvasLayer {
	constructor() {
		super();
		this._previewData = {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
		}
		this._preview = this.addChild(new PIXI.Graphics());
	}

	static documentName = 'StreamViewLayer';

	/** @override */
	static get layerOptions() {
		return mergeObject(super.layerOptions, {
			canDragCreate: false,
			zIndex: 999,
		});
	}

	_drawPreview({ x, y, width, height }) {
		this._preview.clear();
		const previewMode = game.settings.get('stream-view', 'preview-display');
		if (previewMode === StreamViewOptions.PreviewDisplay.NEVER || (previewMode === StreamViewOptions.PreviewDisplay.LAYER && !this._active)) {
			return;
		}
		this._preview.beginFill(0x0000dd, 0.05)
			.lineStyle({ color: 0x0000dd, alpha: 0.2, width: 1 })
			.drawRect(x, y, width, height)
			.endFill();
	}

	/** @override */
	async draw() {
		this.interactiveChildren = false;
		return this;
	}

	/** @override */
	async tearDown() {
		this._preview.clear();
		return this;
	}

	/** @override */
	activate() {
		super.activate();
		if (game.settings.get('stream-view', 'preview-display') === StreamViewOptions.PreviewDisplay.LAYER) {
			this._drawPreview(this._previewData);
		}
		return this;
	}

	/** @override */
	deactivate() {
		super.deactivate();
		if (game.settings.get('stream-view', 'preview-display') === StreamViewOptions.PreviewDisplay.LAYER) {
			this._preview.clear();
		}
		return this;
	}

	refresh() {
		this._drawPreview(this._previewData);
	}

	drawPreview({ x, y, width, height }) {
		this._previewData = { x, y, width, height };
		this._drawPreview({ x, y, width, height });
	}
}