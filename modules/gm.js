import { StreamView } from "./stream_view.js";
import { StreamViewOptions } from './options.js';
import { StreamViewLayer } from './layer.js';
import './types.js';

const tokenTrackedIcon = 'modules/stream-view/icons/video-solid.svg';

export class StreamViewGM extends StreamView {
	/**
	 * @type {string}
	 */
	#cameraModeLast = StreamViewOptions.CameraMode.AUTOMATIC;

	/**
	 * @type {Set<string>}
	 * @protected
	 */
	#controlledTokenIDs = new Set();

	/**
	 * @type {boolean}
	 */
	#notesStatus = false;

	/**
	 * @override
	 */
	constructor(socket) {
		super(socket);
	}

	/**
	 * @override
	 */
	setup() {
		super.setup();

		const mod = game.modules.get('stream-view');
		mod.instance = this;
		mod.options = StreamViewOptions;

		CONFIG.Canvas.layers.streamView = {
			layerClass: StreamViewLayer,
			group: "interface",
		};

		Hooks.once('ready', () => this.#ready());
		Hooks.on('getSceneControlButtons', (app) => this.#addStreamControls(app));
		Hooks.on('canvasReady', () => this.#handleCanvasReady());
		Hooks.on('updateCombat', (app) => this.#updateCombat(StreamView.isCombatActive(app)));
		Hooks.on('deleteCombat', () => this.#updateCombat(false));
		Hooks.on('renderTokenHUD', (_app, html, tokenHUD) => this.#handleTokenHUD(html, tokenHUD));
		Hooks.on('canvasPan', (_app, view) => this._directedPan(view));
		Hooks.on('controlToken', (token, controlled) => this.#controlledTokenUpdate(token, controlled));
		Hooks.on('drawToken', (token) => this.#handleDrawToken(token));
		Hooks.on('updateToken', (doc) => this.#handleUpdateToken(doc));

		game.keybindings.register('stream-view', 'camera-mode-toggle', {
			name: game.i18n.localize('stream-view.controls.toggle-camera-mode'),
			onDown: () => this.toggleCameraMode(),
			restricted: true,
			precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		});

		game.keybindings.register('stream-view', 'toggle-notes-layer', {
			name: game.i18n.localize('CONTROLS.NoteToggle'),
			onDown: () => this.#sendNotesStatus(!this.#notesStatus),
			restricted: true,
			precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		});

		game.keybindings.register('stream-view', 'close-popouts', {
			name: game.i18n.localize('stream-view.controls.close-popouts'),
			onDown: () => this.closePopouts(),
			restricted: true,
			precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		});

		if (!game.settings.get('stream-view', 'disable-manually-tracked-tokens')) {
			game.keybindings.register('stream-view', 'token-tracked-enable', {
				name: game.i18n.localize('stream-view.controls.token-tracked-enable'),
				onDown: () => this.#toggleControlledTokenTracking(true),
				restricted: true,
				precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
			});

			game.keybindings.register('stream-view', 'token-tracked-clear', {
				name: game.i18n.localize('stream-view.controls.token-tracked-clear'),
				onDown: () => this.clearTrackedTokens(),
				restricted: true,
				precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
			});
		}
	}

	/**
	 * @param {SceneControl[]} controls
	 * @private
	 */
	#addStreamControls(controls) {
		const control = {
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
					active: this.cameraMode === StreamViewOptions.CameraMode.DIRECTED,
					onClick: () => this.toggleCameraMode(),
				},
				{
					name: 'camera-disable',
					title: 'stream-view.controls.toggle-camera-disabled',
					icon: 'fas fa-video-slash',
					toggle: true,
					active: this.cameraMode === StreamViewOptions.CameraMode.DISABLED,
					onClick: () => this.toggleCameraDisabled(),
				},
				{
					name: "toggle",
					title: "CONTROLS.NoteToggle",
					icon: "fas fa-map-pin",
					toggle: true,
					active: this.#notesStatus,
					onClick: () => this.toggleNotes(),
				},
				{
					name: 'close-popouts',
					title: 'stream-view.controls.close-popouts',
					icon: 'far fa-window-restore',
					onClick: () => this.closePopouts(),
				},
			],
		};
		if (!game.settings.get('stream-view', 'disable-manually-tracked-tokens')) {
			control.tools.push({
				name: 'token-tracked-clear',
				title: 'stream-view.controls.token-tracked-clear',
				icon: 'fas fa-users-slash',
				onClick: () => this.clearTrackedTokens(),
			});
		}
		controls.push(control);
	}

	/**
	 * @private
	 */
	#ready() {
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

		// Stream
		this._socket.register('animateTo', ({ x, y, scale }) => {});
		this._socket.register('setCameraMode', (mode) => {});
		this._socket.register('controlToken', (tokenId, controlled) => {});
		this._socket.register('closePopouts', () => {});
		this._socket.register('toggleNotes', (toggled) => {});
		this._socket.register('getNotesStatus', () => {});

		// GM
		this._socket.register('streamConnected', (userId) => this.#streamConnected(userId));
		this._socket.register('controlledTokens', () => { return this.#controlledTokens() });
		this._socket.register('previewCamera', ({ x, y, width, height }) => this.#previewCamera({ x, y, width, height }));

		try {
			this.#sendGetNotesStatus();
		} catch { }
	}

	/**
	 * @param {JQuery<HTMLElement>} html
	 * @param {TokenHUD} tokenHUD
	 * @private
	 */
	#handleTokenHUD(html, tokenHUD) {
		if (game.settings.get('stream-view', 'disable-manually-tracked-tokens') || !game.user?.isGM) {
			return;
		}

		const token = game.canvas.tokens.get(tokenHUD._id);
		const rightCol = html.find('div.col.right');
		if (rightCol) {
			const title = game.i18n.localize('stream-view.controls.token-track-toggle');
			let isActive = this._tokenDocumentHasTracking(token.document);
			const icon = $(`<div class="control-icon ${isActive ? 'active' : ''}"><i title="${title}" class="fas fa-video"></i></div>`);
			icon.on('click', () => {
				this.#toggleControlledTokenTracking(!this._tokenDocumentHasTracking(token.document));
				icon.toggleClass('active');
			});
			rightCol.append(icon);
		}
	}

	/**
	 * @private
	 */
	#handleCanvasReady() {
		this.#updateTrackedIcons();
		this.#previewRefresh();
	}

	/**
	 * @param {TokenDocument} doc
	 * @private
	 */
	#handleUpdateToken(doc) {
		const token = game.canvas.tokens.get(doc.id);
		if (token) {
			this.#toggleTokenTrackedIcon(token, this._tokenDocumentHasTracking(doc));
		}
	}

	/**
	 * @returns {Token[]}
	 * @private
	 */
	#controlledTokens() {
		return this.#controlledTokenIDs;
	}

	/**
	 * @private
	 */
	#updateTrackedIcons() {
		game.canvas.tokens.placeables.forEach((t) => {
			if (this._tokenDocumentHasTracking(t.document)) {
				this.#toggleTokenTrackedIcon(t, true);
			}
		});
	}

	/**
	 * @param {LayerPreview} view
	 * @private
	 */
	#previewCamera({ x, y, width, height }) {
		canvas.streamView.drawPreview({ x, y, width, height });
	}

	/**
	 * @private
	 */
	#previewRefresh() {
		const layer = canvas.layers.find((l) => l instanceof StreamViewLayer);
		if (layer) {
			layer.refresh();
		}
	}

	/**
	 * @param {boolean} active
	 * @private
	 */
	#updateCombat(active) {
		if (!active || !this.isCameraDirected) {
			return;
		}
		this._directedPan({
			x: canvas.stage.pivot.x,
			y: canvas.stage.pivot.y,
			scale: canvas.stage.scale.x,
		});
	}

	/**
	 * @private
	 */
	async #sendGetNotesStatus() {
		try {
			this.#notesStatus = await this._socket.executeAsUser(
				'getNotesStatus',
				game.settings.get('stream-view', 'user-id')
			);
		} catch {
			return;
		}
	}

	/**
	 * @param {string} mode
	 */
	async #sendSetCameraMode(mode) {
		if (!this._socket) {
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
			`Stream View camera mode is now ${StreamViewOptions.localizeCameraMode(this.cameraMode)}`,
		);
	}

	/**
	 * @param {boolean} active
	 */
	async #sendNotesStatus(active) {
		try {
			this.#notesStatus = await this._socket.executeAsUser(
				'toggleNotes',
				game.settings.get('stream-view', 'user-id'),
				active
			);
		} catch (e) {
			ui.notifications.warn(`Could not toggle Stream View notes status (user not connected?)`);
			return;
		}
	}

	/**
	 * @param {string} userId
	 * @private
	 */
	#streamConnected(userId) {
		if (userId === game.settings.get('stream-view', 'user-id')) {
			this.#sendGetNotesStatus();
		}
	}

	/**
	 * @param {Token} token
	 * @private
	 */
	#handleDrawToken(token) {
		token._streamViewContainer ||= token.addChild(new PIXI.Container());
	}

	/**
	 * @param {Token} token
	 * @param {boolean} active
	 * @private
	 */
	async #toggleTokenTrackedIcon(token, active) {
		this.#handleDrawToken(token);
		token._streamViewContainer.removeChildren().forEach((c) => c.destroy());
		if (active) {
			const w = Math.round(canvas.dimensions.size / 2 / 4) * 2;
			const tex = await loadTexture(tokenTrackedIcon, { fallback: "icons/svg/hazard.svg" });
			const icon = new PIXI.Sprite(tex);
			icon.width = icon.height = w;
			icon.x = token.w - w;
			icon.y = (token.h / 2) - (w / 2);
			token._streamViewContainer.addChild(icon);
		}
	}

	/**
	 * @param {Token} token
	 * @param {boolean} active
	 * @private
	 */
	#toggleTokenTracking(token, active) {
		if (!token) {
			return;
		}

		if (active) {
			token.document.setFlag('stream-view', 'tracked', true);
		} else {
			token.document.unsetFlag('stream-view', 'tracked');
		}
	}

	/**
	 * @param {boolean} active
	 * @private
	 */
	#toggleControlledTokenTracking(active) {
		game.canvas.tokens.controlled.forEach((t) => this.#toggleTokenTracking(t, active));
	}

	/**
	 * @param {Token} token
	 * @param {boolean} controlled
	 */
	async #controlledTokenUpdate(token, controlled) {
		if (controlled) {
			this.#controlledTokenIDs.add(token.id);
		} else {
			this.#controlledTokenIDs.delete(token.id);
		}

		if (game.settings.get('stream-view', 'gm-track-controlled')) {
			try {
				await this._socket.executeAsUser('controlToken', game.settings.get('stream-view', 'user-id'), token.id, controlled);
			} catch { }
		}
	}

	/**
	 * @override
	 */
	get _isCombatUser() {
		if (!StreamView.isCombatActive()) {
			return false;
		}
		// If the current combatant has a player owner, but the player is inactive, allow GM control
		return !game.users.some((u) => u.active && !u.isGM && u.id !== game.settings.get('stream-view', 'user-id') && game.combat?.combatant?.actor?.testUserPermission(u, "OWNER"));
	}

	async toggleCameraMode() {
		if (!this._socket) {
			return;
		}

		let targetMode = StreamViewOptions.CameraMode.AUTOMATIC;
		if (this.isCameraAutomatic) {
			targetMode = StreamViewOptions.CameraMode.DIRECTED;
		}
		await this.setCameraMode(targetMode);
	}

	async toggleNotes() {
		await this.#sendNotesStatus(!this.#notesStatus);
	}

	async toggleCameraDisabled() {
		if (!game.user.isGM) {
			return;
		}
		if (!this._socket) {
			return;
		}

		let targetMode = StreamViewOptions.CameraMode.DISABLED;
		if (this.isCameraDisabled) {
			targetMode = this.#cameraModeLast;
		} else {
			// Store last camera mode fore restore
			this.#cameraModeLast = this.cameraMode;
		}
		await this.setCameraMode(targetMode);
	}

	/**
	 * @override
	 */
	async setCameraMode(mode) {
		super.setCameraMode(mode);

		await this.#sendSetCameraMode(mode);
	}

	async closePopouts() {
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

	clearTrackedTokens() {
		this._trackedTokens.get(this._sceneId).forEach((t) => {
			const token = game.canvas.tokens.get(t);
			this.#toggleTokenTracking(token, false);
		});
		ui.notifications.info('Stream View tracked tokens cleared');
	}
}