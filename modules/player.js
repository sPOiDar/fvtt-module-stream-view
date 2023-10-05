import { StreamView } from "./stream_view.js";
import './types.js';

export class StreamViewPlayer extends StreamView {
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

		Hooks.once('ready', () => this.#ready());
		Hooks.on('updateCombat', (app) => this.#updateCombat(StreamView.isCombatActive(app)));
		Hooks.on('deleteCombat', () => this.#updateCombat(false));
		Hooks.on('canvasPan', (_app, view) => this._directedPan(view));
	}

	/**
	 * @override
	 */
	get _isCombatUser() {
		if (!StreamView.isCombatActive()) {
			return false;
		}
		if (StreamView.hasPlayerOwner(game.combat?.combatant?.actor)) {
			return game.combat.combatant.actor.testUserPermission(game.user, 'OWNER');
		}
		return false;
	}

	/**
	 * @private
	 */
	#ready() {
		// Stream
		this._socket.register('animateTo', ({ x, y, scale }) => {});
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
}