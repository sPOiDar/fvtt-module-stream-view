export class StreamViewOptions {
	/**
	 * @enum {string}
	 * @readonly
	 */
	static CameraMode = Object.freeze({
		AUTOMATIC: 'automatic',
		DIRECTED: 'directed',
		DISABLED: 'disabled',
	});

	/**
	 * @enum {string}
	 * @readonly
	 */
	static PreviewDisplay = Object.freeze({
		NEVER: 'never',
		ALWAYS: 'always',
		LAYER: 'layer',
	});

	/**
	 * @enum {string}
	 * @readonly
	 */
	static PopoutIdentifiers = Object.freeze({
		COMBAT: 'combat',
		CHAT: 'chat',
	});

	static localizeCameraMode(mode) {
		return game.i18n.localize(`stream-view.settings.camera-mode.option.${mode}`);
	}

	static localizePreviewDisplay(condition) {
		return game.i18n.localize(`stream-view.settings.preview-display.option.${condition}`);
	}
}