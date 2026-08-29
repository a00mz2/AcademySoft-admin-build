// Compiles a dart2wasm-generated main module from `source` which can then
// be instantiated via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(
      await WebAssembly.compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm module from `bytes` which is then
// instantiable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredModules` is a JS function that takes an array of module names
  //   matching wasm files produced by the dart2wasm compiler. It also takes a
  //   callback that should be invoked for each loaded module with 2 arguments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDeferredId` is a JS function that takes load ID produced by the
  //   compiler when the `use-load-ids` option is passed. Each load ID maps to
  //   one or more wasm files as specified in the emitted JSON file. It also
  //   takes a callback that should be invoked for each loaded module with 2
  //   arguments: (1) the module name, (2) the loaded module in a format
  //   supported by `WebAssembly.compile` or `WebAssembly.compileStreaming`.
  //   The callback returns a Promise that resolves when the module is
  //   instantiated.
  //   loadDeferredId should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  async instantiate(additionalImports, {loadDeferredModules, loadDeferredId} = {}) {
    let dartInstance;

    // Prints to the console
    function printToConsole(value) {
      if (typeof dartPrint == "function") {
        dartPrint(value);
        return;
      }
      if (typeof console == "object" && typeof console.log != "undefined") {
        console.log(value);
        return;
      }
      if (typeof print == "function") {
        print(value);
        return;
      }

      throw "Unable to print message: " + value;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
      wrapped.dartFunction = dartFunction;
      wrapped[jsWrappedDartFunctionSymbol] = true;
      return wrapped;
    }

    // Imports
    const dart2wasm = {
            AB: x0 => new Int16Array(x0),
      AC: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      AD: o => {
        if (o === null || o === undefined) return 0;
        if (typeof(o) === 'string') return 1;
        return 2;
      },
      AE: (x0,x1) => x0.getPropertyValue(x1),
      AF: x0 => x0.identifier,
      AG: (x0,x1) => x0.querySelectorAll(x1),
      AH: x0 => x0.clipboard,
      AI: x0 => x0.disabled,
      AJ: (x0,x1) => { x0.src = x1 },
      AK: (x0,x1) => { x0.download = x1 },
      AL: x0 => x0.files,
      B: s => printToConsole(s),
      BB: x0 => new Uint16Array(x0),
      BC: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      BD: x0 => x0.tabIndex,
      BE: x0 => globalThis.parseFloat(x0),
      BF: x0 => x0.touches,
      BG: (x0,x1) => x0.requestAnimationFrame(x1),
      BH: (x0,x1) => x0.writeText(x1),
      BI: (x0,x1) => { x0.min = x1 },
      BJ: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      BK: (x0,x1) => { x0.href = x1 },
      BL: (x0,x1) => { x0.accept = x1 },
      C: Function.prototype.call.bind(Number.prototype.toString),
      CB: x0 => new Int32Array(x0),
      CC: (x0,x1) => x0.querySelector(x1),
      CD: (x0,x1) => x0.contains(x1),
      CE: (x0,x1) => x0.getComputedStyle(x1),
      CF: x0 => x0.pressure,
      CG: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      CH: x0 => x0.unlock(),
      CI: (x0,x1) => { x0.max = x1 },
      CJ: x0 => x0.naturalHeight,
      CK: () => globalThis.document,
      CL: (x0,x1) => { x0.multiple = x1 },
      D: Function.prototype.call.bind(BigInt.prototype.toString),
      DB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      DC: (x0,x1) => x0.item(x1),
      DD: x0 => x0.activeElement,
      DE: x0 => x0.documentElement,
      DF: x0 => x0.tiltY,
      DG: x0 => x0.now(),
      DH: (x0,x1) => x0.lock(x1),
      DI: (x0,x1) => { x0.disabled = x1 },
      DJ: x0 => x0.naturalWidth,
      DK: (x0,x1) => x0.transferFromImageBitmap(x1),
      DL: (x0,x1) => { x0.draggable = x1 },
      E: (exn) => {
        let stackString = exn.toString();
        let frames = stackString.split('\n');
        let drop = 4;
        if (frames[0].startsWith('Error')) {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      EB: x0 => new Uint32Array(x0),
      EC: x0 => x0.length,
      ED: x0 => x0.parentNode,
      EE: x0 => x0.computedStyleMap(),
      EF: x0 => x0.tiltX,
      EG: x0 => x0.performance,
      EH: x0 => x0.orientation,
      EI: (x0,x1) => { x0.scrollLeft = x1 },
      EJ: x0 => x0.decode(),
      EK: (x0,x1) => x0.getContext(x1),
      EL: (x0,x1) => { x0.type = x1 },
      F: () => new Error().stack,
      FB: x0 => new Float32Array(x0),
      FC: (x0,x1) => x0.querySelectorAll(x1),
      FD: x0 => x0.tagName,
      FE: (x0,x1) => x0.get(x1),
      FF: x0 => x0.pointerType,
      FG: (d, digits) => d.toFixed(digits),
      FH: (x0,x1) => x0.querySelector(x1),
      FI: (x0,x1) => { x0.spellcheck = x1 },
      FJ: (x0,x1) => { x0.decoding = x1 },
      FK: (x0,x1) => { x0.height = x1 },
      FL: x0 => x0.onLine,
      G: s => JSON.stringify(s),
      GB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      GC: (x0,x1) => x0.getAttribute(x1),
      GD: x0 => x0.target,
      GE: (o, p) => p in o,
      GF: x0 => x0.pointerId,
      GG: x0 => x0.maxHeight,
      GH: (x0,x1) => { x0.title = x1 },
      GI: (x0,x1) => { x0.disabled = x1 },
      GJ: (x0,x1) => { x0.crossOrigin = x1 },
      GK: (x0,x1) => { x0.width = x1 },
      GL: x0 => x0.navigator,
      H: Function.prototype.call.bind(Number.prototype.toString),
      HB: x0 => new Float64Array(x0),
      HC: x0 => x0.remove(),
      HD: x0 => x0.clientY,
      HE: (x0,x1) => { x0.textContent = x1 },
      HF: x0 => x0.getCoalescedEvents(),
      HG: x0 => x0.maxWidth,
      HH: (x0,x1) => x0.vibrate(x1),
      HI: (a, i) => a.splice(i, 1),
      HJ: (x0,x1) => x0.createObjectURL(x1),
      HK: x0 => x0.height,
      HL: x0 => x0.length,
      I: Function.prototype.call.bind(String.prototype.indexOf),
      IB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      IC: (x0,x1) => x0.appendChild(x1),
      ID: x0 => x0.clientX,
      IE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      IF: (x0,x1) => x0.getModifierState(x1),
      IG: x0 => x0.minHeight,
      IH: x0 => x0.arrayBuffer(),
      II: a => a.pop(),
      IJ: x0 => x0.URL,
      IK: x0 => x0.width,
      IL: x0 => x0.getReader(),
      J: (s, p, i) => s.lastIndexOf(p, i),
      JB: x0 => new ArrayBuffer(x0),
      JC: (x0,x1) => x0.append(x1),
      JD: (x0,x1,x2) => x0.setAttribute(x1,x2),
      JE: x0 => x0.matches,
      JF: s => s.trimLeft(),
      JG: x0 => x0.minWidth,
      JH: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      JI: (map, o, v) => map.set(o, v),
      JJ: x0 => new Blob(x0),
      JK: x0 => x0.rasterEndMilliseconds,
      JL: x0 => x0.value,
      K: (exn) => {
        if (exn instanceof Error) {
          return exn.stack;
        } else {
          return null;
        }
      },
      KB: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      KC: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      KD: x0 => x0.getBoundingClientRect(),
      KE: (x0,x1) => x0.matchMedia(x1),
      KF: (x0,x1) => x0[x1],
      KG: (x0,x1) => x0.removeProperty(x1),
      KH: x0 => x0.status,
      KI: (map, o) => map.get(o),
      KJ: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      KK: x0 => x0.rasterStartMilliseconds,
      KL: x0 => x0.done,
      L: o => o === undefined,
      LB: (x0,x1,x2) => new DataView(x0,x1,x2),
      LC: x0 => x0.style,
      LD: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      LE: x0 => x0.matches,
      LF: x0 => x0.index,
      LG: (x0,x1) => x0.add(x1),
      LH: (x0,x1) => x0.fetch(x1),
      LI: () => new WeakMap(),
      LJ: x0 => new window.ImageDecoder(x0),
      LK: x0 => x0.imageBitmaps,
      LL: x0 => x0.read(),
      M: o => String(o),
      MB: (o, p) => o[p],
      MC: x0 => x0.debugShowSemanticsNodes,
      MD: s => new Date(s * 1000).getTimezoneOffset() * 60,
      ME: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      MF: s => s.toUpperCase(),
      MG: x0 => x0.data,
      MH: x0 => x0.content,
      MI: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      MJ: x0 => x0.name,
      MK: x0 => x0.canvasKitMaximumSurfaces,
      ML: x0 => x0.body,
      N: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      NB: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      NC: o => o,
      ND: Date.now,
      NE: f => f.dartFunction,
      NF: x0 => x0.pop(),
      NG: (x0,x1) => { x0.scrollTop = x1 },
      NH: x0 => x0.document,
      NI: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      NJ: x0 => x0.repetitionCount,
      NK: x0 => x0.nextSibling,
      NL: (x0,x1) => new OffscreenCanvas(x0,x1),
      O: (x0,x1) => x0.didCreateEngineInitializer(x1),
      OB: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      OC: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'boolean') return 1;
        return 2;
      },
      OD: (handle) => clearTimeout(handle),
      OE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      OF: x0 => x0.flags,
      OG: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      OH: () => typeof dartUseDateNowForTicks !== "undefined",
      OI: (o, p) => p in o,
      OJ: x0 => x0.frameCount,
      OK: (x0,x1) => x0.debug(x1),
      OL: x0 => x0.assetBase,
      P: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      PB: o => o.byteOffset,
      PC: (x0,x1) => x0.warn(x1),
      PD: (a, l) => a.length = l,
      PE: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      PF: (a, s) => a.join(s),
      PG: (x0,x1) => { x0.value = x1 },
      PH: () => Date.now(),
      PI: x0 => x0.groups,
      PJ: x0 => x0.selectedTrack,
      PK: x0 => x0.hostElement,
      PL: x0 => x0.loader,
      Q: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      QB: o => o.buffer,
      QC: x0 => x0.console,
      QD: (x0,x1) => x0.closest(x1),
      QE: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      QF: (x0,x1) => x0.error(x1),
      QG: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      QH: () => 1000 * performance.now(),
      QI: x0 => new WeakRef(x0),
      QJ: x0 => x0.completed,
      QK: x0 => x0.location,
      QL: () => globalThis._flutter,
      R: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      RB: Function.prototype.call.bind(DataView.prototype.getUint8),
      RC: () => globalThis.window,
      RD: x0 => x0.bottom,
      RE: (o, i) => o[i],
      RF: () => globalThis.console,
      RG: (x0,x1) => { x0.value = x1 },
      RH: x0 => new Uint8Array(x0),
      RI: x0 => x0.deref(),
      RJ: x0 => x0.ready,
      RK: (x0,x1) => x0.getModifierState(x1),
      S: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      SB: (b, o) => new DataView(b, o),
      SC: (o, c) => o instanceof c,
      SD: x0 => x0.top,
      SE: o => o.length,
      SF: s => s.trimRight(),
      SG: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      SH: (x0,x1,x2) => x0.slice(x1,x2),
      SI: () => globalThis.WeakRef,
      SJ: x0 => x0.tracks,
      SK: x0 => x0.metaKey,
      T: x0 => new Promise(x0),
      TB: (b, o, l) => new DataView(b, o, l),
      TC: (x0,x1) => x0.exec(x1),
      TD: x0 => x0.right,
      TE: o => {
        if (o === undefined) return 1;
        var type = typeof o;
        if (type === 'boolean') return 2;
        if (type === 'number') return 3;
        if (type === 'string') return 4;
        if (o instanceof Array) return 5;
        if (ArrayBuffer.isView(o)) {
          if (o instanceof Int8Array) return 6;
          if (o instanceof Uint8Array) return 7;
          if (o instanceof Uint8ClampedArray) return 8;
          if (o instanceof Int16Array) return 9;
          if (o instanceof Uint16Array) return 10;
          if (o instanceof Int32Array) return 11;
          if (o instanceof Uint32Array) return 12;
          if (o instanceof Float32Array) return 13;
          if (o instanceof Float64Array) return 14;
          if (o instanceof DataView) return 15;
        }
        if (o instanceof ArrayBuffer) return 16;
        // Feature check for `SharedArrayBuffer` before doing a type-check.
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
            return 17;
        }
        if (o instanceof Promise) return 18;
        return 19;
      },
      TF: x0 => x0.blur(),
      TG: x0 => x0.value,
      TH: (x0,x1) => x0.decode(x1),
      TI: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      TJ: x0 => x0.close(),
      TK: x0 => x0.altKey,
      U: (x0,x1,x2) => x0.call(x1,x2),
      UB: Function.prototype.call.bind(DataView.prototype.getFloat64),
      UC: x0 => x0.length,
      UD: x0 => x0.left,
      UE: x0 => x0.language,
      UF: x0 => x0.button,
      UG: x0 => x0.selectionDirection,
      UH: (x0,x1) => x0.adoptText(x1),
      UI: (a, s, e) => a.slice(s, e),
      UJ: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      UK: x0 => x0.ctrlKey,
      V: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      VB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float64Array) return 1;
        return 2;
      },
      VC: (x0,x1) => { x0.lastIndex = x1 },
      VD: x0 => x0.clientY,
      VE: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      VF: x0 => x0.innerHeight,
      VG: x0 => x0.selectionStart,
      VH: x0 => x0.first(),
      VI: () => new XMLHttpRequest(),
      VJ: (x0,x1) => x0.decode(x1),
      VK: x0 => x0.isComposing,
      W: x0 => new Array(x0),
      WB: Function.prototype.call.bind(DataView.prototype.setFloat64),
      WC: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      WD: x0 => x0.clientX,
      WE: () => globalThis.window.FinalizationRegistry,
      WF: x0 => x0.innerWidth,
      WG: x0 => x0.selectionEnd,
      WH: x0 => x0.next(),
      WI: (x0,x1,x2) => x0.open(x1,x2),
      WJ: x0 => x0.displayHeight,
      WK: x0 => x0.code,
      X: o => [o],
      XB: (t, s) => t.set(s),
      XC: o => o instanceof RegExp,
      XD: x0 => x0.changedTouches,
      XE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      XF: x0 => x0.height,
      XG: x0 => x0.value,
      XH: x0 => x0.current(),
      XI: (x0,x1) => x0.send(x1),
      XJ: x0 => x0.displayWidth,
      XK: x0 => x0.repeat,
      Y: (o0, o1) => [o0, o1],
      YB: Function.prototype.call.bind(DataView.prototype.setFloat32),
      YC: (string, times) => string.repeat(times),
      YD: x0 => x0.offsetY,
      YE: x0 => new window.FinalizationRegistry(x0),
      YF: x0 => x0.width,
      YG: x0 => x0.selectionDirection,
      YH: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      YI: x0 => x0.send(),
      YJ: x0 => x0.duration,
      YK: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      Z: (o0, o1, o2) => [o0, o1, o2],
      ZB: Function.prototype.call.bind(DataView.prototype.getFloat32),
      ZC: x0 => x0.dotAll,
      ZD: x0 => x0.offsetX,
      ZE: (x0,x1) => x0.unregister(x1),
      ZF: x0 => x0.clientHeight,
      ZG: x0 => x0.selectionStart,
      ZH: x0 => x0.v8BreakIterator,
      ZI: x0 => x0.readyState,
      ZJ: x0 => x0.image,
      ZK: (x0,x1,x2) => x0.setItem(x1,x2),
      a: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      aB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float32Array) return 1;
        return 2;
      },
      aC: x0 => x0.unicode,
      aD: x0 => x0.type,
      aE: (x0,x1) => x0.contains(x1),
      aF: x0 => x0.clientWidth,
      aG: x0 => x0.selectionEnd,
      aH: () => globalThis.Intl,
      aI: x0 => x0.abort(),
      aJ: () => globalThis.window.ImageDecoder,
      aK: x0 => x0.localStorage,
      b: (x0,x1,x2) => { x0[x1] = x2 },
      bB: Function.prototype.call.bind(DataView.prototype.getUint32),
      bC: x0 => x0.ignoreCase,
      bD: x0 => x0.maxTouchPoints,
      bE: (s) => +s,
      bF: (x0,x1) => { x0.content = x1 },
      bG: x0 => x0.keyCode,
      bH: (x0,x1) => x0.segment(x1),
      bI: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      bJ: (x0,x1) => x0.getRandomValues(x1),
      bK: () => globalThis.window,
      c: o => o,
      cB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint32Array) return 1;
        return 2;
      },
      cC: x0 => x0.multiline,
      cD: x0 => x0.platform,
      cE: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      cF: (x0,x1) => { x0.name = x1 },
      cG: (x0,x1) => x0.scrollIntoView(x1),
      cH: x0 => x0.index,
      cI: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      cJ: () => globalThis.crypto,
      cK: (x0,x1) => x0.getItem(x1),
      d: (o, p) => o[p],
      dB: Function.prototype.call.bind(DataView.prototype.getInt32),
      dC: (string, token) => string.split(token),
      dD: x0 => x0.body,
      dE: s => s.trim(),
      dF: x0 => x0.head,
      dG: x0 => x0.multiViewEnabled,
      dH: x0 => x0.next(),
      dI: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      dJ: l => new DataView(new ArrayBuffer(l)),
      dK: (x0,x1) => x0.key(x1),
      e: () => globalThis,
      eB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int32Array) return 1;
        return 2;
      },
      eC: o => o instanceof Array,
      eD: () => globalThis.document,
      eE: x0 => x0.classList,
      eF: (x0,x1) => x0.removeChild(x1),
      eG: (x0,x1) => x0.replaceWith(x1),
      eH: x0 => x0.value,
      eI: x0 => x0.upload,
      eJ: x0 => x0.decode(),
      eK: x0 => x0.length,
      f: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      fB: o => o instanceof Uint16Array,
      fC: (a, i) => a[i],
      fD: (x0,x1,x2) => x0.addEventListener(x1,x2),
      fE: x0 => x0.preventDefault(),
      fF: x0 => x0.firstChild,
      fG: (x0,x1) => { x0.type = x1 },
      fH: x0 => x0.done,
      fI: x0 => x0.responseURL,
      fJ: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      fK: (x0,x1) => x0.removeItem(x1),
      g: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      gB: Function.prototype.call.bind(DataView.prototype.getUint16),
      gC: a => a.length,
      gD: x0 => x0.hasFocus(),
      gE: x0 => x0.parent,
      gF: x0 => x0.viewConstraints,
      gG: (x0,x1) => { x0.className = x1 },
      gH: (o, m, a) => o[m].apply(o, a),
      gI: x0 => x0.statusText,
      gJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      gK: (x0,x1) => x0.querySelector(x1),
      h: (x0,x1) => ({addView: x0,removeView: x1}),
      hB: o => o instanceof Int16Array,
      hC: (x0,x1) => x0.test(x1),
      hD: x0 => x0.relatedTarget,
      hE: x0 => x0.timeStamp,
      hF: x0 => x0.hostElement,
      hG: (x0,x1) => { x0.tabIndex = x1 },
      hH: x0 => x0.iterator,
      hI: x0 => x0.getAllResponseHeaders(),
      hJ: (x0,x1,x2) => x0.addEventListener(x1,x2),
      hK: (o, a) => o + a,
      i: (l, r) => l === r,
      iB: Function.prototype.call.bind(DataView.prototype.getInt16),
      iC: x0 => x0.userAgent,
      iD: x0 => x0.shiftKey,
      iE: (x0,x1) => x0.hasAttribute(x1),
      iF: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      iG: (x0,x1) => { x0.name = x1 },
      iH: () => globalThis.Symbol,
      iI: x0 => x0.status,
      iJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      iK: x0 => x0.children,
      j: x0 => x0.random(),
      jB: o => o instanceof Uint8ClampedArray,
      jC: x0 => x0.navigator,
      jD: (decoder, codeUnits) => decoder.decode(codeUnits),
      jE: x0 => x0.buttons,
      jF: x0 => ({runApp: x0}),
      jG: (x0,x1) => { x0.placeholder = x1 },
      jH: (x0,x1) => new Intl.Segmenter(x0,x1),
      jI: x0 => x0.response,
      jJ: x0 => x0.send(),
      jK: (x0,x1) => { x0.id = x1 },
      k: o => o,
      kB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint8Array) return 1;
        return 2;
      },
      kC: Function.prototype.call.bind(String.prototype.toLowerCase),
      kD: () => new TextDecoder("utf-8", {fatal: true}),
      kE: x0 => x0.ctrlKey,
      kF: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      kG: (x0,x1) => { x0.autocomplete = x1 },
      kH: x0 => x0.Segmenter,
      kI: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      kJ: x0 => x0.status,
      kK: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      l: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'number') return 1;
        return 2;
      },
      lB: Function.prototype.call.bind(DataView.prototype.setInt32),
      lC: Object.is,
      lD: () => new TextDecoder("utf-8", {fatal: false}),
      lE: x0 => x0.y,
      lF: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      lG: (x0,x1) => { x0.name = x1 },
      lH: x0 => x0.buffer,
      lI: (x0,x1) => { x0.timeout = x1 },
      lJ: x0 => x0.response,
      lK: (x0,x1,x2) => x0.addEventListener(x1,x2),
      m: () => globalThis.Math,
      mB: Function.prototype.call.bind(DataView.prototype.setUint32),
      mC: x0 => x0.vendor,
      mD: (a, i, v) => a[i] = v,
      mE: x0 => x0.x,
      mF: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      mG: (x0,x1) => { x0.placeholder = x1 },
      mH: x0 => x0.wasmMemory,
      mI: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      mJ: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      mK: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      n: (x0,x1) => x0.prepend(x1),
      nB: Function.prototype.call.bind(DataView.prototype.setInt16),
      nC: (x0,x1) => x0.createTextNode(x1),
      nD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      nE: x0 => x0.scrollTop,
      nF: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      nG: (x0,x1) => { x0.action = x1 },
      nH: () => globalThis.window._flutter_skwasmInstance,
      nI: (x0,x1) => { x0.withCredentials = x1 },
      nJ: (x0,x1) => { x0.responseType = x1 },
      nK: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      o: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      oB: Function.prototype.call.bind(DataView.prototype.setUint16),
      oC: (x0,x1) => { x0.id = x1 },
      oD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      oE: x0 => x0.offsetTop,
      oF: x0 => x0.history,
      oG: (x0,x1) => { x0.method = x1 },
      oH: () => new TextDecoder(),
      oI: (x0,x1) => { x0.responseType = x1 },
      oJ: () => new XMLHttpRequest(),
      oK: (x0,x1) => x0.removeChild(x1),
      p: b => !!b,
      pB: Function.prototype.call.bind(DataView.prototype.setUint8),
      pC: (x0,x1) => { x0.nonce = x1 },
      pD: x0 => x0.visibilityState,
      pE: x0 => x0.scrollLeft,
      pF: x0 => x0.search,
      pG: (x0,x1) => { x0.noValidate = x1 },
      pH: x0 => x0.debugSkipFontRetryDelay,
      pI: x0 => x0.naturalHeight,
      pJ: x0 => ({type: x0}),
      pK: x0 => x0.firstChild,
      q: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      qB: Function.prototype.call.bind(DataView.prototype.setInt8),
      qC: x0 => x0.nonce,
      qD: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      qE: x0 => x0.offsetLeft,
      qF: x0 => x0.location,
      qG: (x0,x1) => x0.removeAttribute(x1),
      qH: (x0,x1,x2) => x0.set(x1,x2),
      qI: x0 => x0.naturalWidth,
      qJ: (x0,x1) => new Blob(x0,x1),
      qK: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      r: (x0,x1) => x0.focus(x1),
      rB: Function.prototype.call.bind(DataView.prototype.getInt8),
      rC: () => globalThis.window.flutterConfiguration,
      rD: x0 => x0.disconnect(),
      rE: x0 => x0.offsetParent,
      rF: x0 => x0.pathname,
      rG: x0 => x0.isConnected,
      rH: x0 => x0.fontFallbackBaseUrl,
      rI: (x0,x1) => x0.createElement(x1),
      rJ: x0 => globalThis.URL.createObjectURL(x0),
      rK: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      s: () => ({}),
      sB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      sC: (x0,x1) => x0.attachShadow(x1),
      sD: x0 => new Intl.Locale(x0),
      sE: (o, p, r) => o.replace(p, () => r),
      sF: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      sG: x0 => x0.click(),
      sH: (handle) => clearInterval(handle),
      sI: (x0,x1) => { x0.pointerEvents = x1 },
      sJ: (x0,x1) => x0.createElement(x1),
      sK: (x0,x1) => x0.item(x1),
      t: (o, p, v) => o[p] = v,
      tB: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      tC: (x0,x1) => x0.createElement(x1),
      tD: x0 => x0.region,
      tE: (o, p, r) => o.replaceAll(p, () => r),
      tF: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      tG: (x0,x1) => x0.getElementsByClassName(x1),
      tH: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      tI: (x0,x1) => { x0.height = x1 },
      tJ: (x0,x1) => x0.appendChild(x1),
      tK: () => new FileReader(),
      u: () => [],
      uB: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      uC: x0 => x0.scale,
      uD: x0 => x0.script,
      uE: x0 => x0.deltaMode,
      uF: o => Object.keys(o),
      uG: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      uH: () => Date.now(),
      uI: (x0,x1) => { x0.width = x1 },
      uJ: x0 => x0.click(),
      uK: (x0,x1) => x0.readAsArrayBuffer(x1),
      v: (a, i) => a.push(i),
      vB: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      vC: x0 => x0.visualViewport,
      vD: x0 => x0.language,
      vE: x0 => x0.deltaY,
      vF: x0 => x0.state,
      vG: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      vH: (x0,x1,x2) => x0.insertBefore(x1,x2),
      vI: x0 => x0.style,
      vJ: x0 => x0.remove(),
      vK: x0 => x0.size,
      w: x0 => new Int8Array(x0),
      wB: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      wC: x0 => x0.devicePixelRatio,
      wD: x0 => x0.languages,
      wE: x0 => x0.deltaX,
      wF: x0 => x0.hash,
      wG: (x0,x1) => x0.dispatchEvent(x1),
      wH: x0 => x0.id,
      wI: (x0,x1) => { x0.src = x1 },
      wJ: x0 => globalThis.URL.revokeObjectURL(x0),
      wK: x0 => x0.name,
      x: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      xB: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      xC: x0 => x0.height,
      xD: (x0,x1) => x0.observe(x1),
      xE: x0 => x0.wheelDeltaY,
      xF: x0 => x0.state,
      xG: (x0,x1) => x0.createEvent(x1),
      xH: x0 => x0.offsetHeight,
      xI: () => globalThis.document,
      xJ: x0 => x0.body,
      xK: x0 => x0.type,
      y: x0 => new Uint8Array(x0),
      yB: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      yC: x0 => x0.width,
      yD: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      yE: x0 => x0.wheelDeltaX,
      yF: (x0,x1) => x0.go(x1),
      yG: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      yH: x0 => x0.offsetWidth,
      yI: x0 => x0.src,
      yJ: (x0,x1) => { x0.display = x1 },
      yK: x0 => x0.result,
      z: x0 => new Uint8ClampedArray(x0),
      zB: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      zC: x0 => x0.screen,
      zD: x0 => new ResizeObserver(x0),
      zE: x0 => x0.key,
      zF: x0 => x0.parentElement,
      zG: x0 => x0.readText(),
      zH: x0 => x0.stopPropagation(),
      zI: (x0,x1) => x0.revokeObjectURL(x1),
      zJ: x0 => x0.style,
      zK: x0 => x0.length,

    };

    const baseImports = {
      _: dart2wasm,
      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      Reflect: Reflect,
      WebAssembly: {
        JSTag: WebAssembly.JSTag,
      },
      "": new Proxy({}, { get(_, prop) { return prop; } }),

    };

    const jsStringPolyfill = {
      "charCodeAt": (s, i) => s.charCodeAt(i),
      "compare": (s1, s2) => {
        if (s1 < s2) return -1;
        if (s1 > s2) return 1;
        return 0;
      },
      "concat": (s1, s2) => s1 + s2,
      "equals": (s1, s2) => s1 === s2,
      "fromCharCode": (i) => String.fromCharCode(i),
      "length": (s) => s.length,
      "substring": (s, a, b) => s.substring(a, b),
      "fromCharCodeArray": (a, start, end) => {
        if (end <= start) return '';

        const read = dartInstance.exports.$wasmI16ArrayGet;
        let result = '';
        let index = start;
        const chunkLength = Math.min(end - index, 500);
        let array = new Array(chunkLength);
        while (index < end) {
          const newChunkLength = Math.min(end - index, 500);
          for (let i = 0; i < newChunkLength; i++) {
            array[i] = read(a, index++);
          }
          if (newChunkLength < chunkLength) {
            array = array.slice(0, newChunkLength);
          }
          result += String.fromCharCode(...array);
        }
        return result;
      },
      "intoCharCodeArray": (s, a, start) => {
        if (s === '') return 0;

        const write = dartInstance.exports.$wasmI16ArraySet;
        for (var i = 0; i < s.length; ++i) {
          write(a, start++, s.charCodeAt(i));
        }
        return s.length;
      },
      "test": (s) => typeof s == "string",
    };


    

    dartInstance = await WebAssembly.instantiate(this.module, {
      ...baseImports,
      ...additionalImports,
      
      "wasm:js-string": jsStringPolyfill,
    });

    return new InstantiatedApp(this, dartInstance);
  }
}

class InstantiatedApp {
  constructor(compiledApp, instantiatedModule) {
    this.compiledApp = compiledApp;
    this.instantiatedModule = instantiatedModule;
  }

  // Call the main function with the given arguments.
  invokeMain(...args) {
    this.instantiatedModule.exports.$invokeMain(args);
  }
}
