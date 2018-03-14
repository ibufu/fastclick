## Usage ##

```shell
$ npm install modern-fastclick --save
```

The script must be loaded prior to instantiating FastClick on any element of the page.

To instantiate FastClick on the `body`, which is the recommended method of use:

```js
document.addEventListener('DOMContentLoaded', () => {
  new FastClick(document.body)
}, false)
```

### Ignore certain elements with `needsclick` ###

Sometimes you need FastClick to ignore certain elements. You can do this easily by adding the `needsclick` class.
```html
<a class="needsclick">Ignored by FastClick</a>
```
## When it isn't needed ##

FastClick doesn't attach any listeners on desktop browsers.

Chrome 32+ on Android with `width=device-width` in the [viewport meta tag](https://developer.mozilla.org/en-US/docs/Mobile/Viewport_meta_tag) doesn't have a 300ms delay, therefore listeners aren't attached.

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Same goes for Chrome on Android (all versions) with `user-scalable=no` in the viewport meta tag. But be aware that `user-scalable=no` also disables pinch zooming, which may be an accessibility concern.

If your page work with WKWebView in iOS, you can use the native css `touch-action: manipulation;` only.(UIWebView doesn't support yet)
