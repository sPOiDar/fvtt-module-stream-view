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
		if (game.user.isGM) {
			const gm = new StreamViewGM(this.#socket);
			StreamViewOptions.setup(gm);
			gm.setup();
		} else if (StreamView.isStreamUser) {
			const stream = new StreamViewStream(this.#socket);
			StreamViewOptions.setup(stream);
			stream.setup();
		} else {
			const player = new StreamViewPlayer(this.#socket);
			StreamViewOptions.setup(player);
			player.setup();
		}
	}
}

StreamViewInit.start();
