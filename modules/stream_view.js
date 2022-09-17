import { SpeechBubbles } from './speech_bubbles.js';
import { StreamViewLayer } from './layer.js';
import { StreamViewOptions } from './options.js';

class StreamView {
	static _unknownUserId = 'unknownUser';
	static _defaultUserChoices = { [this._unknownUserId]: '' };
	static TOKEN_TRACKED_EFFECT = {
		id: 'stream-view.token-tracked',
		label: 'stream-view.controls.token-tracked',
		icon: 'modules/stream-view/icons/video-solid.svg',
	}

	static start() {
		const instance = new StreamView();
		Hooks.once('init', () => this.init(instance));
		Hooks.once('socketlib.ready', () =>
			instance.socketReady(socketlib.registerModule('stream-view')),
		);
		Hooks.on('getSceneControlButtons', (app) => instance._addStreamControls(app));
		Hooks.on('renderSceneNavigation', (_app, html) => {
			if (!game.settings.get('stream-view', 'show-scene-navigation')) {
				this.hideHtml(html);
			}
			instance.updateScene();
		});
		Hooks.on('renderPlayerList', (_app, html) => {
			if (!game.settings.get('stream-view', 'show-player-list')) {
				this.hideHtml(html);
			}
		});
		Hooks.on('renderSceneControls', (_app, html) => this.hideHtml(html));
		Hooks.on('renderHotbar', (_app, html) => this.hideHtml(html));
		Hooks.on('renderSidebar', (_app, html) => {
			if (!game.settings.get('stream-view', 'show-full-sidebar')) {
				this.hideHtml(html)
			}
		});
		Hooks.on('renderCameraViews', (_app, html) => this.handleStreamAV(html));
		Hooks.on('renderHeadsUpDisplay', (_app, html) => this.appendSpeechBubblesContainer(html));
		Hooks.on('renderTokenHUD', (_app, html, tokenHUD) => instance._handleTokenHUD(html, tokenHUD));
		Hooks.on('renderSidebarTab', (app, html) => instance._handlePopout(app, html));
		Hooks.on('renderUserConfig', (app, html) => instance._handlePopout(app, html));
		Hooks.on('drawToken', (token) => instance._handleDrawToken(token));
		Hooks.on('updateToken', (doc) => instance._handleUpdateToken(doc));
		Hooks.on('destroyToken', (doc) => instance._handleDestroyToken(doc));
		Hooks.once('ready', () => instance.ready());
	}

