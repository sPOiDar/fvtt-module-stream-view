import { StreamView } from "./stream_view.js";
import { StreamViewOptions } from './options.js';
import { SpeechBubbles } from "./speech_bubbles.js";
import './types.js';

export class StreamViewStream extends StreamView {
	/**
	 * @type {Function}
	 */
	#debounceAnimateTo = () => { };

	/**
	 * @type {SpeechBubbles}
	 */
	#speechBubbles = new SpeechBubbles();

	/**
	 * @type {Map<string, SpeakerHistory>}
	 */
	#speakerHistory = new Map();

	/**
	 * @type {Map}
	 */
	#popouts = new Map();

	/**
	 * @override
	 */
	constructor(socket) {
		super(socket);

		this.#debounceAnimateTo = foundry.utils.debounce(({ x, y, scale }) => this.#animateTo({ x, y, scale }), 100);
	}

	/**
	 * @override
	 */
	setup() {
		super.setup();

		Hooks.on('renderSceneNavigation', (_app, html) => {
			if (!game.settings.get('stream-view', 'show-scene-navigation')) {
				this.#hideHtml(html);
			}
		});
		Hooks.on('renderPlayerList', (_app, html) => {
			if (!game.settings.get('stream-view', 'show-player-list')) {
				this.#hideHtml(html);
			}
		});
		Hooks.on('renderSceneControls', (_app, html) => this.#hideHtml(html));
		Hooks.on('renderHotbar', (_app, html) => this.#hideHtml(html));
		Hooks.on('renderSidebar', (_app, html) => {
			if (!game.settings.get('stream-view', 'show-full-sidebar')) {
				this.#hideHtml(html)
			}
		});
		Hooks.on('renderHeadsUpDisplay', (_app, html) => this.#appendSpeechBubblesContainer(html));
		Hooks.on('renderSidebarTab', (app, html) => this.#handlePopout(app, html));
		Hooks.on('renderUserConfig', (app, html) => this.#handlePopout(app, html));
		Hooks.on('updateCombat', (app) => this.#updateCombat(StreamView.isCombatActive(app), app));
		Hooks.on('deleteCombat', (app) => this.#updateCombat(false, app));
		Hooks.on('userIsSpeaking', async (userId, isSpeaking) => this.#speakingUpdate(userId, isSpeaking));
		Hooks.on('chatBubble', (token) => this.#isChatting(token));
		Hooks.on('renderApplication', (app, html) => this.#handlePopout(app, html));
		Hooks.on('renderItemSheet', (app, html) => this.#handlePopout(app, html));
		Hooks.on('renderActorSheet', (app, html) => this.#handlePopout(app, html));
		Hooks.on('renderCameraViews', (_app, html) => this.#handleRenderCameraViews(html));

		Hooks.once('ready', () => this.#ready());
	}

	/**
	 * @override
	 */
	async setCameraMode(mode) {
		super.setCameraMode(mode);

		if (this.isCameraDisabled && game.settings.get('stream-view', 'disabled-camera-initial-view')) {
			await this.#animateTo(this.#getInitialViewport())
		} else {
			this.#focusUpdate();
		}
	}

	/**
	 * @private
	 */
	#ready() {
		document.body.classList.add('stream-view');

		if (!game.settings.get('stream-view', 'show-logo')) {
			$('img#logo').hide();
		}

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
			(_wrapped, ..._args) => { },
			'OVERRIDE',
		);

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

		Hooks.on('targetToken', () => this.#focusUpdate());
		Hooks.on('createMeasuredTemplate', () => this.#focusUpdate());
		Hooks.on('updateMeasuredTemplate', () => this.#focusUpdate());
		Hooks.on('deleteMeasuredTemplate', () => this.#focusUpdate());
		Hooks.on('refreshAmbientSound', () => this.#focusUpdate());
		Hooks.on('updateAmbientSound', () => this.#focusUpdate());
		Hooks.on('createToken', (doc) => this.#handleCreateToken(doc));
		Hooks.on('updateToken', () => this.#handleUpdateToken());
		Hooks.on('deleteToken', () => this.#handleDeleteToken());

		// Stream
		this._socket.register('animateTo', ({ x, y, scale }) => this.#debounceAnimateTo({ x, y, scale }));
		this._socket.register('setCameraMode', (mode) => this.setCameraMode(mode));
		this._socket.register('controlToken', (tokenId, controlled) => this.#controlToken(tokenId, controlled));
		this._socket.register('closePopouts', () => { return this.#closePopouts() });
		this._socket.register('toggleNotes', (toggled) => { return this.#toggleNotes(toggled) });
		this._socket.register('getNotesStatus', () => { return this.#getNotesStatus() });

		// GM
		this._socket.register('streamConnected', (userId) => {});
		this._socket.register('controlledTokens', () => {});
		this._socket.register('previewCamera', ({ x, y, width, height }) => {});

		try {
			this._socket.executeForAllGMs('streamConnected', game?.user?.id);
		} catch { }

		if (game.settings.get('stream-view', 'show-chat') && !game.settings.get('stream-view', 'show-full-sidebar')) {
			this.#createPopout(StreamViewOptions.PopoutIdentifiers.CHAT, ui.sidebar.tabs.chat);
		}

		game.canvas.tokens.releaseAll();
		this.#updateCombat(StreamView.isCombatActive(), game.combat);
		this.#focusUpdate();

	}

	/**
	 * @param {JQuery<HTMLElement>} html
	 * @private
	 */
	#appendSpeechBubblesContainer(html) {
		html.append(`<div id="${SpeechBubbles.containerId}"/>`);
	}

	/**
	 * @param {Coord[]} [coords=[]]
	 * @returns {Coord}
	 * @private
	 */
	#coordBounds(coords = []) {
		if (coords.length === 0) {
			return { x: canvas.stage.pivot.x, y: canvas.stage.pivot.y, scale: canvas.stage.scale.x };
		}

		const padding = {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		};
		if (game.combat?.active) {
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

	/**
	 * @param {Coord} view
	 * @private
	 */
	async #animateTo({ x, y, scale }) {
		if (scale === undefined) {
			scale = game.settings.get('stream-view', 'minimum-scale');
		}
		const duration = game.settings.get('stream-view', 'animation-duration');
		if (game.settings.get('stream-view', 'preview-display') !== StreamViewOptions.PreviewDisplay.NEVER) {
			this.#sendCameraPreview({ x, y, scale });
		}
		canvas.getLayerByEmbeddedName(CONFIG.AmbientSound.objectClass.name).previewSound({ x, y });
		return canvas.animatePan({ x, y, scale, duration });
	}

	/**
	 * @returns {Coord}
	 * @private
	 */
	#getInitialViewport() {
		let { x, y, scale } = game.scenes.get(this._sceneId).initial;
		const r = game.canvas.dimensions.rect;
		x ??= (r.right / 2);
		y ??= (r.bottom / 2);
		scale ??= Math.clamped(Math.min(window.innerHeight / r.height, window.innerWidth / r.width), 0.25, 3);
		return { x, y, scale };
	}

	/**
	 * @param {Coord} view
	 */
	async #sendCameraPreview({ x, y, scale }) {
		const width = window.innerWidth / scale;
		const height = window.innerHeight / scale;
		const px = x - (width / 2);
		const py = y - (height / 2);
		this._socket.executeForAllGMs('previewCamera', { x: px, y: py, width, height });
	}

	/**
	 * @param {JQuery<HTMLElement>} html
	 * @private
	 */
	#handleRenderCameraViews() {
		if (!game.settings.get('stream-view', 'show-voice-video')) {
			this.#hideHtml(html);
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

	/**
	 * @param {TokenDocument} doc
	 * @private
	 */
	#handleCreateToken(doc) {
		if (game.canvas.tokens.get(doc.id)) {
			this.#focusUpdate();
		}
	}

	/**
	 * @param {Token} token
	 * @private
	 */
	#handleUpdateToken() {
		this.#focusUpdate();
	}

	/**
	 * @param {Token} token
	 * @private
	 */
	#handleDeleteToken() {
		this.#focusUpdate();
	}

	/**
	 * @param {Application} app
	 * @param {JQuery<HTMLElement>} html
	 * @private
	 */
	#handlePopout(app, html) {
		if (!StreamView.isStreamUser) {
			return;
		}
		if (app.options.popOut !== true) {
			return;
		}

		if (app instanceof ChatLog) {
			// Extract chat log body.
			html.find('#chat-controls').remove();
			html.find('#chat-form').remove();
			html.find('#chat-log').css('height', '100%');
			this.#hidePopoutHeaders(html);
			return;
		} else if (app instanceof CombatTracker) {
			this.#hidePopoutHeaders(html);
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

		this.#hidePopoutHeaders(html);
		this.#setPopoutPosition(app);
		const autoClose = game.settings.get('stream-view', 'popout-auto-close-duration');
		this.#popouts.set(app.id, app);
		if (autoClose === 0) {
			return;
		}
		setTimeout(() => this.#closePopout(app.id), 1000 * autoClose);
	}

	/**
	 * @param {string} identifier
	 * @returns {PopoutOptions}
	 * @private
	 */
	#popoutOptions(identifier) {
		if (!StreamView.isStreamUser) {
			return;
		}

		const options = {};
		options.left = game.settings.get('stream-view', `${identifier}-position-x`);
		options.top = game.settings.get('stream-view', `${identifier}-position-y`);
		let maxHeight = game.settings.get('stream-view', `${identifier}-max-height`);
		if (game.combat?.active && game.settings.settings.get(`stream-view.${identifier}-max-height-combat`)) {
			maxHeight = game.settings.get('stream-view', `${identifier}-max-height-combat`) || maxHeight;
		}
		if (maxHeight > 0) {
			options.height = maxHeight;
		}
		if (options.left < 0) {
			options.left = window.innerWidth + options.left;
		}
		if (options.top < 0) {
			options.top = window.innerHeight + options.top;
		}

		return options;
	}

	/**
	 * @param {string} identifier
	 * @param {Application} app
	 * @private
	 */
	#createPopout(identifier, app) {
		if (!StreamView.isStreamUser) {
			return;
		}
		if (this.#popouts.has(identifier)) {
			return;
		}

		const pop = app.createPopout();
		this.#popouts.set(identifier, pop);
		pop.render(true, this.#popoutOptions(identifier));
		window.addEventListener("resize", () => {
			const options = this.#popoutOptions(identifier);
			pop.setPosition(options);
		});
	}

	/**
	 * @param {string} identifier
	 * @private
	 */
	async #closePopout(identifier) {
		if (!StreamView.isStreamUser) {
			return;
		}

		const popout = this.#popouts.get(identifier);
		if (!popout) {
			return;
		}
		this.#popouts.delete(identifier);
		await popout.close();
	}

	/**
	 * @private
	 */
	async #closePopouts() {
		if (!StreamView.isStreamUser) {
			return;
		}

		const ids = [...this.#popouts.keys()];
		for (const id of ids) {
			if (id === StreamViewOptions.PopoutIdentifiers.CHAT || id === StreamViewOptions.PopoutIdentifiers.COMBAT) {
				continue;
			}
			await this.#closePopout(id);
		}
	}

	/**
	 * @param {Combat} combat
	 * @private
	 */
	async #focusCombat(combat = game.combat) {
		const tokens = await this.#combatTokens(combat);

		if (game.settings.get('stream-view', 'select-combatant')) {
			tokens.forEach(tkn => tkn.control({ releaseOthers: false }))
		}

		if (!this.isCameraAutomatic) {
			return;
		}

		if (game.settings.get('stream-view', 'disable-combatant-tracking') || tokens.length === 0) {
			this.#focusPlayers();
			return;
		}
		const coords = this.#tokenCoords(tokens);
		coords.push(...this.#measuredTemplateCoords(this.#combatMeasuredTemplates(combat)));
		this.#animateTo(this.#coordBounds(coords));
	}

	/**
	 * @private
	 */
	#focusUpdate() {
		if (!this.isCameraAutomatic) {
			return;
		}

		if (StreamView.isCombatActive()) {
			this.#focusCombat();
			return;
		}
		this.#focusPlayers();
	}

	/**
	 * @private
	 */
	#focusPlayers() {
		if (!this.isCameraAutomatic) {
			return;
		}

		let tokens = [];
		if (this._trackedTokens.get(this._sceneId)?.size > 0) {
			this._trackedTokens.get(this._sceneId).forEach((id) => {
				const token = game.canvas.tokens.get(id);
				if (token) {
					tokens.push(token);
				}
			});
		} else {
			tokens = this.#speakingTokens();
		}
		if (tokens.length === 0) {
			tokens = this.#playerTokens();
		}
		if (game.settings.get('stream-view', 'ignore-invisible-players')) {
			tokens = tokens.filter((t) => t.visible);
		}
		this.#animateTo(this.#coordBounds(this.#tokenCoords(tokens)));
	}

	/**
	 * @param {string} tokenId
	 * @param {boolean} controlled
	 * @private
	 */
	async #controlToken(tokenId, controlled) {
		const token = game.canvas.tokens.get(tokenId);
		if (!token) {
			return;
		}
		if (controlled) {
			token.control({ releaseOthers: false });
		} else {
			token.release();
		}
	}

	/**
	 * @param {boolean} active
	 * @param {Combat} combat
	 * @private
	 */
	#updateCombat(active, combat) {
		if (active) {
			const maxHeight = game.settings.get('stream-view', 'chat-max-height-combat');
			if (maxHeight > 0) {
				const chat = this.#popouts.get(StreamViewOptions.PopoutIdentifiers.CHAT);
				if (chat && chat.element.length > 0) {
					// Workaround for core refusing to update height if it was initially `auto`
					chat.options.height = maxHeight;
					chat.setPosition({ height: maxHeight });
					chat.scrollBottom();
				}
			}
		} else {
			const maxHeight = game.settings.get('stream-view', 'chat-max-height');
			const chat = this.#popouts.get(StreamViewOptions.PopoutIdentifiers.CHAT);
			if (chat && chat.element.length > 0) {
				if (maxHeight > 0) {
					chat.setPosition({ height: maxHeight });
				} else {
					chat.setPosition({ height: 'auto' });
				}
				chat.scrollBottom();
			}
		}

		if (game.settings.get('stream-view', 'auto-show-combat')) {
			if (!active) {
				this.#closePopout(StreamViewOptions.PopoutIdentifiers.COMBAT);
				this.#focusUpdate();
				return;
			}
			this.#createPopout(StreamViewOptions.PopoutIdentifiers.COMBAT, ui.sidebar.tabs.combat);
		}

		this.#focusCombat(combat);
	}

	/**
	 * @param {Combat} combat
	 * @private
	 */
	async #combatTokens(combat) {
		const p = new Promise((resolve) => {
			let released = 0;
			if (game.settings.get('stream-view', 'select-combatant')) {
				released = game.canvas.tokens.releaseAll();
			}
			if (released === 0) {
				resolve(this.#visibleCombatTokens(combat));
			} else {
				Hooks.once("sightRefresh", () => {
					resolve(this.#visibleCombatTokens(combat));
				});
			}
		});

		return p;
	}

	/**
	 * @returns {Token[]}
	 * @private
	 */
	#speakingTokens() {
		const tokens = [];
		if (!game.settings.get('stream-view', 'pan-on-user-speaking')) {
			return tokens;
		}
		const decay = game.settings.get('stream-view', 'speaker-decay');
		this.#speakerHistory.forEach((hist) => {
			if (
				(hist.current.token && hist.current.isSpeaking) ||
				performance.now() - hist.current.last < decay
			) {
				tokens.push(hist.current.token);
			}
		});
		return tokens;
	}

	/**
	 * @returns {Token[]}
	 * @private
	 */
	#combatPlayerTokens(combatant) {
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

	/**
	 * @returns {Token[]}
	 * @private
	 */
	#combatGMTokens() {
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

	/**
	 * @param {Combat} combat
	 * @returns {Token[]}
	 * @private
	 */
	#visibleCombatTokens(combat) {
		const combatant = combat?.combatant;
		if (!combatant) {
			return [];
		}

		const token = canvas.tokens.get(combatant.token.id);
		if (!token?.isVisible) {
			return [];
		}
		const targets = [token];
		if (StreamView.hasPlayerOwner(combatant.actor)) {
			targets.push(...this.#combatPlayerTokens(combatant));
		} else {
			targets.push(...this.#combatGMTokens());
		}

		return targets;
	}

	/**
	 * @param {Combat} combat
	 * @returns {MeasuredTemplate[]}
	 * @private
	 */
	#combatMeasuredTemplates(combat) {
		const combatant = combat?.combatant;
		if (!combatant) {
			return [];
		}
		let templates = [];
		if (StreamView.hasPlayerOwner(combatant.actor)) {
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

	/**
	 * @param {Token[]} tokens
	 * @returns {Coord[]}
	 * @private
	 */
	#tokenCoords(tokens) {
		const coords = [];
		tokens.forEach((t) => {
			// Use document.x here to avoid in-flight animated coords
			coords.push({ x: t.document.x, y: t.document.y });
			coords.push({ x: t.document.x, y: t.document.y + t.height });
		});
		return coords;
	}

	/**
	 * @param {Template[]} templates
	 * @returns {Coord[]}
	 * @private
	 */
	#measuredTemplateCoords(templates) {
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

	/**
	 * @returns {Token[]}
	 * @private
	 */
	#playerTokens() {
		const tokens = [];

		game.canvas.tokens.placeables.forEach((t) => {
			if (StreamView.hasPlayerOwner(t.actor)) {
				tokens.push(t);
			}
		});
		return tokens;
	}

	/**
	 * @param {string} userId
	 * @returns {Token}
	 * @private
	 */
	async #tokenForGM(userId) {
		if (!this._socket) {
			return null;
		}
		let tokenId;
		try {
			tokenIDs = await this._socket.executeAsUser('controlledTokens', userId);
			if (tokenIDs.length > 0) {
				tokenId = tokenIDs[tokenIDs.length - 1];
			}
		} catch {
			return null;
		}
		if (!tokenId) {
			return null;
		}
		return game.canvas.tokens.get(tokenId);
	}

	/**
	 * @param {Token} token
	 * @param {boolean} isSpeaking
	 * @returns {Promise<void>}
	 * @private
	 */
	async #bubblesUpdate(token, isSpeaking) {
		if (!token || !game.settings.get('stream-view', 'show-speech-bubbles')) {
			return;
		}

		if (!isSpeaking) {
			return this.#speechBubbles.hide(token);
		}

		return this.#speechBubbles.show(token);
	}

	/**
	 * @param {string} userId
	 * @param {boolean} isSpeaking
	 * @returns {Token}
	 * @private
	 */
	async #tokenForSpeaker(userId, isSpeaking) {
		const user = game.users.get(userId);
		if (!user) {
			return;
		}
		let token;
		const hist = this.#speakerHistory.get(userId);
		if (hist && !isSpeaking) {
			token = this.#speakerHistory.get(userId).current.token;
			this.#bubblesUpdate(token, isSpeaking);
			return token;
		}

		if (user.isGM) {
			token = await this.#tokenForGM(userId);
		} else {
			token = game.canvas.tokens.placeables.find(
				(t) => StreamView.hasPlayerOwner(t.actor) && user.character && t.actor.id === user.character.id,
			);
		}
		this.#bubblesUpdate(token, isSpeaking);
		return token;
	}

	/**
	 * @param {Token} token
	 * @returns {boolean}
	 * @private
	 */
	#isChatting(token) {
		if (!StreamView.isStreamUser) {
			return;
		}

		let user;
		if (StreamView.hasPlayerOwner(token.actor)) {
			user = game.users.find((u) => {
				if (u.isGM || u.id === game.settings.get('stream-view', 'user-id')) {
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
		const wasSpeaking = !!this.#speakerHistory.get(user.id)?.current?.isSpeaking;
		this.#speakingUpdate(user.id, true, token);
		setTimeout(() => this.#speakingUpdate(user.id, wasSpeaking, token), 1);
	}

	/**
	 * @param {string} userId
	 * @param {boolean} isSpeaking
	 * @param {Token} token
	 * @private
	 */
	async #speakingUpdate(userId, isSpeaking, token) {
		if (!StreamView.isStreamUser) {
			return;
		}

		if (!token) {
			token = await this.#tokenForSpeaker(userId, isSpeaking);
		}
		if (!token) {
			return;
		}

		const result = {
			previous: this.#speakerHistory.get(userId)?.current,
			current: { isSpeaking: isSpeaking, token: token, last: performance.now() },
		};
		this.#speakerHistory.set(userId, result);

		if (!game.settings.get('stream-view', 'pan-on-user-speaking')) {
			return;
		}

		if (!isSpeaking) {
			if (!result.previous?.isSpeaking) {
				return;
			}
			setTimeout(() => this.#focusUpdate(), game.settings.get('stream-view', 'speaker-decay'));
		}
		this.#focusUpdate();
	}

	/**
	 * @param {JQuery<HTMLElement>} html
	 * @private
	 */
	#hidePopoutHeaders(html) {
		if (!game.settings.get('stream-view', 'hide-popout-headers')) {
			return;
		}
		html.children('header.window-header').hide();
	}

	/**
	 * @param {Application} app
	 * @private
	 */
	#setPopoutPosition(app) {
		if (!game.settings.get('stream-view', 'popout-position-fixed')) {
			return;
		}
		const options = {};
		options.left = game.settings.get('stream-view', `popout-position-x`);
		options.top = game.settings.get('stream-view', `popout-position-y`);
		options.width = game.settings.get('stream-view', `popout-width`);
		options.height = game.settings.get('stream-view', `popout-height`);

		if (options.top < 0) {
			options.top = window.innerHeight + options.top - options.height;
		}
		if (options.left < 0) {
			options.left = window.innerWidth + options.left - options.width
		}
		app.setPosition(options);
	}

	/**
	 * @param {JQuery<HTMLElement>} html
	 * @private
	 */
	#hideHtml(html) {
		if (!StreamView.isStreamUser) {
			return;
		}

		html.hide();
	}

	/**
	 * @param {boolean} toggled
	 * @returns {boolean}
	 * @private
	 */
	#toggleNotes(toggled) {
		const currentLayer = canvas.activeLayer.options.name;
		canvas[NotesLayer.layerOptions.name]?.activate();
		game.settings.set("core", NotesLayer.TOGGLE_SETTING, toggled)
		canvas[currentLayer].activate();
		return this.#getNotesStatus()
	}

	/**
	 * @returns {boolean}
	 * @private
	 */
	#getNotesStatus() {
		return game.settings.get("core", NotesLayer.TOGGLE_SETTING)
	}
}