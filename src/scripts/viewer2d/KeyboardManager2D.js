import { EventDispatcher } from 'three';
import { EVENT_KEY_PRESSED, EVENT_KEY_RELEASED } from '../core/events';

export class KeyboardListener2D extends EventDispatcher {
    constructor() {
        super();
        this.__keyDownEvent = this.__keyDown.bind(this);
        this.__keyUpEvent = this.__keyUp.bind(this);

        window.addEventListener('keydown', this.__keyDownEvent);
        window.addEventListener('keyup', this.__keyUpEvent);
    }

    __keyDown(evt) {
        this.dispatchEvent({ type: EVENT_KEY_PRESSED, key: evt.key, code: evt.code });
    }

    __keyUp(evt) {
        this.dispatchEvent({ type: EVENT_KEY_RELEASED, key: evt.key, code: evt.code });
    }

    remove() {
        window.removeEventListener('keydown', this.__keyDownEvent);
        window.removeEventListener('keyup', this.__keyUpEvent);
    }
}