	static init(instance) {
		CONFIG.Canvas.layers.streamView = {
			layerClass: StreamViewLayer,
			group: "interface",
		};

		TextureLoader.loader.loadTexture(this.TOKEN_TRACKED_EFFECT.icon);

		// Settings
		game.settings.register('stream-view', 'user-id', {
			name: game.i18n.localize('stream-view.settings.user-id.name'),
			hint: game.i18n.localize('stream-view.settings.user-id.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			choices: this._defaultUserChoices,
			default: this._unknownUserId,
			type: String,
		});

		game.settings.register('stream-view', 'camera-mode', {
			name: game.i18n.localize('stream-view.settings.camera-mode.name'),
			hint: game.i18n.localize('stream-view.settings.camera-mode.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			choices: {
				[StreamViewOptions.CameraMode.AUTOMATIC]: StreamViewOptions.localizeCameraMode(StreamViewOptions.CameraMode.AUTOMATIC),
				[StreamViewOptions.CameraMode.DIRECTED]: StreamViewOptions.localizeCameraMode(StreamViewOptions.CameraMode.DIRECTED),
			},
			default: StreamViewOptions.CameraMode.AUTOMATIC,
			onChange: (mode) => instance._setCameraMode(mode),
			type: String,
		});

		game.settings.register('stream-view', 'disable-combatant-tracking', {
			name: game.i18n.localize('stream-view.settings.disable-combatant-tracking.name'),
			hint: game.i18n.localize('stream-view.settings.disable-combatant-tracking.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: false,
			type: Boolean,
		});

		game.settings.register('stream-view', 'directed-combat', {
			name: game.i18n.localize('stream-view.settings.directed-combat.name'),
			hint: game.i18n.localize('stream-view.settings.directed-combat.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: false,
			type: Boolean,
		});

		game.settings.register('stream-view', 'maximum-scale', {
			name: game.i18n.localize('stream-view.settings.maximum-scale.name'),
			hint: game.i18n.localize('stream-view.settings.maximum-scale.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			range: {
				min: 0.1,
				max: CONFIG.Canvas.maxZoom,
				step: 0.05,
			},
			default: 0.9,
			type: Number,
		});

		game.settings.register('stream-view', 'minimum-scale', {
			name: game.i18n.localize('stream-view.settings.minimum-scale.name'),
			hint: game.i18n.localize('stream-view.settings.minimum-scale.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			range: {
				min: 0.1,
				max: CONFIG.Canvas.maxZoom,
				step: 0.1,
			},
			default: 0.1,
			type: Number,
		});

		game.settings.register('stream-view', 'animation-duration', {
			name: game.i18n.localize('stream-view.settings.animation-duration.name'),
			hint: game.i18n.localize('stream-view.settings.animation-duration.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 400,
			type: Number,
		});

		game.settings.register('stream-view', 'preview-display', {
			name: game.i18n.localize('stream-view.settings.preview-display.name'),
			hint: game.i18n.localize('stream-view.settings.preview-display.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			choices: {
				[StreamViewOptions.PreviewDisplay.NEVER]: StreamViewOptions.localizePreviewDisplay(StreamViewOptions.PreviewDisplay.NEVER),
				[StreamViewOptions.PreviewDisplay.ALWAYS]: StreamViewOptions.localizePreviewDisplay(StreamViewOptions.PreviewDisplay.ALWAYS),
				[StreamViewOptions.PreviewDisplay.LAYER]: StreamViewOptions.localizePreviewDisplay(StreamViewOptions.PreviewDisplay.LAYER),
			},
			default: StreamViewOptions.PreviewDisplay.LAYER,
			onChange: () => this._previewRefresh(),
			type: String,
		});

		game.settings.register('stream-view', 'show-speech-bubbles', {
			name: game.i18n.localize('stream-view.settings.show-speech-bubbles.name'),
			hint: game.i18n.localize('stream-view.settings.show-speech-bubbles.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: true,
			type: Boolean,
		});

		game.settings.register('stream-view', 'pan-on-user-speaking', {
			name: game.i18n.localize('stream-view.settings.pan-on-user-speaking.name'),
			hint: game.i18n.localize('stream-view.settings.pan-on-user-speaking.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: true,
			type: Boolean,
		});

		game.settings.register('stream-view', 'speaker-decay', {
			name: game.i18n.localize('stream-view.settings.speaker-decay.name'),
			hint: game.i18n.localize('stream-view.settings.speaker-decay.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 3000,
			type: Number,
		});

		game.settings.register('stream-view', 'show-chat', {
			name: game.i18n.localize('stream-view.settings.show-chat.name'),
			hint: game.i18n.localize('stream-view.settings.show-chat.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: true,
			type: Boolean,
		});

		game.settings.register('stream-view', 'chat-position-x', {
			name: game.i18n.localize('stream-view.settings.chat-position-x.name'),
			hint: game.i18n.localize('stream-view.settings.chat-position-x.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: -320,
			type: Number,
		});

		game.settings.register('stream-view', 'chat-position-y', {
			name: game.i18n.localize('stream-view.settings.chat-position-y.name'),
			hint: game.i18n.localize('stream-view.settings.chat-position-y.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 40,
			type: Number,
		});

		game.settings.register('stream-view', 'auto-show-combat', {
			name: game.i18n.localize('stream-view.settings.auto-show-combat.name'),
			hint: game.i18n.localize('stream-view.settings.auto-show-combat.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: true,
			type: Boolean,
		});

		game.settings.register('stream-view', 'combat-position-x', {
			name: game.i18n.localize('stream-view.settings.combat-position-x.name'),
			hint: game.i18n.localize('stream-view.settings.combat-position-x.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 20,
			type: Number,
		});

		game.settings.register('stream-view', 'combat-position-y', {
			name: game.i18n.localize('stream-view.settings.combat-position-y.name'),
			hint: game.i18n.localize('stream-view.settings.combat-position-y.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 40,
			type: Number,
		});

		game.settings.register('stream-view', 'popout-position-fixed', {
			name: game.i18n.localize('stream-view.settings.popout-position-fixed.name'),
			hint: game.i18n.localize('stream-view.settings.popout-position-fixed.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: false,
			type: Boolean,
		});

		game.settings.register('stream-view', 'popout-position-x', {
			name: game.i18n.localize('stream-view.settings.popout-position-x.name'),
			hint: game.i18n.localize('stream-view.settings.popout-position-x.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 60,
			type: Number,
		});

		game.settings.register('stream-view', 'popout-position-y', {
			name: game.i18n.localize('stream-view.settings.popout-position-y.name'),
			hint: game.i18n.localize('stream-view.settings.popout-position-y.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 120,
			type: Number,
		});

		game.settings.register('stream-view', 'popout-width', {
			name: game.i18n.localize('stream-view.settings.popout-width.name'),
			hint: game.i18n.localize('stream-view.settings.popout-width.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 400,
			type: Number,
		});

		game.settings.register('stream-view', 'popout-height', {
			name: game.i18n.localize('stream-view.settings.popout-height.name'),
			hint: game.i18n.localize('stream-view.settings.popout-height.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 600,
			type: Number,
		});

		game.settings.register('stream-view', 'show-voice-video', {
			name: game.i18n.localize('stream-view.settings.show-voice-video.name'),
			hint: game.i18n.localize('stream-view.settings.show-voice-video.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: true,
			type: Boolean,
		});

		game.settings.register('stream-view', 'voice-video-position', {
			name: game.i18n.localize('stream-view.settings.voice-video-position.name'),
			hint: game.i18n.localize('stream-view.settings.voice-video-position.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			choices: Object.fromEntries(Object.values(AVSettings.DOCK_POSITIONS).map(p => {
				return [p, game.i18n.localize(`WEBRTC.DockPosition${p.titleCase()}`)];
			})),
			default: AVSettings.DOCK_POSITIONS.LEFT,
			type: String,
		});

		game.settings.register('stream-view', 'voice-video-width', {
			name: game.i18n.localize('stream-view.settings.voice-video-width.name'),
			hint: game.i18n.localize('stream-view.settings.voice-video-width.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 240,
			type: Number,
		});

		game.settings.register('stream-view', 'voice-video-nameplate-mode', {
			name: game.i18n.localize('stream-view.settings.voice-video-nameplate-mode.name'),
			hint: game.i18n.localize('stream-view.settings.voice-video-nameplate-mode.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			choices: {
				[AVSettings.NAMEPLATE_MODES.OFF]: game.i18n.localize('WEBRTC.NameplatesOff'),
				[AVSettings.NAMEPLATE_MODES.PLAYER_ONLY]: game.i18n.localize('WEBRTC.NameplatesPlayer'),
				[AVSettings.NAMEPLATE_MODES.CHAR_ONLY]: game.i18n.localize('WEBRTC.NameplatesCharacter'),
				[AVSettings.NAMEPLATE_MODES.BOTH]: game.i18n.localize('WEBRTC.NameplatesBoth'),
			},
			default: AVSettings.NAMEPLATE_MODES.BOTH,
			type: Number,
		});

		game.settings.register('stream-view', 'voice-video-border-color', {
			name: game.i18n.localize('stream-view.settings.voice-video-border-color.name'),
			hint: game.i18n.localize('stream-view.settings.voice-video-border-color.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: true,
			type: Boolean,
		});


		game.settings.register('stream-view', 'show-scene-navigation', {
			name: game.i18n.localize('stream-view.settings.show-scene-navigation.name'),
			hint: game.i18n.localize('stream-view.settings.show-scene-navigation.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: false,
			type: Boolean,
		});

		game.settings.register('stream-view', 'show-logo', {
			name: game.i18n.localize('stream-view.settings.show-logo.name'),
			hint: game.i18n.localize('stream-view.settings.show-logo.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: false,
			type: Boolean,
		});

		game.settings.register('stream-view', 'show-player-list', {
			name: game.i18n.localize('stream-view.settings.show-player-list.name'),
			hint: game.i18n.localize('stream-view.settings.show-player-list.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: false,
			type: Boolean,
		});

		game.settings.register('stream-view', 'padding-left', {
			name: game.i18n.localize('stream-view.settings.padding-left.name'),
			hint: game.i18n.localize('stream-view.settings.padding-left.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'padding-right', {
			name: game.i18n.localize('stream-view.settings.padding-right.name'),
			hint: game.i18n.localize('stream-view.settings.padding-right.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'padding-top', {
			name: game.i18n.localize('stream-view.settings.padding-top.name'),
			hint: game.i18n.localize('stream-view.settings.padding-top.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'padding-bottom', {
			name: game.i18n.localize('stream-view.settings.padding-bottom.name'),
			hint: game.i18n.localize('stream-view.settings.padding-bottom.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'padding-combat-left', {
			name: game.i18n.localize('stream-view.settings.padding-combat-left.name'),
			hint: game.i18n.localize('stream-view.settings.padding-combat-left.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'padding-combat-right', {
			name: game.i18n.localize('stream-view.settings.padding-combat-right.name'),
			hint: game.i18n.localize('stream-view.settings.padding-combat-right.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'padding-combat-top', {
			name: game.i18n.localize('stream-view.settings.padding-combat-top.name'),
			hint: game.i18n.localize('stream-view.settings.padding-combat-top.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'padding-combat-bottom', {
			name: game.i18n.localize('stream-view.settings.padding-combat-bottom.name'),
			hint: game.i18n.localize('stream-view.settings.padding-combat-bottom.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'hide-popout-headers', {
			name: game.i18n.localize('stream-view.settings.hide-popout-headers.name'),
			hint: game.i18n.localize('stream-view.settings.hide-popout-headers.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: true,
			type: Boolean,
		});

		game.settings.register('stream-view', 'popout-auto-close-duration', {
			name: game.i18n.localize('stream-view.settings.popout-auto-close-duration.name'),
			hint: game.i18n.localize('stream-view.settings.popout-auto-close-duration.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 20,
			type: Number,
		});

		game.settings.register('stream-view', 'show-full-sidebar', {
			name: game.i18n.localize('stream-view.settings.show-full-sidebar.name'),
			hint: game.i18n.localize('stream-view.settings.show-full-sidebar.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: false,
			type: Boolean,
		});
	
		// Keybinds
		game.keybindings.register('stream-view', 'camera-mode-toggle', {
			name: game.i18n.localize('stream-view.controls.toggle-camera-mode'),
			onDown: () => instance._toggleCameraMode(),
			restricted: true,
			precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		});

		game.keybindings.register('stream-view', 'token-tracked-enable', {
			name: game.i18n.localize('stream-view.controls.token-tracked-enable'),
			onDown: () => instance._toggleControlledTokenTracking(true),
			restricted: true,
			precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		});

		game.keybindings.register('stream-view', 'token-tracked-clear', {
			name: game.i18n.localize('stream-view.controls.token-tracked-clear'),
			onDown: () => instance._clearTrackedTokens(),
			restricted: true,
			precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		});

		game.keybindings.register('stream-view', 'toggle-foreground-layer', {
			name: game.i18n.localize('stream-view.controls.toggle-foreground-layer'),
			onDown: () => instance._sendToggleForeground(!this._foregroundStatus),
			restricted: true,
			precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		});

		game.keybindings.register('stream-view', 'toggle-notes-layer', {
			name: game.i18n.localize('CONTROLS.NoteToggle'),
			onDown: () => instance._sendToggleNotes(!this._notesStatus),
			restricted: true,
			precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		});

		game.keybindings.register('stream-view', 'close-popouts', {
			name: game.i18n.localize('stream-view.controls.close-popouts'),
			onDown: () => instance._sendClosePopouts(),
			restricted: true,
			precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		});
	}

	static get isStreamUser() {
		return game?.user?.id === game.settings.get('stream-view', 'user-id');
	}

	static appendSpeechBubblesContainer(html) {
		html.append(`<div id="${SpeechBubbles.containerId}"/>`);
	}

	static handleStreamAV(html) {
		if (this.isStreamUser) {
			if (!game.settings.get('stream-view', 'show-voice-video')) {
				this.hideHtml(html);
				return;
			}
			const position = game.settings.get('stream-view', 'voice-video-position');
			const pixels = `${game.settings.get('stream-view', 'voice-video-width')}px`;
			const isVertical = [AVSettings.DOCK_POSITIONS.TOP, AVSettings.DOCK_POSITIONS.BOTTOM].includes(position);
			html.css('--av-width', pixels);
			if (isVertical) {
				html.css('height', pixels);
			} else {
				html.css('width', pixels);
			}
		}

		const streamCamera = html.find(
			`div[data-user="${game.settings.get('stream-view', 'user-id')}"]`,
		);
		if (streamCamera) {
			streamCamera.hide();
		}
	}

	static hideHtml(html) {
		if (!StreamView.isStreamUser) {
			return;
		}

		html.hide();
	}

	static hidePopoutHeaders(html) {
		if (!game.settings.get('stream-view', 'hide-popout-headers')) {
			return;
		}
		html.children('header.window-header').hide();
	}

	static setPopoutPosition(html) {
		if (!game.settings.get('stream-view', 'popout-position-fixed')) {
			return;
		}
		const x = game.settings.get('stream-view', `popout-position-x`);
		const y = game.settings.get('stream-view', `popout-position-y`);
		const width = game.settings.get('stream-view', `popout-width`);
		const height = game.settings.get('stream-view', `popout-height`);

		if (y < 0) {
			html.css('bottom', y * -1);
		} else {
			html.css('top', y);
		}
		if (x < 0) {
			html.css('right', x * -1);
		} else {
			html.css('left', x);
		}
		html.css('width', `${width}px`);
		html.css('height', `${height}px`);
	}

	static isCombatActive(combat) {
		return combat?.current?.round > 0;
	}

	static _previewRefresh() {
		const layer = canvas.layers.find((l) => l instanceof StreamViewLayer);
		if (layer) {
			layer.refresh();
		}
	}

	constructor() {
		this._speechBubbles = new SpeechBubbles();
		this._socket = undefined;
		this._cameraMode = StreamViewOptions.CameraMode.AUTOMATIC;
		this._speakerHistory = new Map();
		this._popouts = new Map();
		this._controlledTokenId = null;
		this._sceneId = null;
		this._debounceAnimateTo = foundry.utils.debounce(this.animateTo.bind(this), 100);
		this._notesStatus = false;
		this._foregroundStatus = false;
		this._trackedTokens = {};
	}

	_coordBounds(coords = []) {
		if (coords.length === 0) {
			return { x: canvas.stage.pivot.x, y: canvas.stage.pivot.y, scale: canvas.stage.scale.x };
		}

		const padding = {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		};
		if (this._combatActive) {
			padding.top = game.settings.get('stream-view', 'padding-combat-top');
			padding.right = game.settings.get('stream-view', 'padding-combat-right');
			padding.bottom = game.settings.get('stream-view', 'padding-combat-bottom');
			padding.left = game.settings.get('stream-view', 'padding-combat-left');
		} else {
			padding.top = game.settings.get('stream-view', 'padding-top');
			padding.right = game.settings.get('stream-view', 'padding-right');
			padding.bottom = game.settings.get('stream-view', 'padding-bottom');
			padding.left = game.settings.get('stream-view', 'padding-left');
		}

		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		coords.forEach((c) => {
			if (c.x < minX) {
				minX = c.x;
			}
			if (c.x > maxX) {
				maxX = c.x;
			}
			if (c.y < minY) {
				minY = c.y;
			}
			if (c.y > maxY) {
				maxY = c.y;
			}
		});

		const gridPadding = {
			w: canvas.grid.w * 1.5,
			h: canvas.grid.h * 1.5,
		};
		const width = maxX - minX;
		const height = maxY - minY;
		const ratio = Math.min(
			(window.innerWidth - padding.left - padding.right - gridPadding.w) / width,
			(window.innerHeight - padding.top - padding.bottom - gridPadding.w) / height,
		);
		const maxScale = game.settings.get('stream-view', 'maximum-scale');
		const minScale = game.settings.get('stream-view', 'minimum-scale');
		const scale = Math.round(Math.clamped(ratio, minScale, maxScale) * 100) / 100;
		const paddingOffsetX = (padding.right - padding.left) / scale;
		const paddingOffsetY = (padding.bottom - padding.top) / scale;
		const x = minX + Math.round((width + paddingOffsetX) / 2);
		const y = minY + Math.round((height + paddingOffsetY) / 2);

		return { x, y, scale };
	}

	get _isCombatUser() {
		if (!this._combatActive) {
			return false;
		}
		if (game.combat?.combatant) {
			if (game.combat.combatant.actor?.hasPlayerOwner) {
				if (game.user.isGM) {
					return false;
				}
				return game.combat.combatant.actor.testUserPermission(game.user, 'OWNER');
			}
			return game.user.isGM;
		}
		return false;
	}

	get _isAutoCamera() {
		return (
			this._cameraMode === StreamViewOptions.CameraMode.AUTOMATIC &&
			!(this._combatActive && game.settings.get('stream-view', 'directed-combat'))
		);
	}

	get _isDirectedCamera() {
		return (
			this._cameraMode === StreamViewOptions.CameraMode.DIRECTED ||
			(this._combatActive && game.settings.get('stream-view', 'directed-combat'))
		);
	}

	_directedPan(view) {
		if (StreamView.isStreamUser) {
			return;
		}
		if (!this._isDirectedCamera || !game.canvas.scene?.active) {
			return;
		}
		if (this._combatActive && game.settings.get('stream-view', 'directed-combat')) {
			if (this._isCombatUser) {
				this._sendDirectedPan(view);
			}
		} else if (game.user.isGM) {
			this._sendDirectedPan(view);
		}
	}

	async _sendDirectedPan(view) {
		if (!this._isDirectedCamera) {
			return;
		}
		if (!this._socket) {
			return;
		}

		try {
			await this._socket.executeAsUser(
				'animateTo',
				game.settings.get('stream-view', 'user-id'),
				view,
			);
		} catch {
			return;
		}
	}

	_playerTokens() {
		const tokens = [];

		game.canvas.tokens.placeables.forEach((t) => {
			if (t.actor?.hasPlayerOwner) {
				tokens.push(t);
			}
		});
		return tokens;
	}

	_speakingTokens() {
		const tokens = [];
		if (!game.settings.get('stream-view', 'pan-on-user-speaking')) {
			return tokens;
		}
		const decay = game.settings.get('stream-view', 'speaker-decay');
		this._speakerHistory.forEach((hist) => {
			if (
				(hist.current.token && hist.current.isSpeaking) ||
				performance.now() - hist.current.last < decay
			) {
				tokens.push(hist.current.token);
			}
		});
		return tokens;
	}

	_combatPlayerTokens(combatant) {
		let targets = [];
		canvas.tokens.placeables.forEach((t) => {
			if (t.targeted?.size > 0) {
				let isCurrentTarget = false;
				combatant.players.forEach((u) => (isCurrentTarget ||= t.targeted.has(u)));
				if (isCurrentTarget) {
					targets.push(t);
				}
			}
		});
		return targets;
	}

	_combatGMTokens() {
		let targets = [];
		game.users
			.filter((u) => u.isGM)
			.forEach((u) => {
				canvas.tokens.placeables.forEach((t) => {
					if (t.targeted?.has(u)) {
						targets.push(t);
					}
				});
			});
		return targets;
	}

	_combatTokens(combat) {
		const combatant = combat?.combatant;
		if (!combatant) {
			return [];
		}

		const token = canvas.tokens.get(combatant.token.id);
		if (!token?.isVisible) {
			return [];
		}
		const targets = [token];
		if (combatant.hasPlayerOwner) {
			targets.push(...this._combatPlayerTokens(combatant));
		} else {
			targets.push(...this._combatGMTokens());
		}

		return targets;
	}

	_combatMeasuredTemplates(combat) {
		const combatant = combat?.combatant;
		if (!combatant) {
			return [];
		}
		let templates = [];
		if (combatant.hasPlayerOwner) {
			canvas.templates.placeables.forEach((t) => {
				combatant.players.forEach((p) => {
					if (t.user === p.id) {
						templates.push(t);
					}
				});
			});
		}

		return templates;
	}

	_tokenCoords(tokens) {
		const coords = [];
		tokens.forEach((t) => {
			// Use document.x here to avoid in-flight animated coords
			coords.push({ x: t.document.x, y: t.document.y });
			coords.push({ x: t.document.x, y: t.document.y + t.height });
		});
		return coords;
	}

	_measuredTemplateCoords(templates) {
		const coords = [];
		templates.forEach((t) => {
			const highlight = canvas.grid.getHighlightLayer(`Template.${t.id}`);
			if (!highlight) {
				return;
			}
			highlight.geometry?.graphicsData?.forEach((g) => {
				coords.push({ x: g.shape.x, y: g.shape.y });
				coords.push({ x: g.shape.x + g.shape.width, y: g.shape.y + g.shape.height });
			});
		});
		return coords;
	}

	_isChatting(token) {
		if (!StreamView.isStreamUser) {
			return;
		}

		let user;
		if (token.actor?.hasPlayerOwner) {
			user = game.users.find((u) => {
				if (u.isGM) {
					return false;
				}
				token.actor.testUserPermission(u, 'OWNER');
			});
		} else {
			user = game.users.find((u) => u.isGM);
		}
		if (!user) {
			return;
		}
		const wasSpeaking = !!this._speakerHistory.get(user.id)?.current?.isSpeaking;
		this._speakingUpdate(user.id, true, token);
		setTimeout(() => this._speakingUpdate(user.id, wasSpeaking, token), 1);
	}

	async _tokenForGM(userId) {
		if (!this._socket) {
			return null;
		}
		let tokenId;
		try {
			tokenId = await this._socket.executeAsUser('controlledToken', userId);
		} catch {
			return null;
		}
		if (!tokenId) {
			return null;
		}
		return game.canvas.tokens.get(tokenId);
	}

	async _tokenForSpeaker(userId, isSpeaking) {
		const user = game.users.get(userId);
		if (!user) {
			return;
		}
		let token;
		const hist = this._speakerHistory.get(userId);
		if (hist && !isSpeaking) {
			token = this._speakerHistory.get(userId).current.token;
			this._bubblesUpdate(token, isSpeaking);
			return token;
		}

		if (user.isGM) {
			token = await this._tokenForGM(userId);
		} else {
			token = game.canvas.tokens.placeables.find(
				(t) => t.actor?.hasPlayerOwner && user.character && t.actor.id == user.character.id,
			);
		}
		this._bubblesUpdate(token, isSpeaking);
		return token;
	}

	async _bubblesUpdate(token, isSpeaking) {
		if (!token || !game.settings.get('stream-view', 'show-speech-bubbles')) {
			return;
		}

		if (!isSpeaking) {
			return this._speechBubbles.hide(token);
		}

		return this._speechBubbles.show(token);
	}

	async _speakingUpdate(userId, isSpeaking, token) {
		if (!StreamView.isStreamUser) {
			return;
		}

		if (!token) {
			token = await this._tokenForSpeaker(userId, isSpeaking);
		}
		if (!token) {
			return;
		}

		const result = {
			previous: this._speakerHistory.get(userId)?.current,
			current: { isSpeaking: isSpeaking, token: token, last: performance.now() },
		};
		this._speakerHistory.set(userId, result);

		if (!game.settings.get('stream-view', 'pan-on-user-speaking')) {
			return;
		}

		if (!isSpeaking) {
			if (!result.previous?.isSpeaking) {
				return;
			}
			setTimeout(() => this.focusUpdate(), game.settings.get('stream-view', 'speaker-decay'));
		}
		this.focusUpdate();
	}

	_controlledTokenUpdate(token, controlled) {
		if (controlled) {
			this._controlledTokenId = token.id;
			return;
		}
		this._controlledTokenId = null;
	}

	_controlledToken() {
		return this._controlledTokenId;
	}

	_addStreamControls(controls) {
		controls.push({
			name: 'stream-view',
			title: 'Stream View',
			icon: 'fas fa-broadcast-tower',
			visible: game.user.isGM,
			layer: 'streamView',
			tools: [
				{
					name: 'camera-mode',
					title: 'stream-view.controls.toggle-camera-mode',
					icon: 'fas fa-video',
					toggle: true,
					active: this._cameraMode === StreamViewOptions.CameraMode.DIRECTED,
					onClick: () => this._toggleCameraMode(),
				},
				{
					name: "foreground",
					title: "stream-view.controls.toggle-foreground-layer",
					icon: "fas fa-home",
					toggle: true,
					active: this._foregroundStatus,
					onClick: () => this._sendToggleForeground(!this._foregroundStatus),
				},
				{
					name: "toggle",
					title: "CONTROLS.NoteToggle",
					icon: "fas fa-map-pin",
					toggle: true,
					active: this._notesStatus,
					onClick: () => this._sendToggleNotes(!this._notesStatus),
				},
				{
					name: 'close-popouts',
					title: 'stream-view.controls.close-popouts',
					icon: 'far fa-window-restore',
					onClick: () => this._sendClosePopouts(),
				},
				{
					name: 'token-tracked-clear',
					title: 'stream-view.controls.token-tracked-clear',
					icon: 'fas fa-video-slash',
					onClick: () => this._clearTrackedTokens(),
				},
			],
		});
	}

	async _sendClosePopouts() {
		if (!game.user.isGM) {
			return;
		}
		if (!this._socket) {
			return;
		}

		try {
			await this._socket.executeAsUser('closePopouts', game.settings.get('stream-view', 'user-id'));
		} catch {
			ui.notifications.warn('Could not close Stream View popouts (user not connected?)');
			return;
		}
		ui.notifications.info('Stream View popouts closed');
	}

	async _sendGetForegroundStatus() {
		try {
			const fgStatus = await this._socket.executeAsUser(
				'getForegroundStatus',
				game.settings.get('stream-view', 'user-id')
			);
			this._foregroundStatus = fgStatus;
		} catch {
			return;
		}
	}

	async _sendGetNotesStatus() {
		try {
			this._notesStatus = await this._socket.executeAsUser(
				'getNotesStatus',
				game.settings.get('stream-view', 'user-id')
			);
		} catch {
			return;
		}
	}

	_getForegroundStatus() {
		// TODO: Remove alpha check if foundry is updated to correctly reflect the layer status for non-GM users.
		return (canvas.foreground?._active ?? false) || canvas.foreground?.alpha == 1
	}

	_getNotesStatus() {
		return game.settings.get("core", NotesLayer.TOGGLE_SETTING)
	}

	async _sendToggleForeground(toggled) {
		try {
			this._foregroundStatus = await this._socket.executeAsUser(
				'toggleForeground',
				game.settings.get('stream-view', 'user-id'),
				toggled
			);
		} catch (e) {
			ui.notifications.warn(`Could not toggle Stream View foreground status (user not connected?)`);
			return;
		}
	}

	async _sendToggleNotes(toggled) {
		try {
			this._notesStatus = await this._socket.executeAsUser(
				'toggleNotes',
				game.settings.get('stream-view', 'user-id'),
				toggled
			);
		} catch (e) {
			ui.notifications.warn(`Could not toggle Stream View notes status (user not connected?)`);
			return;
		}
	}

	_toggleForeground(toggled) {
		canvas[toggled ? "foreground" : "background"].activate()
		return this._getForegroundStatus()
	}

	_toggleNotes(toggled) {
		const currentLayer = canvas.activeLayer.options.name;
		canvas.activateLayer(NotesLayer.layerOptions.name);
		game.settings.set("core", NotesLayer.TOGGLE_SETTING, toggled)
		canvas.activateLayer(currentLayer);
		return this._getNotesStatus()
	}

	async _toggleCameraMode() {
		if (!game.user.isGM) {
			return;
		}
		if (!this._socket) {
			return;
		}

		let targetMode = StreamViewOptions.CameraMode.AUTOMATIC;
		if (this._cameraMode === StreamViewOptions.CameraMode.AUTOMATIC) {
			targetMode = StreamViewOptions.CameraMode.DIRECTED;
		}
		this._setCameraMode(targetMode);

	}

	async _setCameraMode(mode) {
		this._cameraMode = mode;

		if (StreamView.isStreamUser) {
			this.focusUpdate();
			return;
		}

		await this._setGMCameraMode(mode);
	}

	async _setGMCameraMode(mode) {
		if (!game.user.isGM || !this._socket) {
			return;
		}

		try {
			await this._socket.executeAsUser(
				'setCameraMode',
				game.settings.get('stream-view', 'user-id'),
				mode,
			);
		} catch {
			ui.notifications.warn(`Stream View camera mode not dynamically updated (user not connected?)`);
			return;
		}

		if (mode === StreamViewOptions.CameraMode.DIRECTED) {
			this._directedPan({
				x: canvas.stage.pivot.x,
				y: canvas.stage.pivot.y,
				scale: canvas.stage.scale.x,
			});
		}
		ui.notifications.info(
			`Stream View camera mode is now ${StreamViewOptions.localizeCameraMode(this._cameraMode)}`,
		);
	}

	_previewCamera({ x, y, width, height }) {
		if (!game.user.isGM) {
			return;
		}

		canvas.streamView.drawPreview({ x, y, width, height });
	}

	_clearTrackedTokens() {
		this._trackedTokens[this._sceneId].forEach((t) => {
			const token = game.canvas.tokens.get(t);
			this._toggleTokenTracking(token, false);
		});
	}

	_handleDrawToken(token) {
		if (!game.user?.isGM) {
			return;
		}

		token._streamViewContainer ||= token.addChild(new PIXI.Container());
	}

	_handleUpdateToken(doc) {
		if (!StreamView.isStreamUser && !game.user?.isGM) {
			return;
		}

		if (game.user.isGM) {
			const token = game.canvas.tokens.get(doc.id);
			this._toggleTokenTrackedIcon(token, this._tokenDocumentHasTracking(doc));
		}

		if (this._tokenDocumentHasTracking(doc)) {
			this._trackedTokens[this._sceneId].add(doc.id);
		} else {
			this._trackedTokens[this._sceneId].delete(doc.id);
		}

		if (StreamView.isStreamUser) {
			this.focusUpdate();
		}
	}

	_handleDestroyToken(token) {
		if (!StreamView.isStreamUser && !game.user?.isGM) {
			return;
		}

		if (game.user?.isGM) {
			this._toggleTokenTracking(token, false);
		} else if (StreamView.isStreamUser) {
			this.focusUpdate();
		}
	}

	_tokenDocumentHasTracking(doc) {
		return !!doc.getFlag('stream-view', 'tracked');
	}

	async _toggleTokenTrackedIcon(token, active) {
		if (!game.user?.isGM) {
			return;
		}

		token._streamViewContainer.removeChildren().forEach((c) => c.destroy());
		if (active) {
			const w = Math.round(canvas.dimensions.size / 2 / 4) * 2;
			const tex = await loadTexture(StreamView.TOKEN_TRACKED_EFFECT.icon, { fallback: "icons/svg/hazard.svg" });
			const icon = new PIXI.Sprite(tex);
			icon.width = icon.height = w;
			icon.x = token.w - w;
			icon.y = (token.h / 2) - (w / 2);
			token._streamViewContainer.addChild(icon);
		}
	}

	_toggleTokenTracking(token, active) {
		if (!token || !game.user?.isGM) {
			return;
		}

		if (active) {
			token.document.setFlag('stream-view', 'tracked', true);
		} else {
			token.document.unsetFlag('stream-view', 'tracked');
		}
	}

	_toggleControlledTokenTracking(active) {
		game.canvas.tokens.controlled.forEach((t) => this._toggleTokenTracking(t, active));
	}

	_handleTokenHUD(html, tokenHUD) {
		if (!game.user?.isGM) {
			return;
		}

		const token = game.canvas.tokens.get(tokenHUD._id);
		const rightCol = html.find('div.col.right');
		if (rightCol) {
			const title = game.i18n.localize('stream-view.controls.token-track-toggle');
			let isActive = this._tokenDocumentHasTracking(token.document);
			const icon = $(`<div class="control-icon ${isActive ? 'active' : ''}"><i title="${title}" class="fas fa-video"></i></div>`);
			icon.click(() => {
				this._toggleControlledTokenTracking(!this._tokenDocumentHasTracking(token.document));
				icon.toggleClass('active');
			});
			rightCol.append(icon);
		}
	}

	_handlePopout(app, html) {
		if (!StreamView.isStreamUser) {
			return;
		}
		if (app.options.popOut !== true) {
			return;
		}

		if (app instanceof ChatLog) {
			// Extract chat log body.
			html.find('section.sidebar-tab').replaceWith(html.find('ol#chat-log'));
			StreamView.hidePopoutHeaders(html);
			return;
		} else if (app instanceof CombatTracker) {
			StreamView.hidePopoutHeaders(html);
			return;
		} else if (app instanceof UserConfig) {
			// Auto-close UserConfig immediately (we don't use it as the stream user).
			setTimeout(() => app.close(), 0);
			return;
		} else if (app.constructor?.name === 'SmallTimeApp') {
			// Skip tracking of SmallTime.
			return;
		} else if (app.constructor?.name === 'PartyOverviewApp') {
			// Skip tracking of PartyOverviewApp.
			return;
		} else if (html.hasClass('simple-calendar')) {
			// Skip tracking of Simple Calendar.
			return;
		}

		if (game.settings.get('stream-view', 'show-full-sidebar')) {
			return;
		}

		StreamView.hidePopoutHeaders(html);
		StreamView.setPopoutPosition(html);
		const autoClose = game.settings.get('stream-view', 'popout-auto-close-duration');
		this._popouts.set(app.id, app);
		if (autoClose === 0) {
			return;
		}
		setTimeout(() => this.closePopout(app.id), 1000 * autoClose);
	}

	async _closePopouts() {
		if (!StreamView.isStreamUser) {
			return;
		}

		const ids = [...this._popouts.keys()];
		for (const id of ids) {
			if (id === StreamViewOptions.PopoutIdentifiers.CHAT || id === StreamViewOptions.PopoutIdentifiers.COMBAT) {
				continue;
			}
			await this.closePopout(id);
		}
	}

	_defaultPadding(combat = false) {
		const padding = {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		};
		const panelSize = 300;

		const rtcSettings = game.settings.get('core', 'rtcWorldSettings');
		if (
			rtcSettings.mode !== AVSettings.AV_MODES.DISABLED &&
			game.settings.get('stream-view', 'show-voice-video')
		) {
			const position = game.settings.get('stream-view', 'voice-video-position');
			const pixels = game.settings.get('stream-view', 'voice-video-width');
			switch (position) {
				case AVSettings.DOCK_POSITIONS.LEFT:
					padding.left += pixels;
					break;
				case AVSettings.DOCK_POSITIONS.RIGHT:
					padding.right += pixels;
					break;
				case AVSettings.DOCK_POSITIONS.TOP:
					padding.top += pixels;
					break;
				case AVSettings.DOCK_POSITIONS.BOTTOM:
					padding.bottom += pixels;
					break;
				default:
					break;
			}
		}

		if (game.settings.get('stream-view', 'show-chat')) {
			let pixels = game.settings.get('stream-view', 'chat-position-x');
			if (pixels < 0) {
				padding.right += pixels * -1;
			} else {
				padding.left += pixels + panelSize;
			}
		}

		if (combat && game.settings.get('stream-view', 'auto-show-combat')) {
			let pixels = game.settings.get('stream-view', 'combat-position-x');
			if (pixels < 0) {
				padding.right += pixels * -1;
			} else {
				padding.left += pixels + panelSize;
			}
		}

		return padding;
	}

	async _sendCameraPreview({ x, y, scale }) {
		const width = window.innerWidth / scale;
		const height = window.innerHeight / scale;
		const px = x - (width / 2);
		const py = y - (height / 2);
		this._socket.executeForAllGMs('previewCamera', { x: px, y: py, width, height });
	}

	_socketConnected(userId) {
		if (userId == game.settings.get('stream-view', 'user-id')) {
			this._sendGetNotesStatus();
			this._sendGetForegroundStatus();
		}
	}

	socketReady(socket) {
		socket.register('connected', this._socketConnected.bind(this));
		socket.register('controlledToken', this._controlledToken.bind(this));
		socket.register('animateTo', this._debounceAnimateTo.bind(this));
		socket.register('setCameraMode', this._setCameraMode.bind(this));
		socket.register('closePopouts', this._closePopouts.bind(this));
		socket.register('previewCamera', this._previewCamera.bind(this));
		socket.register('toggleForeground', this._toggleForeground.bind(this));
		socket.register('toggleNotes', this._toggleNotes.bind(this));
		socket.register('getForegroundStatus', this._getForegroundStatus.bind(this));
		socket.register('getNotesStatus', this._getNotesStatus.bind(this));
		this._socket = socket;
	}

	ready() {
		if (!game.modules.get('lib-wrapper')?.active) {
			if (game.user.isGM) {
				ui.notifications.error(
					"Module stream-view requires the 'lib-wrapper' module. Please install and activate it.",
				);
			}
			return;
		}
		if (!game.modules.get('socketlib')?.active) {
			if (game.user.isGM) {
				ui.notifications.error(
					"Module stream-view requires the 'socketlib' module. Please install and activate it.",
				);
			}
			return;
		}

		if (StreamView.isStreamUser && !game.settings.get('stream-view', 'show-logo')) {
			$('img#logo').hide();
		}

		// Hack around needing to register settings in init, when data is not yet available.
		game.users.forEach((u) => {
			// Do not offer GM users as Stream View candidates
			if (u.isGM) {
				return;
			}
			StreamView._defaultUserChoices[u.id] = u.name;
		});
		game.settings.settings.get('stream-view.user-id').choices = StreamView._defaultUserChoices;
		const defaultPadding = this._defaultPadding(false);
		const defaultCombatPadding = this._defaultPadding(true);
		game.settings.settings.get('stream-view.padding-left').default = defaultPadding.left;
		game.settings.settings.get('stream-view.padding-right').default = defaultPadding.right;
		game.settings.settings.get('stream-view.padding-top').default = defaultPadding.top;
		game.settings.settings.get('stream-view.padding-bottom').default = defaultPadding.bottom;
		game.settings.settings.get('stream-view.padding-combat-left').default =
			defaultCombatPadding.left;
		game.settings.settings.get('stream-view.padding-combat-right').default =
			defaultCombatPadding.right;
		game.settings.settings.get('stream-view.padding-combat-top').default = defaultCombatPadding.top;
		game.settings.settings.get('stream-view.padding-combat-bottom').default =
			defaultCombatPadding.bottom;

		this._cameraMode = game.settings.get('stream-view', 'camera-mode');
		this._combatActive = StreamView.isCombatActive(game.combat);

		Hooks.on('controlToken', (token, controlled) => this._controlledTokenUpdate(token, controlled));
		Hooks.on('canvasPan', (_app, view) => this._directedPan(view));
		Hooks.on('updateCombat', (app) => this.updateCombat(StreamView.isCombatActive(app), app));
		Hooks.on('deleteCombat', (app) => this.updateCombat(false, app));

		libWrapper.register(
			'stream-view',
			'ChatLog.prototype.scrollBottom',
			(wrapped, ...args) => {
				if (args.length === 0) {
					args.push({ popout: true });
				} else if (args[0] instanceof Object) {
					args[0].popout = true;
				}
				wrapped(...args);
			},
			'WRAPPER',
		);

		try {
			if (game?.user?.isGM) {
				this._sendGetNotesStatus();
				this._sendGetForegroundStatus();
			}

			this._socket.executeForAllGMs('connected', game?.user?.id);
		} catch { }

		if (!StreamView.isStreamUser) {
			return;
		}

		Hooks.on('updateToken', () => this.focusUpdate());
		Hooks.on('targetToken', () => this.focusUpdate());
		Hooks.on('createMeasuredTemplate', () => this.focusUpdate());
		Hooks.on('updateMeasuredTemplate', () => this.focusUpdate());
		Hooks.on('deleteMeasuredTemplate', () => this.focusUpdate());
		Hooks.on('chatBubble', (token) => this._isChatting(token));
		Hooks.on('userIsSpeaking', async (userId, isSpeaking) => this._speakingUpdate(userId, isSpeaking));
		Hooks.on('renderApplication', (app, html) => this._handlePopout(app, html));
		Hooks.on('renderItemSheet', (app, html) => this._handlePopout(app, html));
		Hooks.on('renderActorSheet', (app, html) => this._handlePopout(app, html));

		if (game.settings.get('core', 'chatBubblesPan')) {
			game.settings.set('core', 'chatBubblesPan', false);
		}
		game.webrtc.settings.set(
			'client',
			'hidePlayerList',
			!game.settings.get('stream-view', 'show-player-list'),
		);
		game.webrtc.settings.set(
			'client',
			'dockPosition',
			game.settings.get('stream-view', 'voice-video-position'),
		);
		game.webrtc.settings.set(
			'client',
			'dockWidth',
			game.settings.get('stream-view', 'voice-video-width'),
		);
		game.webrtc.settings.set(
			'client',
			'nameplates',
			game.settings.get('stream-view', 'voice-video-nameplate-mode'),
		);
		game.webrtc.settings.set(
			'client',
			'borderColors',
			game.settings.get('stream-view', 'voice-video-border-color'),
		);

		libWrapper.register(
			'stream-view',
			'CameraViews.prototype.setUserIsSpeaking',
			(wrapped, ...args) => {
				Hooks.call('userIsSpeaking', ...args);
				wrapped(...args);
			},
			'WRAPPER',
		);

		libWrapper.register(
			'stream-view',
			'SoundsLayer.prototype.refresh',
			(_wrapped, ..._args) => {},
			'OVERRIDE',
		);

		if (game.settings.get('stream-view', 'show-chat') && !game.settings.get('stream-view', 'show-full-sidebar')) {
			this.createPopout(StreamViewOptions.PopoutIdentifiers.CHAT, ui.sidebar.tabs.chat);
		}
		this.focusCombat(game.combat);
	}

	createPopout(identifier, app) {
		if (!StreamView.isStreamUser) {
			return;
		}
		if (this._popouts.has(identifier)) {
			return;
		}

		const pop = app.createPopout();
		let posX = game.settings.get('stream-view', `${identifier}-position-x`);
		let posY = game.settings.get('stream-view', `${identifier}-position-y`);
		if (posX < 0) {
			posX = window.innerWidth + posX;
		}
		if (posY < 0) {
			posY = window.innerHeight + posY;
		}
		pop.position.left = posX;
		pop.position.top = posY;
		this._popouts.set(identifier, pop);
		pop.render(true);
	}

	async closePopout(identifier) {
		if (!StreamView.isStreamUser) {
			return;
		}

		const popout = this._popouts.get(identifier);
		if (!popout) {
			return;
		}
		this._popouts.delete(identifier);
		await popout.close();
	}

	async animateTo({ x, y, scale }) {
		if (!StreamView.isStreamUser) {
			return;
		}

		if (scale === undefined) {
			scale = game.settings.get('stream-view', 'minimum-scale');
		}
		const duration = game.settings.get('stream-view', 'animation-duration');
		if (game.settings.get('stream-view', 'preview-display') !== StreamViewOptions.PreviewDisplay.NEVER) {
			this._sendCameraPreview({ x, y, scale });
		}
		canvas.getLayerByEmbeddedName(CONFIG.AmbientSound.objectClass.name).previewSound({x, y});
		return canvas.animatePan({ x, y, scale, duration });
	}

	updateScene() {
		if (!game.canvas.scene || (!StreamView.isStreamUser && !game.user.isGM)) {
			return;
		}

		if (this._sceneId !== game.canvas.scene.id) {
			this._sceneId = game.canvas.scene.id;
			if (!this._trackedTokens[this._sceneId]) {
				this._trackedTokens[this._sceneId] = new Set();
				game.canvas.tokens.placeables.forEach((t) => {
					if (this._tokenDocumentHasTracking(t.document)) {
						this._trackedTokens[this._sceneId].add(t.id);
						this._toggleTokenTrackedIcon(t, true);
					}
				});
			}
			if (StreamView.isStreamUser) {
				this.focusUpdate();
			} else if (game.user.isGM) {
				StreamView._previewRefresh();
			}
		}
	}

	updateCombat(active, combat) {
		this._combatActive = !!active;

		if (active && this._isDirectedCamera && !StreamView.isStreamUser) {
			this._directedPan({
				x: canvas.stage.pivot.x,
				y: canvas.stage.pivot.y,
				scale: canvas.stage.scale.x,
			});
			return;
		}
		if (!StreamView.isStreamUser) {
			return;
		}

		if (game.settings.get('stream-view', 'auto-show-combat')) {
			if (!this._combatActive) {
				this.closePopout(StreamViewOptions.PopoutIdentifiers.COMBAT);
				this.focusUpdate();
				return;
			}
			this.createPopout(StreamViewOptions.PopoutIdentifiers.COMBAT, ui.sidebar.tabs.combat);
		}

		this.focusCombat(combat);
	}

	focusUpdate() {
		if (!StreamView.isStreamUser || !this._isAutoCamera) {
			return;
		}

		if (this._combatActive) {
			this.focusCombat(game.combat);
			return;
		}
		this.focusPlayers();
	}

	focusPlayers() {
		if (!StreamView.isStreamUser || !this._isAutoCamera) {
			return;
		}

		let tokens = [];
		if (this._trackedTokens[this._sceneId]?.size > 0) {
			this._trackedTokens[this._sceneId].forEach((id) => {
				const token = game.canvas.tokens.get(id);
				if (token) {
					tokens.push(token);
				}
			});
		} else {
			tokens = this._speakingTokens();
		}
		if (tokens.length === 0) {
			tokens = this._playerTokens();
		}
		this.animateTo(this._coordBounds(this._tokenCoords(tokens)));
	}

	focusCombat(combat) {
		if (!StreamView.isStreamUser || !this._isAutoCamera) {
			return;
		}

		const tokens = this._combatTokens(combat);
		if (game.settings.get('stream-view', 'disable-combatant-tracking') || tokens.length === 0) {
			this.focusPlayers();
			return;
		}
		const coords = this._tokenCoords(tokens);
		coords.push(...this._measuredTemplateCoords(this._combatMeasuredTemplates(combat)));
		this.animateTo(this._coordBounds(coords));
	}
}

StreamView.start();
