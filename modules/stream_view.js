import { SpeechBubbles } from './speech_bubbles.js';
import { StreamViewLayer } from './layer.js';

class StreamView {
	static CameraMode = {
		AUTOMATIC: 'automatic',
		DIRECTED: 'directed',
	};
	static PopoutIdentifiers = {
		COMBAT: 'combat',
		CHAT: 'chat',
	};
	static VoiceVideoSize = {
		SMALL: 'small',
		MEDIUM: 'medium',
		LARGE: 'large',
	};
	static _voiceVideoSizePixels = {
		[this.VoiceVideoSize.SMALL]: 157,
		[this.VoiceVideoSize.MEDIUM]: 217,
		[this.VoiceVideoSize.LARGE]: 277,
	};
	static _unknownUserId = 'unknownUser';
	static _defaultUserChoices = { [this._unknownUserId]: '' };

	static _localizeCameraMode(mode) {
		return game.i18n.localize(`stream-view.settings.camera-mode.option.${mode}`);
	}

	static _localizeVoiceVideoSize(size) {
		return game.i18n.localize(`stream-view.settings.voice-video-size.option.${size}`);
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
		Hooks.on('renderSidebar', (_app, html) => this.hideHtml(html));
		Hooks.on('renderCameraViews', (_app, html) => this.handleStreamCamera(html));
		Hooks.on('renderHeadsUpDisplay', (_app, html) => this.appendSpeechBubblesContainer(html));
		Hooks.on('renderSidebarTab', (app, html) => instance._handlePopout(app, html));
		Hooks.on('renderUserConfig', (app, html) => instance._handlePopout(app, html));
		Hooks.once('ready', () => instance.ready());
	}

	static init(instance) {
		CONFIG.Canvas.layers.streamView = StreamViewLayer;

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
				[this.CameraMode.AUTOMATIC]: this._localizeCameraMode(this.CameraMode.AUTOMATIC),
				[this.CameraMode.DIRECTED]: this._localizeCameraMode(this.CameraMode.DIRECTED),
			},
			default: this.CameraMode.AUTOMATIC,
			onChange: (mode) => instance._setCameraMode(mode),
			type: String,
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

