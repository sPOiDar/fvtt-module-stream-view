import { StreamView } from "./stream_view.js";
const unknownUserId = 'unknownUser';
const defaultUserChoices = { [unknownUserId]: '' };

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

	static init() {
		game.settings.register('stream-view', 'user-id', {
			name: game.i18n.localize('stream-view.settings.user-id.name'),
			hint: game.i18n.localize('stream-view.settings.user-id.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			choices: defaultUserChoices,
			default: unknownUserId,
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
				[StreamViewOptions.CameraMode.DISABLED]: StreamViewOptions.localizeCameraMode(StreamViewOptions.CameraMode.DISABLED),
			},
			default: StreamViewOptions.CameraMode.AUTOMATIC,
			type: String,
		});

		game.settings.register('stream-view', 'disabled-camera-initial-view', {
			name: game.i18n.localize('stream-view.settings.disabled-camera-initial-view.name'),
			hint: game.i18n.localize('stream-view.settings.disabled-camera-initial-view.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: true,
			type: Boolean,
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

		game.settings.register('stream-view', 'disable-manually-tracked-tokens', {
			name: game.i18n.localize('stream-view.settings.disable-manually-tracked-tokens.name'),
			hint: game.i18n.localize('stream-view.settings.disable-manually-tracked-tokens.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
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

		game.settings.register('stream-view', 'select-combatant', {
			name: game.i18n.localize('stream-view.settings.select-combatant.name'),
			hint: game.i18n.localize('stream-view.settings.select-combatant.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: false,
			type: Boolean,
		});

		game.settings.register('stream-view', 'gm-track-controlled', {
			name: game.i18n.localize('stream-view.settings.gm-track-controlled.name'),
			hint: game.i18n.localize('stream-view.settings.gm-track-controlled.hint'),
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

		game.settings.register('stream-view', 'ignore-invisible-players', {
			name: game.i18n.localize('stream-view.settings.ignore-invisible-players.name'),
			hint: game.i18n.localize('stream-view.settings.ignore-invisible-players.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: false,
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
			requiresReload: true,
			default: true,
			type: Boolean,
		});

		game.settings.register('stream-view', 'chat-position-x', {
			name: game.i18n.localize('stream-view.settings.chat-position-x.name'),
			hint: game.i18n.localize('stream-view.settings.chat-position-x.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: -320,
			type: Number,
		});

		game.settings.register('stream-view', 'chat-position-y', {
			name: game.i18n.localize('stream-view.settings.chat-position-y.name'),
			hint: game.i18n.localize('stream-view.settings.chat-position-y.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: 40,
			type: Number,
		});

		game.settings.register('stream-view', 'chat-max-height', {
			name: game.i18n.localize('stream-view.settings.chat-max-height.name'),
			hint: game.i18n.localize('stream-view.settings.chat-max-height.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'chat-max-height-combat', {
			name: game.i18n.localize('stream-view.settings.chat-max-height-combat.name'),
			hint: game.i18n.localize('stream-view.settings.chat-max-height-combat.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'auto-show-combat', {
			name: game.i18n.localize('stream-view.settings.auto-show-combat.name'),
			hint: game.i18n.localize('stream-view.settings.auto-show-combat.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: true,
			type: Boolean,
		});

		game.settings.register('stream-view', 'combat-position-x', {
			name: game.i18n.localize('stream-view.settings.combat-position-x.name'),
			hint: game.i18n.localize('stream-view.settings.combat-position-x.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: 20,
			type: Number,
		});

		game.settings.register('stream-view', 'combat-position-y', {
			name: game.i18n.localize('stream-view.settings.combat-position-y.name'),
			hint: game.i18n.localize('stream-view.settings.combat-position-y.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: 40,
			type: Number,
		});

		game.settings.register('stream-view', 'combat-max-height', {
			name: game.i18n.localize('stream-view.settings.combat-max-height.name'),
			hint: game.i18n.localize('stream-view.settings.combat-max-height.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: 0,
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
			requiresReload: true,
			default: true,
			type: Boolean,
		});

		game.settings.register('stream-view', 'voice-video-hide-stream-user', {
			name: game.i18n.localize('stream-view.settings.voice-video-hide-stream-user.name'),
			hint: game.i18n.localize('stream-view.settings.voice-video-hide-stream-user.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: true,
			type: Boolean,
		});

		game.settings.register('stream-view', 'voice-video-position', {
			name: game.i18n.localize('stream-view.settings.voice-video-position.name'),
			hint: game.i18n.localize('stream-view.settings.voice-video-position.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
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
			requiresReload: true,
			default: 240,
			type: Number,
		});

		game.settings.register('stream-view', 'voice-video-nameplate-mode', {
			name: game.i18n.localize('stream-view.settings.voice-video-nameplate-mode.name'),
			hint: game.i18n.localize('stream-view.settings.voice-video-nameplate-mode.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
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
			requiresReload: true,
			default: true,
			type: Boolean,
		});


		game.settings.register('stream-view', 'show-scene-navigation', {
			name: game.i18n.localize('stream-view.settings.show-scene-navigation.name'),
			hint: game.i18n.localize('stream-view.settings.show-scene-navigation.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: false,
			type: Boolean,
		});

		game.settings.register('stream-view', 'show-logo', {
			name: game.i18n.localize('stream-view.settings.show-logo.name'),
			hint: game.i18n.localize('stream-view.settings.show-logo.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: false,
			type: Boolean,
		});

		game.settings.register('stream-view', 'show-player-list', {
			name: game.i18n.localize('stream-view.settings.show-player-list.name'),
			hint: game.i18n.localize('stream-view.settings.show-player-list.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: false,
			type: Boolean,
		});

		game.settings.register('stream-view', 'padding-left', {
			name: game.i18n.localize('stream-view.settings.padding-left.name'),
			hint: game.i18n.localize('stream-view.settings.padding-left.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'padding-right', {
			name: game.i18n.localize('stream-view.settings.padding-right.name'),
			hint: game.i18n.localize('stream-view.settings.padding-right.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'padding-top', {
			name: game.i18n.localize('stream-view.settings.padding-top.name'),
			hint: game.i18n.localize('stream-view.settings.padding-top.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'padding-bottom', {
			name: game.i18n.localize('stream-view.settings.padding-bottom.name'),
			hint: game.i18n.localize('stream-view.settings.padding-bottom.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'padding-combat-left', {
			name: game.i18n.localize('stream-view.settings.padding-combat-left.name'),
			hint: game.i18n.localize('stream-view.settings.padding-combat-left.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'padding-combat-right', {
			name: game.i18n.localize('stream-view.settings.padding-combat-right.name'),
			hint: game.i18n.localize('stream-view.settings.padding-combat-right.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'padding-combat-top', {
			name: game.i18n.localize('stream-view.settings.padding-combat-top.name'),
			hint: game.i18n.localize('stream-view.settings.padding-combat-top.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'padding-combat-bottom', {
			name: game.i18n.localize('stream-view.settings.padding-combat-bottom.name'),
			hint: game.i18n.localize('stream-view.settings.padding-combat-bottom.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
			default: 0,
			type: Number,
		});

		game.settings.register('stream-view', 'hide-popout-headers', {
			name: game.i18n.localize('stream-view.settings.hide-popout-headers.name'),
			hint: game.i18n.localize('stream-view.settings.hide-popout-headers.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			requiresReload: true,
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
			requiresReload: true,
			default: false,
			type: Boolean,
		});


	}

	/**
	 * @param {StreamView} instance 
	 */
	static ready(instance) {
		// Hack around needing to register settings in init, when data is not yet available.
		const userChoices = {};
		game.users.forEach((u) => {
			// Do not offer GM users as Stream View candidates
			if (u.isGM) {
				return;
			}
			userChoices[u.id] = u.name;
		});
		game.settings.settings.get('stream-view.user-id').choices = foundry.utils.mergeObject(defaultUserChoices, userChoices);
		const defaultPadding = this.#defaultPadding(false);
		const defaultCombatPadding = this.#defaultPadding(true);
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
		game.settings.settings.get('stream-view.camera-mode').onChange = (mode) => instance.setCameraMode(mode);
		game.settings.settings.get('stream-view.disable-manually-tracked-tokens').onChange = (enabled) => { if (enabled) instance.clearTrackedTokens() };
		game.settings.settings.get('stream-view.preview-display').onChange = (enabled) => { if (enabled) instance.clearTrackedTokens() };
	}

	/**
	 * @param {boolean} [inCombat=false]
	 * @private
	 */
	static #defaultPadding(inCombat = false) {
		const padding = {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		};
		const sidebarWidth = SidebarTab.defaultOptions.width;

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

		const chatpixels = game.settings.get('stream-view', 'chat-position-x');
		if (game.settings.get('stream-view', 'show-chat')) {
			if (chatpixels < 0) {
				padding.right += chatpixels * -1;
			} else {
				padding.left += chatpixels + sidebarWidth;
			}
		}

		if (inCombat && game.settings.get('stream-view', 'auto-show-combat')) {
			const combatpixels = game.settings.get('stream-view', 'combat-position-x');
			if (combatpixels < 0) {
				if (chatpixels < 0 && combatpixels < chatpixels) {
					padding.right += (combatpixels - chatpixels) * -1;
				} else if (chatpixels >= 0) {
					padding.right += combatpixels * -1;
				}
			} else {
				if (chatpixels >= 0 && combatpixels > chatpixels) {
					padding.left += (combatpixels - chatpixels) + sidebarWidth;
				} else if (chatpixels < 0) {
					padding.left += combatpixels + sidebarWidth;
				}
			}
		}

		return padding;
	}
}