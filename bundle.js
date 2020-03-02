
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var formula = createCommonjsModule(function (module, exports) {
    exports.__esModule = true;
    /**
     * Take a row formula string and return it formatted
     * @param {string} input - Input formula string
     * @param {string} lang - Language setting
     * @return {string} output a formatted formula string
     */
    function formatFormula(input, lang) {
        if (lang === void 0) { lang = "en"; }
        // ReplaceAt Function
        var replaceAt = function (string, index, replacement) {
            var left = string.substr(0, index);
            var right = string.substr(index + 1, string.length);
            return left + replacement + right;
        };
        // Check if input is undefined
        input = (input !== undefined) ? String(input) : "";
        // Check if empty
        if (input.length === 0) {
            return "Empty String";
        }
        // Check if formula starts with "="
        if (input[0] !== "=") {
            input = "=" + input;
        }
        // Formatting
        if (lang === "de") {
            input = input.replace(/\;\s/g, ";");
        }
        else {
            input = input.replace(/\,\s/g, ",");
        }
        input = input.replace(/\n/g, "");
        var formulaDeepness = 0;
        var isOperator = false;
        for (var i = 0; i < input.length; i++) {
            var chr = input[i];
            var delta = input.length;
            var lastChr = (i === 0) ? "" : input[i - 1];
            var nextChr = (input[i + 1] === undefined) ? "" : input[i + 1];
            if (chr === "(") {
                if (/[\w\=]/.test(lastChr) && nextChr !== ")") {
                    formulaDeepness += 1;
                    input = replaceAt(input, i, "(\n" + "\t".repeat(formulaDeepness));
                    delta = input.length - delta;
                    i = i + delta;
                }
                else {
                    isOperator = true;
                }
            }
            if (lang === "de") {
                if (chr === ";") {
                    input = replaceAt(input, i, ";\n" + "\t".repeat(formulaDeepness));
                    delta = input.length - delta;
                    i = i + delta;
                }
            }
            else {
                if (chr === ",") {
                    input = replaceAt(input, i, ",\n" + "\t".repeat(formulaDeepness));
                    delta = input.length - delta;
                    i = i + delta;
                }
            }
            if (chr === ")") {
                if (!isOperator) {
                    formulaDeepness -= 1;
                    input = replaceAt(input, i, "\n" + "\t".repeat(formulaDeepness) + ")");
                    delta = input.length - delta;
                    i = i + delta;
                }
                else {
                    isOperator = false;
                }
            }
        }
        input = input.replace(/\t/g, " ".repeat(4));
        input = input.trim();
        var result = input;
        return result;
    }
    exports["default"] = formatFormula;
    });

    var formatFormula = unwrapExports(formula);

    /* src\Components\Prettifier.svelte generated by Svelte v3.12.1 */

    const file = "src\\Components\\Prettifier.svelte";

    // (30:2) {:else}
    function create_else_block(ctx) {
    	var h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Excel Formula Prettifier";
    			add_location(h1, file, 30, 4, 735);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(30:2) {:else}", ctx });
    	return block;
    }

    // (28:2) {#if lang==="de"}
    function create_if_block(ctx) {
    	var h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Excel Formeln Formatierer";
    			add_location(h1, file, 28, 4, 684);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(28:2) {#if lang===\"de\"}", ctx });
    	return block;
    }

    function create_fragment(ctx) {
    	var div2, img, t0, div1, t1, textarea, t2, div0, button, t4, select, option0, option1, t7, pre, code, dispose;

    	function select_block_type(changed, ctx) {
    		if (ctx.lang==="de") return create_if_block;
    		return create_else_block;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			if_block.c();
    			t1 = space();
    			textarea = element("textarea");
    			t2 = space();
    			div0 = element("div");
    			button = element("button");
    			button.textContent = "Go";
    			t4 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "de";
    			option1 = element("option");
    			option1.textContent = "en";
    			t7 = space();
    			pre = element("pre");
    			code = element("code");
    			attr_dev(img, "src", "./Assets/analysis.svg");
    			attr_dev(img, "alt", "Excel Illustration");
    			attr_dev(img, "class", "svelte-ljqusv");
    			add_location(img, file, 25, 2, 572);
    			add_location(textarea, file, 32, 4, 783);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "id", "go");
    			attr_dev(button, "class", "svelte-ljqusv");
    			add_location(button, file, 34, 6, 854);
    			option0.__value = "de";
    			option0.value = option0.__value;
    			add_location(option0, file, 36, 8, 999);
    			option1.__value = "en";
    			option1.value = option1.__value;
    			add_location(option1, file, 37, 8, 1039);
    			if (ctx.lang === void 0) add_render_callback(() => ctx.select_change_handler.call(select));
    			attr_dev(select, "id", "lang");
    			attr_dev(select, "name", "languageSelector");
    			attr_dev(select, "class", "svelte-ljqusv");
    			add_location(select, file, 35, 6, 929);
    			attr_dev(div0, "class", "row svelte-ljqusv");
    			add_location(div0, file, 33, 4, 829);
    			attr_dev(code, "class", "excel svelte-ljqusv");
    			add_location(code, file, 40, 9, 1109);
    			add_location(pre, file, 40, 4, 1104);
    			attr_dev(div1, "class", "white-box svelte-ljqusv");
    			add_location(div1, file, 26, 2, 634);
    			attr_dev(div2, "class", "center svelte-ljqusv");
    			add_location(div2, file, 24, 0, 548);

    			dispose = [
    				listen_dev(textarea, "input", ctx.textarea_input_handler),
    				listen_dev(button, "click", ctx.handleButtonGo),
    				listen_dev(select, "change", ctx.select_change_handler)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, img);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			if_block.m(div1, null);
    			append_dev(div1, t1);
    			append_dev(div1, textarea);

    			set_input_value(textarea, ctx.input);

    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, button);
    			append_dev(div0, t4);
    			append_dev(div0, select);
    			append_dev(select, option0);
    			append_dev(select, option1);

    			select_option(select, ctx.lang);

    			append_dev(div1, t7);
    			append_dev(div1, pre);
    			append_dev(pre, code);
    			ctx.code_binding(code);
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type !== (current_block_type = select_block_type(changed, ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, t1);
    				}
    			}

    			if (changed.input) set_input_value(textarea, ctx.input);
    			if (changed.lang) select_option(select, ctx.lang);
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    			}

    			if_block.d();
    			ctx.code_binding(null);
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	
      
      let { lang = "de" } = $$props;
      
      let input = '=VLOOKUP(A1, A4:A8, (1+1)/14, False) + CONCAT(X, Y+"abc")';
      let text = formatFormula(input, lang);
      let block;

      if (lang === "de") {
        $$invalidate('input', input = "=SVERWEIS(A1; A4:A8; (1+1)/14; Falsch)");
      }

      let handleButtonGo = () => {
        text = formatFormula(input, lang);
        $$invalidate('block', block.innerHTML = text, block);
        hljs.highlightBlock(block);
      };

      onMount(() => handleButtonGo());

    	const writable_props = ['lang'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Prettifier> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		input = this.value;
    		$$invalidate('input', input);
    	}

    	function select_change_handler() {
    		lang = select_value(this);
    		$$invalidate('lang', lang);
    	}

    	function code_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('block', block = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ('lang' in $$props) $$invalidate('lang', lang = $$props.lang);
    	};

    	$$self.$capture_state = () => {
    		return { lang, input, text, block, handleButtonGo };
    	};

    	$$self.$inject_state = $$props => {
    		if ('lang' in $$props) $$invalidate('lang', lang = $$props.lang);
    		if ('input' in $$props) $$invalidate('input', input = $$props.input);
    		if ('text' in $$props) text = $$props.text;
    		if ('block' in $$props) $$invalidate('block', block = $$props.block);
    		if ('handleButtonGo' in $$props) $$invalidate('handleButtonGo', handleButtonGo = $$props.handleButtonGo);
    	};

    	return {
    		lang,
    		input,
    		block,
    		handleButtonGo,
    		textarea_input_handler,
    		select_change_handler,
    		code_binding
    	};
    }

    class Prettifier extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["lang"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Prettifier", options, id: create_fragment.name });
    	}

    	get lang() {
    		throw new Error("<Prettifier>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lang(value) {
    		throw new Error("<Prettifier>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.12.1 */

    function create_fragment$1(ctx) {
    	var current;

    	var prettifier = new Prettifier({
    		props: { lang: language },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			prettifier.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(prettifier, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(prettifier.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(prettifier.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(prettifier, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    // language settings
    var languages = [
      ...(window.navigator.languages || []),
      window.navigator.language,
      window.navigator.browserLanguage,
      window.navigator.userLanguage,
      window.navigator.systemLanguage
    ];

    var language = languages
    .filter(Boolean)
    .map(lang => lang.substr(0, 2))
    .find(lang => ["de"].includes(languages)) || "en";

    let html = document.getElementsByTagName("html")[0];
    html.setAttribute("lang", language);

    let elements = html.querySelectorAll(`[lang]`);
    Array.from(elements).forEach(e => {
    if (e.lang === language) {
      e.style.display = "block";
    } else {
      e.style.display = "none";
    }
    });

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$1.name });
    	}
    }

    const app = new App({
    	target: document.getElementById("app"),
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
