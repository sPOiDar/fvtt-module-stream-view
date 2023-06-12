/**
 * The Speech Bubble Class
 * This application displays a temporary message sent from a particular Token in the active Scene.
 * The message is displayed on the HUD layer just above the Token.
 */
export class SpeechBubbles {
	static containerId = 'speech-bubbles';

	constructor() {
		this.template = "modules/stream-view/templates/speech-bubble.html";
	}

	/* -------------------------------------------- */

	/**
	 * A reference to the speech bubbles HTML container in which rendered bubbles should live
	 * @returns {JQuery<HTMLElement>}
	 */
	get container() {
		return $(`#${SpeechBubbles.containerId}`);
	}

	/* -------------------------------------------- */

	/**
	 * Speak a message as a particular Token, displaying it as a speech bubble
	 * @param {Token} token			 The speaking Token
	 * @returns {Promise<void>}	 A Promise which resolves once the speech bubble has been created
	 */
	async show(token) {
		if (!token) return;

		// Clear any existing bubble for the speaker
		await this.hide(token);

		// Create the HTML and call the speechBubble hook
		let html = $(await this.#renderHTML({ token }));

		// Set initial dimensions
		this.#setPosition(token, html, { width: 32, height: 32 });

		// Append to DOM
		this.container.append(html);

		// Animate the bubble
		return new Promise((resolve) => {
			html.fadeIn(250, () => resolve());
		});
	}

	/* -------------------------------------------- */

	/**
	 * Clear any existing speech bubble for a certain Token
	 * @param {Token} token
	 * @returns {Promise<void>}	 A Promise which resolves once the speech bubble has been created
	 */
	async hide(token) {
		let existing = $(`.speech-bubble[data-token-id="${token.id}"]`);
		if (!existing.length) return;
		return new Promise(resolve => {
			existing.fadeOut(100, () => {
				existing.remove();
				resolve();
			});
		})
	}

	/* -------------------------------------------- */

	/**
	 * Render the HTML template for the speech bubble
	 * @param {Object} data				 Template data
	 * @returns {Promise<string>}		The rendered HTML
	 * @private
	 */
	async #renderHTML(data) {
		return renderTemplate(this.template, data);
	}

	/**
	 * Assign styling parameters to the speech bubble, toggling either a left or right display (randomly)
	 * @param {Token} token 
	 * @param {JQuery<HTMLElement>} html 
	 * @param {Dimensions} dimensions 
	 */
	#setPosition(token, html, dimensions) {
		const pos = {
			height: dimensions.height,
			width: dimensions.width,
			top: token.y - 8 - dimensions.height,
			left: token.center.x - Math.round((dimensions.width / 2)),
		};
		html.css(pos);
	}
}

