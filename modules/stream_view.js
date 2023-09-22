import { StreamViewOptions } from './options.js';
import './types.js';

export class StreamView {
	/**
	 * @type {Socketlib|null}
	 */
	#socket = null;

	/**
	 * @type {string}
	 */
	#cameraMode = StreamViewOptions.CameraMode.AUTOMATIC;

	/**
	 * @type {string|null}
	 */
	#sceneId = null;

	/**
	 * @type {Map<string, Set<string>>}
	 * @protected
	 */
	_trackedTokens = new Map();

	/**
	 * @returns {boolean}
	 */
	static get isStreamUser() {
		return game?.user?.id === game.settings.get('stream-view', 'user-id');
	}

	/**
	 * @returns {User|null}
	 */
	static get streamUser() {
		return game.users.get(game.settings.get('stream-view', 'user-id'));
	}

	/**
	 * @param {Combat} combat
	 * @returns {boolean}
	 */
	static isCombatActive(combat = game.combat) {
		return combat?.current?.round > 0;
	}

	/**
	 * Check for player owner (omitting stream user)
	 *
	 * @param {Actor} actor
	 * @returns {boolean}
	 */
	static hasPlayerOwner(actor) {
		if (!actor) {
			return false;
		}
		return game.users.some((u) => !u.isGM && u.id !== game.settings.get('stream-view', 'user-id') && actor.testUserPermission(u, "OWNER"));
	}

	/**
	 * @param {Socketlib} socket 
	 */
	constructor(socket) {
		this.#socket = socket;
		this.#cameraMode = game.settings.get('stream-view', 'camera-mode');
	}

	/**
	 * @returns {string}
	 */
	get cameraMode() {
		return this.#cameraMode;
	}

	/**
	 * @returns {boolean}
	 */
	get isCameraAutomatic() {
		return (
			this.#cameraMode === StreamViewOptions.CameraMode.AUTOMATIC &&
			!(StreamView.isCombatActive() && game.settings.get('stream-view', 'directed-combat'))
		);
	}

	/**
	 * @returns {boolean}
	 */
	get isCameraDirected() {
		return (
			this.#cameraMode === StreamViewOptions.CameraMode.DIRECTED ||
			(StreamView.isCombatActive() && game.settings.get('stream-view', 'directed-combat'))
		);
	}

	/**
	 * @returns {boolean}
	 */
	get isCameraDisabled() {
		return (
			this.#cameraMode === StreamViewOptions.CameraMode.DISABLED &&
			!(StreamView.isCombatActive() && game.settings.get('stream-view', 'directed-combat'))
		);
	}

	/**
	 * @returns {Socketlib}
	 * @protected
	 */
	get _socket() {
		return this.#socket;
	}

	/**
	 * @returns {string|null}
	 * @protected
	 */
	get _sceneId() {
		return this.#sceneId;
	}

	/**
	 * @returns {boolean}
	 * @protected
	 */
	get _isCombatUser() {
		return false;
	}

	setup() {
		Hooks.on('canvasReady', () => this.#handleCanvasReady());
		Hooks.on('renderCameraViews', (_app, html) => this.#hideStreamAVUser(html));
		Hooks.on('updateToken', (doc) => this.#handleTrackedTokensUpdate(doc));
		Hooks.on('deleteToken', (doc) => this.#handleTrackedTokensDelete(doc));
	}

	/**
	 * @param {string} mode
	 */
	async setCameraMode(mode) {
		this.#cameraMode = mode;
	}

	/**
	 * @param {Coord} view
	 * @protected
	 */
	_directedPan(view) {
		if (!this.isCameraDirected || StreamView.streamUser?.viewedScene !== game.canvas.scene.id) {
			return;
		}
		if (StreamView.isCombatActive() && game.settings.get('stream-view', 'directed-combat')) { 
			if (this._isCombatUser) {
				this.#sendDirectedPan(view);
			}
		} else if (game.user.isGM) {
			this.#sendDirectedPan(view);
		}
	}

	/**
	 * @param {TokenDocument} doc
	 * @protected
	 */
	_tokenDocumentHasTracking(doc) {
		return !!doc.getFlag('stream-view', 'tracked');
	}

	/**
	 * @param {Coord} view
	 * @private
	 */
	async #sendDirectedPan(view) {
		if (!this.isCameraDirected || !this.#socket) {
			return;
		}

		try {
			await this.#socket.executeAsUser(
				'animateTo',
				game.settings.get('stream-view', 'user-id'),
				view,
			);
		} catch { }
	}

	/**
	 * @param {JQuery<HTMLElement>} html
	 * @private
	 */
	#hideStreamAVUser(html) {
		if (game.settings.get('stream-view', 'voice-video-hide-stream-user')) {
			const streamCamera = html.find(
				`div[data-user="${game.settings.get('stream-view', 'user-id')}"]`,
			);
			if (streamCamera) {
				streamCamera.hide();
			}
		}
	}

	/**
	 * @private
	 */
	#handleCanvasReady() {
		this.#updateScene()
	}

	/**
	 * @param {TokenDocument} doc
	 * @private
	 */
	#handleTrackedTokensUpdate(doc) {
		if (this._tokenDocumentHasTracking(doc)) {
			this._trackedTokens.get(this._sceneId).add(doc.id);
		} else {
			this._trackedTokens.get(this._sceneId).delete(doc.id);
		}
	}

	/**
	 * @param {Token} token
	 * @private
	 */
	#handleTrackedTokensDelete(token) {
		this._trackedTokens.get(this._sceneId).delete(token.id);
	}

	/**
	 * @private
	 */
	#updateScene() {
		if (!game.canvas?.scene || this.#sceneId === game.canvas.scene.id) {
			return;
		}

		this.#sceneId = game.canvas.scene.id;

		if (!this._trackedTokens.get(this._sceneId)) {
			this._trackedTokens.set(this._sceneId, new Set());
		}
		game.canvas.tokens.placeables.forEach((t) => {
			if (this._tokenDocumentHasTracking(t.document)) {
				this._trackedTokens.get(this._sceneId).add(t.id);
			}
		});
	}
}