		game.settings.register('stream-view', 'show-voice-video', {
			name: game.i18n.localize('stream-view.settings.show-voice-video.name'),
			hint: game.i18n.localize('stream-view.settings.show-voice-video.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: true,
			type: Boolean,
		});

		game.settings.register('stream-view', 'voice-video-size', {
			name: game.i18n.localize('stream-view.settings.voice-video-size.name'),
			hint: game.i18n.localize('stream-view.settings.voice-video-size.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			choices: {
				[this.VoiceVideoSize.SMALL]: this._localizeVoiceVideoSize(this.VoiceVideoSize.SMALL),
				[this.VoiceVideoSize.MEDIUM]: this._localizeVoiceVideoSize(this.VoiceVideoSize.MEDIUM),
				[this.VoiceVideoSize.LARGE]: this._localizeVoiceVideoSize(this.VoiceVideoSize.LARGE),
			},
			default: this.VoiceVideoSize.SMALL,
			type: String,
		});

		game.settings.register('stream-view', 'voice-video-position-x', {
			name: game.i18n.localize('stream-view.settings.voice-video-position-x.name'),
			hint: game.i18n.localize('stream-view.settings.voice-video-position-x.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: 20,
			type: Number,
		});

		game.settings.register('stream-view', 'voice-video-position-y', {
			name: game.i18n.localize('stream-view.settings.voice-video-position-y.name'),
			hint: game.i18n.localize('stream-view.settings.voice-video-position-y.hint'),
			scope: 'world',
			config: true,
			restricted: true,
			default: -176,
			type: Number,
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
	}

	static get isStreamUser() {
		return game?.user?.id === game.settings.get('stream-view', 'user-id');
	}

	static appendSpeechBubblesContainer(html) {
		html.append(`<div id="${SpeechBubbles.containerId}"/>`);
	}

	static handleStreamCamera(html) {
		if (this.isStreamUser) {
			if (!game.settings.get('stream-view', 'show-voice-video')) {
				this.hideHtml(html);
				return;
			}
			let posX = game.settings.get('stream-view', `voice-video-position-x`);
			let posY = game.settings.get('stream-view', `voice-video-position-y`);
			if (posX < 0) {
				posX = window.innerWidth + posX;
			}
			if (posY < 0) {
				posY = window.innerHeight + posY;
			}
			html.css({ left: posX, top: posY, bottom: 'inherit' });
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

	static isCombatActive(combat) {
		return combat?.current?.round > 0;
	}

	constructor() {
		this._speechBubbles = new SpeechBubbles();
		this._socket = undefined;
		this._cameraMode = StreamView.CameraMode.AUTOMATIC;
		this._speakerHistory = new Map();
		this._popouts = new Map();
		this._controlledTokenId = null;
		this._sceneId = null;
		this._debounceAnimateTo = foundry.utils.debounce(this.animateTo.bind(this), 100);
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
			this._cameraMode === StreamView.CameraMode.AUTOMATIC &&
			!(this._combatActive && game.settings.get('stream-view', 'directed-combat'))
		);
	}

	get _isDirectedCamera() {
		return (
			this._cameraMode === StreamView.CameraMode.DIRECTED ||
			(this._combatActive && game.settings.get('stream-view', 'directed-combat'))
		);
	}

	_directedPan(view) {
		if (StreamView.isStreamUser) {
			return;
		}
		if (!this._isDirectedCamera) {
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
					if (t.data.user === p.id) {
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
			// Use data.x here to avoid in-flight animated coords
			coords.push({ x: t.data.x, y: t.data.y });
			coords.push({ x: t.data.x + t.width, y: t.data.y + t.height });
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
		this._isSpeaking(user.id, true, token);
		setTimeout(() => this._isSpeaking(user.id, wasSpeaking, token), 1);
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
			if (hist.current.isSpeaking) {
				this._speechBubbles.hide(token);
			}
			return token;
		}
		if (user.isGM) {
			token = await this._tokenForGM(userId);
		} else {
			token = game.canvas.tokens.placeables.find(
				(t) => t.actor?.hasPlayerOwner && user.character && t.actor.id == user.character.id,
			);
		}
		if (token && isSpeaking) {
			this._speechBubbles.show(token);
		}
		return token;
	}

	async _isSpeaking(userId, isSpeaking, token) {
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
					active: this._cameraMode === StreamView.CameraMode.DIRECTED,
					onClick: () => this._toggleCameraMode(),
				},
				{
					name: 'close-popouts',
					title: 'stream-view.controls.close-popouts',
					icon: 'far fa-window-restore',
					onClick: () => this._sendClosePopouts(),
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

	async _toggleCameraMode() {
		if (!game.user.isGM) {
			return;
		}
		if (!this._socket) {
			return;
		}

		let targetMode = StreamView.CameraMode.AUTOMATIC;
		if (this._cameraMode === StreamView.CameraMode.AUTOMATIC) {
			targetMode = StreamView.CameraMode.DIRECTED;
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

		if (mode === StreamView.CameraMode.DIRECTED) {
			this._directedPan({
				x: canvas.stage.pivot.x,
				y: canvas.stage.pivot.y,
				scale: canvas.stage.scale.x,
			});
		}
		ui.notifications.info(
			`Stream View camera mode is now ${StreamView._localizeCameraMode(this._cameraMode)}`,
		);
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
		} else if (typeof SmallTimeApp !== 'undefined' && app instanceof SmallTimeApp) {
			// Skip tracking of SmallTime.
			return;
		}

		StreamView.hidePopoutHeaders(html);
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
		for (let id of ids) {
			if (id === StreamView.PopoutIdentifiers.CHAT || id === StreamView.PopoutIdentifiers.COMBAT) {
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
			let pixels = game.settings.get('stream-view', 'voice-video-position-y');
			if (pixels < 0) {
				padding.bottom += pixels * -1;
			} else {
				padding.top +=
					pixels +
					StreamView._voiceVideoSizePixels[game.settings.get('stream-view', 'voice-video-size')];
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

	socketReady(socket) {
		socket.register('controlledToken', this._controlledToken.bind(this));
		socket.register('animateTo', this._debounceAnimateTo.bind(this));
		socket.register('setCameraMode', this._setCameraMode.bind(this));
		socket.register('closePopouts', this._closePopouts.bind(this));
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

		if (!StreamView.isStreamUser) {
			return;
		}

		Hooks.on('updateToken', () => this.focusUpdate());
		Hooks.on('targetToken', () => this.focusUpdate());
		Hooks.on('createMeasuredTemplate', () => this.focusUpdate());
		Hooks.on('updateMeasuredTemplate', () => this.focusUpdate());
		Hooks.on('deleteMeasuredTemplate', () => this.focusUpdate());
		Hooks.on('chatBubble', (token) => this._isChatting(token));
		Hooks.on('userIsSpeaking', async (userId, isSpeaking) => this._isSpeaking(userId, isSpeaking));
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
			'dockSize',
			game.settings.get('stream-view', 'voice-video-size'),
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

		if (game.settings.get('stream-view', 'show-chat')) {
			this.createPopout(StreamView.PopoutIdentifiers.CHAT, ui.sidebar.tabs.chat);
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
			scale = game.settings.get('stream-view');
		}
		const duration = game.settings.get('stream-view', 'animation-duration');
		return canvas.animatePan({ x, y, scale, duration });
	}

	updateScene() {
		if (!StreamView.isStreamUser || !game.canvas.scene) {
			return;
		}

		if (this._sceneId !== game.canvas.scene.id) {
			this._sceneId = game.canvas.scene.id;
			this.focusUpdate();
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
				this.closePopout(StreamView.PopoutIdentifiers.COMBAT);
				this.focusUpdate();
				return;
			}
			this.createPopout(StreamView.PopoutIdentifiers.COMBAT, ui.sidebar.tabs.combat);
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

		let tokens = this._speakingTokens();
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
		if (tokens.length === 0) {
			this.focusPlayers();
			return;
		}
		const coords = this._tokenCoords(tokens);
		coords.push(...this._measuredTemplateCoords(this._combatMeasuredTemplates(combat)));
		this.animateTo(this._coordBounds(coords));
	}
}

StreamView.start();
