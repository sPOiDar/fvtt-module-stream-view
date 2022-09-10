export class StreamViewOptions {
	static CameraMode = {
		AUTOMATIC: 'automatic',
		DIRECTED: 'directed',
	};
	static PreviewDisplay = {
		NEVER: 'never',
		ALWAYS: 'always',
		LAYER: 'layer',
	};
	static PopoutIdentifiers = {
		COMBAT: 'combat',
		CHAT: 'chat',
	};

	static localizeCameraMode(mode) {
		return game.i18n.localize(`stream-view.settings.camera-mode.option.${mode}`);
	}

	static localizePreviewDisplay(condition) {
		return game.i18n.localize(`stream-view.settings.preview-display.option.${condition}`);
	}
}