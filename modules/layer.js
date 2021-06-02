export class StreamViewLayer extends CanvasLayer {
	constructor() {
		super();
	}

	static get layerOptions() {
		return mergeObject(super.layerOptions, {
			canDragCreate: false,
			zIndex: 1000,
		});
	}

	static documentName = 'StreamViewLayer';
}