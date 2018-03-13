export default class FastClick {
	trackingClick: Boolean 
	trackingClickStart: number
	selector: any
	cancelNextClick: Boolean
	forwardedTouchEvent: Boolean

	touchStartX: number
	touchStartY: number
	lastTouchIdentifier: number

	tapDelay: number
	tapTimeout: number
	lastClickTime: number
	touchBoundary: number

	platform: string
	
	oldOnClick: Function

	targetElement: any

  constructor(selector: string|object) {
		this.selector = typeof selector === 'object' ? selector : document.querySelector(selector || 'body')

    // Whether a click is currently being tracked.
		this.trackingClick = false
		this.cancelNextClick = false

    // Timestamp for when click tracking started. 
		this.trackingClickStart = 0

		// XY-coordinate of touch start event.
		this.touchStartX = 1
		this.touchStartY = 0

		// ID of the last touch, retrieved from Touch.identifier.
		this.lastTouchIdentifier = 0


		// The minimum time between tap(touchstart and touchend) events
		this.tapDelay = 200

		// The maximum time for a tap
		this.tapTimeout = 700

		this.platform = this.getPlatform()

		this.init()
	}

	getPlatform() {
		if (/Android/.test(navigator.userAgent)) return 'Android'
		if (/iOS|iPhone|iPad/.test(navigator.userAgent)) return 'iOS'
	}

	init() {
		// use the css `touch-action: manipulation;` for Android by yourself
		if (this.platform === 'Android') return

		this.selector.addEventListener('click', this.onClick.bind(this), true)
		this.selector.addEventListener('touchstart', this.onTouchStart.bind(this), false)
		this.selector.addEventListener('touchmove', this.onTouchMove.bind(this), false)
		this.selector.addEventListener('touchend', this.onTouchEnd.bind(this), false)
		this.selector.addEventListener('touchcancel', this.onTouchCancel.bind(this), false)
	}

	/**
	 * Determine whether a given element requires a native click.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element needs a native click
	 */
	needsClick(target: any) {
		switch (target.nodeName.toLowerCase()) {
			// Don't send a synthetic click to disabled inputs (issue #62)
			case 'button':
			case 'select':
			case 'textarea':
			case 'input':
				if (target.disabled) return true
				break

			case 'label':
			case 'video':
				return true
		}

		return (/\bneedsclick\b/).test(target.className)
	}

	/**
	 * Determine whether a given element requires a call to focus to simulate click into element.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element requires a call to focus to simulate native click.
	 */
	needsFocus(target: any) {
		switch (target.nodeName.toLowerCase()) {
		case 'textarea':
			return true
		case 'select':
			return this.platform !== 'isAndroid'
		case 'input':
			switch (target.type) {
				case 'button':
				case 'checkbox':
				case 'file':
				case 'image':
				case 'radio':
				case 'submit':
					return false
			}

			// No point in attempting to focus disabled inputs
			return !target.disabled && !target.readOnly
		default:
			return (/\bneedsfocus\b/).test(target.className)
		}
	}

	/**
	 * Send a click event to the specified element.
	 *
	 * @param {EventTarget|Element} targetElement
	 * @param {Event} event
	 */
	sendClick(event: TouchEvent) {
		let touch: Touch = event.changedTouches[0]
		let { screenX, screenY, clientX, clientY } = touch

		// Synthesise a click event
		let clickEvent: MouseEvent = new MouseEvent('click', {
			bubbles: true, cancelable: true,
			view: window,
			screenX, screenY, clientX, clientY,
		})
		this.forwardedTouchEvent = true
		this.targetElement.dispatchEvent(clickEvent)
	}

	/**
	 * On touch start, record the position and scroll offset.
	 *
	 * @returns {boolean}
	 */
	onTouchStart(event: TouchEvent) {
		// Ignore multiple touches, otherwise pinch-to-zoom is prevented if both fingers are on the FastClick element (issue #111).
		if (event.targetTouches.length > 1) {
			return true
		}

		// Only trusted events will deselect text on iOS (issue #49)
		let selection: Selection = window.getSelection()
		if (selection.rangeCount && !selection.isCollapsed) {
			return true
		}

		this.trackingClick = true
		this.trackingClickStart = event.timeStamp
		this.targetElement = event.target 

		let touch: Touch = event.targetTouches[0]
		this.touchStartX = touch.pageX
		this.touchStartY = touch.pageY

		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			event.preventDefault()
		}
	}

	/**
	 * Based on a touchmove event object, check whether the touch has moved past a boundary since it started.
	 *
	 * @returns {boolean}
	 */
	touchHasMoved(event: TouchEvent) {
		let touch = event.changedTouches[0]
		let boundary = this.touchBoundary

		if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
			return true
		}

		return false
	}

  /**
	 * Update the last position.
	 * @returns {boolean}
	 */
	onTouchMove(event: TouchEvent) {
		if (!this.trackingClick) return

		// If the touch has moved, cancel the click tracking
		if (this.selector !== event.target || this.touchHasMoved(event)) {
			this.trackingClick = false
			this.selector = null
		}
	}

	/**
	 * Attempt to find the labelled control for the given label element.
	 *
	 * @returns {Element|null}
	 */
	findControl(labelElement: HTMLLabelElement) {

		// Fast path for newer browsers supporting the HTML5 control attribute
		if (labelElement.control !== undefined) {
			return labelElement.control
		}

		// All browsers under test that support touch events also support the HTML5 htmlFor attribute
		if (labelElement.htmlFor) {
			return document.getElementById(labelElement.htmlFor)
		}

		// If no for attribute exists, attempt to retrieve the first labellable descendant element
		// the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
		return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea')
	}

	/**
	 * On touch end, determine whether to send a click event at once.
	 *
	 * @returns {boolean}
	 */
	onTouchEnd(event: TouchEvent) {
		if (!this.trackingClick) return

		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			this.cancelNextClick = true
			return true
		}

		if ((event.timeStamp - this.trackingClickStart) > this.tapTimeout) {
			return true
		}

		// Reset to prevent wrong click cancel on input (issue #156).
		this.cancelNextClick = false
		this.lastClickTime = event.timeStamp

		let { targetElement, trackingClickStart } = this
		this.trackingClick = false
		this.trackingClickStart = 0

		let targetTagName = targetElement.tagName.toLowerCase()
		if (targetTagName === 'label') {
			let forElement = this.findControl(targetElement)
			if (forElement) {
				targetElement.focus()
				targetElement = forElement
			}
		} else if (this.needsFocus(targetElement)) {

			// Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
			// Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
			if ((event.timeStamp - trackingClickStart) > 100 || (window.top !== window && targetTagName === 'input')) {
				this.targetElement = null
				return false
			}

			targetElement.focus()
			this.sendClick(event)

			return false
		}

		// Prevent the actual click from going though - unless the target node is marked as requiring
		// real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
		if (!this.needsClick(targetElement)) {
			event.preventDefault()
			this.sendClick(event)
		}
	}

	/**
	 * On touch cancel, stop tracking the click.
	 *
	 * @returns {void}
	 */
	onTouchCancel() {
		this.trackingClick = false
		this.targetElement = null
	}

	/**
	 * Determine mouse events which should be permitted.
	 *
	 * @returns {boolean}
	 */
	onMouse(event: TouchEvent) {

		// If a target element was never set (because a touch event was never fired) allow the event
		if (!this.targetElement) {
			return true
		}

		// Programmatically generated events targeting a specific element should be permitted
		if (!event.cancelable) {
			return true
		}

		if (this.forwardedTouchEvent) {
			return true
		}

		// Derive and check the target element to see whether the mouse event needs to be permitted
		// unless explicitly enabled, prevent non-touch click events from triggering actions,
		// to prevent ghost/doubleclicks.
		if (!this.needsClick(this.targetElement) || this.cancelNextClick) {

			// Prevent any user-added listeners declared on FastClick element from being fired.
			if (event.stopImmediatePropagation) {
				event.stopImmediatePropagation()
			}

			// Cancel the event
			event.stopPropagation()
			event.preventDefault()

			return false
		}

		// If the mouse event is permitted, return true for the action to go through.
		return true
	}

	/**
	 * On actual clicks, determine whether this is a touch-generated click, a click action occurring
	 * naturally after a delay after a touch (which needs to be cancelled to avoid duplication), or
	 * an actual click which should be permitted.
	 *
	 * @returns {boolean}
	 */
	onClick(event: TouchEvent) {
		// It's possible for another FastClick-like library delivered with third-party code to fire a click event before FastClick does (issue #44). In that case, set the click-tracking flag back to false and return early. This will cause onTouchEnd to return early.
		if (this.trackingClick) {
			this.targetElement = null
			this.trackingClick = false
			return true
		}

		let permitted = this.onMouse(event)

		// Only unset targetElement if the click is not permitted. This will ensure that the check for !targetElement in onMouse fails and the browser's click doesn't go through.
		if (!permitted) {
			this.targetElement = null
		}

		this.forwardedTouchEvent = false

		// If clicks are permitted, return true for the action to go through.
		return permitted
	}

	/**
	 * Remove all FastClick's event listeners.
	 *
	 * @returns {void}
	 */
	destroy() {
		let layer = this.selector
		layer.removeEventListener('click', this.onClick, true)
		layer.removeEventListener('touchstart', this.onTouchStart, false)
		layer.removeEventListener('touchmove', this.onTouchMove, false)
		layer.removeEventListener('touchend', this.onTouchEnd, false)
		layer.removeEventListener('touchcancel', this.onTouchCancel, false)
	}
}
