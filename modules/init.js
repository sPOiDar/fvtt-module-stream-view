import { StreamViewOptions } from './options.js';
import { StreamView } from './stream_view.js';
import { StreamViewGM } from './gm.js';
import { StreamViewStream } from './stream.js';
import { StreamViewPlayer } from './player.js';

class StreamViewInit {
	/**
	 * @type {Socketlib}
	 * @private
	 */
	static #socket;

	static start() {
		Hooks.once('init', () => StreamViewInit.init());
		Hooks.once('socketlib.ready', () => StreamViewInit.initSocket());
		Hooks.once('setup', () => StreamViewInit.setup());
	}

	static init() {
		StreamViewOptions.init();
	}

	static initSocket() {
		this.#socket = socketlib.registerModule('stream-view');
	}

	static setup() {
		let user, isGM;
		if (game.release?.generation < 11) {
			user = game.data.users.find((u) => {
				return u._id === game.userId;
			});
			if (!user) {
				console.error("StreamView: Could not find current user");
			}
			user.id = user._id;
			isGM = user.role === 4;
		} else {
			user = game.user;
			isGM = game.user.isGM;
		}
		if (isGM) {
			const gm = new StreamViewGM(this.#socket);
			Hooks.once('ready', () => StreamViewOptions.ready(gm));
			gm.setup();
		} else if (user.id === game.settings.get('stream-view', 'user-id')) {
			const stream = new StreamViewStream(this.#socket);
			Hooks.once('ready', () => StreamViewOptions.ready(stream));
			stream.setup();
		} else {
			const player = new StreamViewPlayer(this.#socket);
			Hooks.once('ready', () => StreamViewOptions.ready(player));
			player.setup();
		}
	}
}

StreamViewInit.start();
