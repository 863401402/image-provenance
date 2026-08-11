var G = (r, e) => () => (e || r((e = { exports: {} }).exports, e), e.exports);
var be = G((de, C) => {
  class h {
    static __wrap(e) {
      const t = Object.create(h.prototype);
      return t.__wbg_ptr = e, k.register(t, t.__wbg_ptr, t), t;
    }
    __destroy_into_raw() {
      const e = this.__wbg_ptr;
      return this.__wbg_ptr = 0, k.unregister(this), e;
    }
    free() {
      const e = this.__destroy_into_raw();
      o.__wbg_wasmbuilder_free(e, 0);
    }
    /**
     * Add an action to the manifest's `Actions` assertion.
     * @param {any} action
     */
    addAction(e) {
      const t = o.wasmbuilder_addAction(this.__wbg_ptr, e);
      if (t[1])
        throw b(t[0]);
    }
    /**
     * Add an assertion to the manifest under `label` with the given `data`.
     * @param {string} label
     * @param {any} data
     */
    addAssertion(e, t) {
      const n = f(e, o.__wbindgen_malloc, o.__wbindgen_realloc), _ = a, c = o.wasmbuilder_addAssertion(this.__wbg_ptr, n, _, t);
      if (c[1])
        throw b(c[0]);
    }
    /**
     * Add an ingredient to the manifest from a JSON ingredient definition without a blob
     *
     * # Arguments
     * * `ingredient_json` - A JSON string representing the ingredient.
     * @param {string} json
     */
    addIngredient(e) {
      const t = f(e, o.__wbindgen_malloc, o.__wbindgen_realloc), n = a, _ = o.wasmbuilder_addIngredient(this.__wbg_ptr, t, n);
      if (_[1])
        throw b(_[0]);
    }
    /**
     * Add an ingredient to the manifest from a JSON ingredient definition and a [`Blob`].
     *
     * # Arguments
     * * `ingredient_json` - A JSON string representing the ingredient. This ingredient is merged with the ingredient specified in the `stream` argument, and these values take precedence.
     * * `format` - The format of the ingredient.
     * * `blob` - A [`Blob`] representing an asset which should be included as an ingredient.
     * @param {string} json
     * @param {string} format
     * @param {Blob} blob
     * @returns {Promise<void>}
     */
    addIngredientFromBlob(e, t, n) {
      const _ = f(e, o.__wbindgen_malloc, o.__wbindgen_realloc), c = a, i = f(t, o.__wbindgen_malloc, o.__wbindgen_realloc), s = a;
      return o.wasmbuilder_addIngredientFromBlob(this.__wbg_ptr, _, c, i, s, n);
    }
    /**
     * Add a redaction for a JUMBF URI with the given reason.
     *
     * Adds the URI to the builder's redaction list and appends a `c2pa.redacted` action
     * with the reason and URI parameter, as required by the C2PA spec.
     * @param {string} uri
     * @param {any} reason
     */
    addRedaction(e, t) {
      const n = f(e, o.__wbindgen_malloc, o.__wbindgen_realloc), _ = a, c = o.wasmbuilder_addRedaction(this.__wbg_ptr, n, _, t);
      if (c[1])
        throw b(c[0]);
    }
    /**
     * Add a [`Blob`] to the manifest as a resource. The ID must match an identifier in the manifest.
     * @param {string} id
     * @param {Blob} blob
     */
    addResourceFromBlob(e, t) {
      const n = f(e, o.__wbindgen_malloc, o.__wbindgen_realloc), _ = a, c = o.wasmbuilder_addResourceFromBlob(this.__wbg_ptr, n, _, t);
      if (c[1])
        throw b(c[0]);
    }
    /**
     * Retains actions and ingredients together in one step, per
     * `Builder::filter_actions_and_ingredients`. `action_indices`/`ingredient_indices` are
     * 0-based indices into [`Self::get_definition`]'s `c2pa.actions` assertion / `ingredients`
     * array, resolved on the JS side for the same reason as [`Self::filter_actions_at`].
     *
     * `rescue_ingredient` (driven by `ingredient_indices`) is evaluated for every ingredient
     * first; any action referencing an ingredient it would rescue is force-kept regardless of
     * `keep_action`.
     * @param {Uint32Array} action_indices
     * @param {Uint32Array} ingredient_indices
     */
    filterActionsAndIngredientsAt(e, t) {
      const n = E(e, o.__wbindgen_malloc), _ = a, c = E(t, o.__wbindgen_malloc), i = a, s = o.wasmbuilder_filterActionsAndIngredientsAt(this.__wbg_ptr, n, _, c, i);
      if (s[1])
        throw b(s[0]);
    }
    /**
     * Retains only the actions at the given 0-based indices into the actions currently returned
     * by [`Self::get_definition`]'s `c2pa.actions` assertion.
     *
     * The inception action, `c2pa.created` or `c2pa.opened`, is always kept regardless of
     * `indices`, and is moved to index 0 if needed, so the manifest stays valid per the C2PA
     * spec. Sets `allActionsIncluded = false` when anything is removed.
     *
     * Indices are resolved on the JS side, rather than accepting a predicate here, because the
     * builder lives in a worker and JS callbacks can't be invoked synchronously across that
     * boundary.
     *
     * This does not touch ingredients. Call [`Self::filter_ingredients_at`] with an empty list
     * to drop all orphans afterwards if you also want to drop ingredients now orphaned by the
     * removed actions.
     * @param {Uint32Array} indices
     */
    filterActionsAt(e) {
      const t = E(e, o.__wbindgen_malloc), n = a, _ = o.wasmbuilder_filterActionsAt(this.__wbg_ptr, t, n);
      if (_[1])
        throw b(_[0]);
    }
    /**
     * Retains ingredients, rescuing an otherwise-orphaned ingredient when its 0-based index into
     * [`Self::get_definition`]'s `ingredients` array is present in `indices`. Referenced and
     * `parentOf` ingredients are always kept, per `Builder::filter_ingredients`; `indices` can
     * only rescue an orphan, never drop a referenced or lineage ingredient.
     *
     * See [`Self::filter_actions_at`] for why this takes indices rather than a predicate.
     * @param {Uint32Array} indices
     */
    filterIngredientsAt(e) {
      const t = E(e, o.__wbindgen_malloc), n = a, _ = o.wasmbuilder_filterIngredientsAt(this.__wbg_ptr, t, n);
      if (_[1])
        throw b(_[0]);
    }
    /**
     * Attempts to create a new `WasmBuilder` from a builder archive.
     * Optionally accepts a context JSON string to configure the builder.
     * @param {Blob} archive
     * @param {string | null} [context_json]
     * @returns {WasmBuilder}
     */
    static fromArchive(e, t) {
      var n = w(t) ? 0 : f(t, o.__wbindgen_malloc, o.__wbindgen_realloc), _ = a;
      const c = o.wasmbuilder_fromArchive(e, n, _);
      if (c[2])
        throw b(c[1]);
      return h.__wrap(c[0]);
    }
    /**
     * Attempts to create a new `WasmBuilder` from a JSON ManifestDefinition string.
     * Optionally accepts a context JSON string to configure the builder.
     * @param {string} json
     * @param {string | null} [context_json]
     * @returns {WasmBuilder}
     */
    static fromJson(e, t) {
      const n = f(e, o.__wbindgen_malloc, o.__wbindgen_realloc), _ = a;
      var c = w(t) ? 0 : f(t, o.__wbindgen_malloc, o.__wbindgen_realloc), i = a;
      const s = o.wasmbuilder_fromJson(n, _, c, i);
      if (s[2])
        throw b(s[1]);
      return h.__wrap(s[0]);
    }
    /**
     * Get the current manifest definition.
     * @returns {string}
     */
    getDefinition() {
      const e = o.wasmbuilder_getDefinition(this.__wbg_ptr);
      if (e[2])
        throw b(e[1]);
      return b(e[0]);
    }
    /**
     * Creates a new `WasmBuilder` with a minimal manifest definition.
     * Optionally accepts a context JSON string to configure the builder.
     * @param {string | null} [context_json]
     * @returns {WasmBuilder}
     */
    static new(e) {
      var t = w(e) ? 0 : f(e, o.__wbindgen_malloc, o.__wbindgen_realloc), n = a;
      const _ = o.wasmbuilder_new(t, n);
      if (_[2])
        throw b(_[1]);
      return h.__wrap(_[0]);
    }
    /**
     * Sets the builder "intent."
     * @param {any} json_intent
     */
    setIntent(e) {
      const t = o.wasmbuilder_setIntent(this.__wbg_ptr, e);
      if (t[1])
        throw b(t[0]);
    }
    /**
     * Sets the state of the no_embed flag.
     * @param {boolean} no_embed
     */
    setNoEmbed(e) {
      o.wasmbuilder_setNoEmbed(this.__wbg_ptr, e);
    }
    /**
     * Sets the remote_url for a remote manifest.
     *
     * The URL must return the manifest data and is injected into the destination asset when signing.
     * For remote-only manifests, set the `no_embed` flag to `true`.
     * @param {string} url
     */
    setRemoteUrl(e) {
      const t = f(e, o.__wbindgen_malloc, o.__wbindgen_realloc), n = a;
      o.wasmbuilder_setRemoteUrl(this.__wbg_ptr, t, n);
    }
    /**
     * Sets a thumbnail from a [`Blob`] to be included in the manifest. The thumbnail should represent the asset being signed.
     * @param {string} format
     * @param {Blob} blob
     */
    setThumbnailFromBlob(e, t) {
      const n = f(e, o.__wbindgen_malloc, o.__wbindgen_realloc), _ = a, c = o.wasmbuilder_setThumbnailFromBlob(this.__wbg_ptr, n, _, t);
      if (c[1])
        throw b(c[0]);
    }
    /**
     * Sign an asset using the provided SignerDefinition, format, and source Blob.
     * @param {SignerDefinition} signer_definition
     * @param {string} format
     * @param {Blob} source
     * @returns {Promise<Uint8Array>}
     */
    sign(e, t, n) {
      const _ = f(t, o.__wbindgen_malloc, o.__wbindgen_realloc), c = a;
      return o.wasmbuilder_sign(this.__wbg_ptr, e, _, c, n);
    }
    /**
     * Sign an asset using the provided SignerDefinition, format, and source Blob.
     * Use this method to get both the manifest bytes and the bytes of the signed asset.
     * @param {SignerDefinition} signer_definition
     * @param {string} format
     * @param {Blob} source
     * @returns {Promise<any>}
     */
    signAndGetManifestBytes(e, t, n) {
      const _ = f(t, o.__wbindgen_malloc, o.__wbindgen_realloc), c = a;
      return o.wasmbuilder_signAndGetManifestBytes(this.__wbg_ptr, e, _, c, n);
    }
    /**
     * "Save" a builder to an archive.
     * @returns {Uint8Array}
     */
    toArchive() {
      const e = o.wasmbuilder_toArchive(this.__wbg_ptr);
      if (e[2])
        throw b(e[1]);
      return b(e[0]);
    }
    /**
     * Replaces the actions in the `c2pa.actions`/`c2pa.actions.v2` assertions with
     * `action_groups`, computed on the JS side (see [`Self::filter_actions_at`]).
     * `softwareAgents`/`allActionsIncluded`/`templates`/`metadata` are preserved as-is.
     *
     * A manifest can carry more than one actions assertion (the created-list and gathered-list
     * entries are distinct assertions), so `action_groups` is a list-of-lists: one entry per
     * actions assertion, in the same positional order this binding enumerates them.
     *
     * Each assertion is rewritten in place, which keeps its label, `created` flag, `kind`, and
     * position in the assertion list — mirroring `Builder::filter_actions` in c2pa-rs. A group
     * that is empty drops its assertion rather than writing an invalid empty actions array.
     * No-op if there is no actions assertion. Use `add_action` for those.
     *
     * All fallible work runs before any mutation, so a failure never leaves a partially-rewritten
     * builder. An existing but malformed actions assertion is surfaced as an error rather than
     * silently replaced.
     *
     * The groups are written back verbatim: they are not validated or reordered, and unlike
     * [`Self::filter_actions_at`] the inception action is not force-kept. A caller that drops
     * `c2pa.created`/`c2pa.opened` or moves it out of first position can produce an actions
     * array that fails validation at signing time.
     * @param {any} action_groups
     */
    updateActionsAt(e) {
      const t = o.wasmbuilder_updateActionsAt(this.__wbg_ptr, e);
      if (t[1])
        throw b(t[0]);
    }
  }
  Symbol.dispose && (h.prototype[Symbol.dispose] = h.prototype.free);
  class I {
    static __wrap(e) {
      const t = Object.create(I.prototype);
      return t.__wbg_ptr = e, N.register(t, t.__wbg_ptr, t), t;
    }
    __destroy_into_raw() {
      const e = this.__wbg_ptr;
      return this.__wbg_ptr = 0, N.unregister(this), e;
    }
    free() {
      const e = this.__destroy_into_raw();
      o.__wbg_wasmreader_free(e, 0);
    }
    /**
     * Returns the label of the asset's active manifest.
     * @returns {string | undefined}
     */
    activeLabel() {
      const e = o.wasmreader_activeLabel(this.__wbg_ptr);
      let t;
      return e[0] !== 0 && (t = y(e[0], e[1]).slice(), o.__wbindgen_free(e[0], e[1] * 1, 1)), t;
    }
    /**
     * Returns the asset's active manifest.
     * @returns {any}
     */
    activeManifest() {
      const e = o.wasmreader_activeManifest(this.__wbg_ptr);
      if (e[2])
        throw b(e[1]);
      return b(e[0]);
    }
    /**
     * Returns the asset's manifest store as crJSON.
     * @returns {string}
     */
    crJson() {
      let e, t;
      try {
        const n = o.wasmreader_crJson(this.__wbg_ptr);
        return e = n[0], t = n[1], y(n[0], n[1]);
      } finally {
        o.__wbindgen_free(e, t, 1);
      }
    }
    /**
     * Attempts to create a new `WasmReader` from an asset format and `Blob` of the asset's bytes.
     * Optionally accepts a context JSON string to configure the reader.
     * @param {string} format
     * @param {Blob} blob
     * @param {string | null} [context_json]
     * @returns {Promise<WasmReader>}
     */
    static fromBlob(e, t, n) {
      const _ = f(e, o.__wbindgen_malloc, o.__wbindgen_realloc), c = a;
      var i = w(n) ? 0 : f(n, o.__wbindgen_malloc, o.__wbindgen_realloc), s = a;
      return o.wasmreader_fromBlob(_, c, t, i, s);
    }
    /**
     * Attempts to create a new `WasmReader` from an asset format, a `Blob` of the bytes of the initial segment, and a fragment `Blob`.
     * Optionally accepts a context JSON string to configure the reader.
     * @param {string} format
     * @param {Blob} init
     * @param {Blob} fragment
     * @param {string | null} [context_json]
     * @returns {Promise<WasmReader>}
     */
    static fromBlobFragment(e, t, n, _) {
      const c = f(e, o.__wbindgen_malloc, o.__wbindgen_realloc), i = a;
      var s = w(_) ? 0 : f(_, o.__wbindgen_malloc, o.__wbindgen_realloc), u = a;
      return o.wasmreader_fromBlobFragment(c, i, t, n, s, u);
    }
    /**
     * Returns a JSON representation of the asset's manifest store.
     * @returns {string}
     */
    json() {
      let e, t;
      try {
        const n = o.wasmreader_json(this.__wbg_ptr);
        return e = n[0], t = n[1], y(n[0], n[1]);
      } finally {
        o.__wbindgen_free(e, t, 1);
      }
    }
    /**
     * Returns the asset's manifest store.
     * @returns {any}
     */
    manifestStore() {
      const e = o.wasmreader_manifestStore(this.__wbg_ptr);
      if (e[2])
        throw b(e[1]);
      return b(e[0]);
    }
    /**
     * Accepts a URI reference to a binary object in the resource store and returns a `js_sys::Uint8Array` containing the resource's bytes.
     * @param {string} uri
     * @returns {Uint8Array}
     */
    resourceToBytes(e) {
      const t = f(e, o.__wbindgen_malloc, o.__wbindgen_realloc), n = a, _ = o.wasmreader_resourceToBytes(this.__wbg_ptr, t, n);
      if (_[2])
        throw b(_[1]);
      return b(_[0]);
    }
  }
  Symbol.dispose && (I.prototype[Symbol.dispose] = I.prototype.free);
  function $(r) {
    const e = f(r, o.__wbindgen_malloc, o.__wbindgen_realloc), t = a, n = o.loadSettings(e, t);
    if (n[1])
      throw b(n[0]);
  }
  function H() {
    return {
      __proto__: null,
      "./c2pa_bg.js": {
        __proto__: null,
        __wbg_Error_ef53bc310eb298a0: function(e, t) {
          return Error(y(e, t));
        },
        __wbg_Number_6b506e6536831eaa: function(e) {
          return Number(e);
        },
        __wbg___wbindgen_bigint_get_as_i64_38130e98eecd467d: function(e, t) {
          const n = t, _ = typeof n == "bigint" ? n : void 0;
          m().setBigInt64(e + 8, w(_) ? BigInt(0) : _, !0), m().setInt32(e + 0, !w(_), !0);
        },
        __wbg___wbindgen_boolean_get_1a45e2c38d4d41b9: function(e) {
          const t = e, n = typeof t == "boolean" ? t : void 0;
          return w(n) ? 16777215 : n ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_0accd80f45e5faa2: function(e, t) {
          const n = x(t), _ = f(n, o.__wbindgen_malloc, o.__wbindgen_realloc), c = a;
          m().setInt32(e + 4, c, !0), m().setInt32(e + 0, _, !0);
        },
        __wbg___wbindgen_in_70a403a56e771704: function(e, t) {
          return e in t;
        },
        __wbg___wbindgen_is_bigint_6ffd6468a9bc44b9: function(e) {
          return typeof e == "bigint";
        },
        __wbg___wbindgen_is_function_754e9f305ff6029e: function(e) {
          return typeof e == "function";
        },
        __wbg___wbindgen_is_object_56732c2bc353f41d: function(e) {
          const t = e;
          return typeof t == "object" && t !== null;
        },
        __wbg___wbindgen_is_string_c236cabd84a4d769: function(e) {
          return typeof e == "string";
        },
        __wbg___wbindgen_is_undefined_67b456be8673d3d7: function(e) {
          return e === void 0;
        },
        __wbg___wbindgen_jsval_eq_1068e624fa87f6ab: function(e, t) {
          return e === t;
        },
        __wbg___wbindgen_jsval_loose_eq_2c56564c75129511: function(e, t) {
          return e == t;
        },
        __wbg___wbindgen_number_get_9bb1761122181af2: function(e, t) {
          const n = t, _ = typeof n == "number" ? n : void 0;
          m().setFloat64(e + 8, w(_) ? 0 : _, !0), m().setInt32(e + 0, !w(_), !0);
        },
        __wbg___wbindgen_string_get_72bdf95d3ae505b1: function(e, t) {
          const n = t, _ = typeof n == "string" ? n : void 0;
          var c = w(_) ? 0 : f(_, o.__wbindgen_malloc, o.__wbindgen_realloc), i = a;
          m().setInt32(e + 4, i, !0), m().setInt32(e + 0, c, !0);
        },
        __wbg___wbindgen_throw_1506f2235d1bdba0: function(e, t) {
          throw new Error(y(e, t));
        },
        __wbg__wbg_cb_unref_61db23ac97f16c31: function(e) {
          e._wbg_cb_unref();
        },
        __wbg_abort_2ec46222bf378517: function(e) {
          e.abort();
        },
        __wbg_abort_b29d719932441c95: function(e, t) {
          e.abort(t);
        },
        __wbg_append_e1746995edcb0170: function() {
          return l(function(e, t, n, _, c) {
            e.append(y(t, n), y(_, c));
          }, arguments);
        },
        __wbg_arrayBuffer_05927079aabe6d46: function() {
          return l(function(e) {
            return e.arrayBuffer();
          }, arguments);
        },
        __wbg_byteLength_2c6dc3b4b85d3547: function(e) {
          return e.byteLength;
        },
        __wbg_call_8a89609d89f6608a: function() {
          return l(function(e, t) {
            return e.call(t);
          }, arguments);
        },
        __wbg_call_9c758de292015997: function() {
          return l(function(e, t, n) {
            return e.call(t, n);
          }, arguments);
        },
        __wbg_clearTimeout_6b8d9a38b9263d65: function(e) {
          return clearTimeout(e);
        },
        __wbg_crypto_38df2bab126b63dc: function(e) {
          return e.crypto;
        },
        __wbg_done_60cf307fcc680536: function(e) {
          return e.done;
        },
        __wbg_entries_04b37a02507f1713: function(e) {
          return Object.entries(e);
        },
        __wbg_error_a6fa202b58aa1cd3: function(e, t) {
          let n, _;
          try {
            n = e, _ = t, console.error(y(e, t));
          } finally {
            o.__wbindgen_free(n, _, 1);
          }
        },
        __wbg_fetch_344c8d3849002659: function(e, t) {
          return e.fetch(t);
        },
        __wbg_fetch_9dad4fe911207b37: function(e) {
          return fetch(e);
        },
        __wbg_from_d300fe49deab18f5: function(e) {
          return Array.from(e);
        },
        __wbg_getRandomValues_3f44b700395062e5: function() {
          return l(function(e, t) {
            globalThis.crypto.getRandomValues(A(e, t));
          }, arguments);
        },
        __wbg_getRandomValues_76dfc69825c9c552: function() {
          return l(function(e, t) {
            globalThis.crypto.getRandomValues(A(e, t));
          }, arguments);
        },
        __wbg_getRandomValues_8aa3112c6615eef6: function() {
          return l(function(e, t) {
            globalThis.crypto.getRandomValues(A(e, t));
          }, arguments);
        },
        __wbg_getRandomValues_c44a50d8cfdaebeb: function() {
          return l(function(e, t) {
            e.getRandomValues(t);
          }, arguments);
        },
        __wbg_getTime_00b3f7db575e4ef5: function(e) {
          return e.getTime();
        },
        __wbg_get_1f8f054ddbaa7db2: function() {
          return l(function(e, t) {
            return Reflect.get(e, t);
          }, arguments);
        },
        __wbg_get_2b48c7d0d006a781: function(e, t) {
          return e[t >>> 0];
        },
        __wbg_get_de6a0f7d4d18a304: function() {
          return l(function(e, t) {
            return Reflect.get(e, t);
          }, arguments);
        },
        __wbg_get_unchecked_33f6e5c9e2f2d6b2: function(e, t) {
          return e[t >>> 0];
        },
        __wbg_get_with_ref_key_6412cf3094599694: function(e, t) {
          return e[t];
        },
        __wbg_has_73740b27f436fed3: function() {
          return l(function(e, t) {
            return Reflect.has(e, t);
          }, arguments);
        },
        __wbg_headers_0feb63d2d374b44a: function(e) {
          return e.headers;
        },
        __wbg_instanceof_ArrayBuffer_8f49811467741499: function(e) {
          let t;
          try {
            t = e instanceof ArrayBuffer;
          } catch {
            t = !1;
          }
          return t;
        },
        __wbg_instanceof_Map_9fc06d9a951bcee6: function(e) {
          let t;
          try {
            t = e instanceof Map;
          } catch {
            t = !1;
          }
          return t;
        },
        __wbg_instanceof_Promise_d0db99486956c8e8: function(e) {
          let t;
          try {
            t = e instanceof Promise;
          } catch {
            t = !1;
          }
          return t;
        },
        __wbg_instanceof_Response_cb984bd66d7bd408: function(e) {
          let t;
          try {
            t = e instanceof Response;
          } catch {
            t = !1;
          }
          return t;
        },
        __wbg_instanceof_Uint8Array_86f30649f63ef9c2: function(e) {
          let t;
          try {
            t = e instanceof Uint8Array;
          } catch {
            t = !1;
          }
          return t;
        },
        __wbg_isArray_67c2c9c4313f4448: function(e) {
          return Array.isArray(e);
        },
        __wbg_isSafeInteger_66acec27e09e99a7: function(e) {
          return Number.isSafeInteger(e);
        },
        __wbg_iterator_8732428d309e270e: function() {
          return Symbol.iterator;
        },
        __wbg_length_4a591ecaa01354d9: function(e) {
          return e.length;
        },
        __wbg_length_66f1a4b2e9026940: function(e) {
          return e.length;
        },
        __wbg_msCrypto_bd5a034af96bcba6: function(e) {
          return e.msCrypto;
        },
        __wbg_new_0_445c13a750296eb6: function() {
          return /* @__PURE__ */ new Date();
        },
        __wbg_new_0d09705104e164af: function() {
          return l(function() {
            return new AbortController();
          }, arguments);
        },
        __wbg_new_227d7c05414eb861: function() {
          return new Error();
        },
        __wbg_new_578aeef4b6b94378: function(e) {
          return new Uint8Array(e);
        },
        __wbg_new_622fc80556be2e26: function() {
          return /* @__PURE__ */ new Map();
        },
        __wbg_new_a1b9f645bba64f0f: function() {
          return l(function() {
            return new FileReaderSync();
          }, arguments);
        },
        __wbg_new_ce1ab61c1c2b300d: function() {
          return new Object();
        },
        __wbg_new_d90091b82fdf5b91: function() {
          return new Array();
        },
        __wbg_new_e436d06bc8e77460: function() {
          return l(function() {
            return new Headers();
          }, arguments);
        },
        __wbg_new_from_slice_18fa1f71286d66b8: function(e, t) {
          return new Uint8Array(A(e, t));
        },
        __wbg_new_typed_bf31d18f92484486: function(e, t) {
          try {
            var n = { a: e, b: t }, _ = (i, s) => {
              const u = n.a;
              n.a = 0;
              try {
                return K(u, n.b, i, s);
              } finally {
                n.a = u;
              }
            };
            return new Promise(_);
          } finally {
            n.a = 0;
          }
        },
        __wbg_new_with_length_36a4998e27b014c5: function(e) {
          return new Uint8Array(e >>> 0);
        },
        __wbg_new_with_str_and_init_bcd02b79a793d27f: function() {
          return l(function(e, t, n) {
            return new Request(y(e, t), n);
          }, arguments);
        },
        __wbg_next_9e03acdf51c4960d: function(e) {
          return e.next;
        },
        __wbg_next_eb8ca7351fa27906: function() {
          return l(function(e) {
            return e.next();
          }, arguments);
        },
        __wbg_node_84ea875411254db1: function(e) {
          return e.node;
        },
        __wbg_now_190933fa139cc119: function() {
          return Date.now();
        },
        __wbg_process_44c7a14e11e9f69e: function(e) {
          return e.process;
        },
        __wbg_prototypesetcall_3249fc62a0fafa30: function(e, t, n) {
          Uint8Array.prototype.set.call(A(e, t), n);
        },
        __wbg_queueMicrotask_35c611f4a14830b2: function(e) {
          queueMicrotask(e);
        },
        __wbg_queueMicrotask_404ed0a58e0b63cc: function(e) {
          return e.queueMicrotask;
        },
        __wbg_randomFillSync_6c25eac9869eb53c: function() {
          return l(function(e, t) {
            e.randomFillSync(t);
          }, arguments);
        },
        __wbg_readAsArrayBuffer_f1b8da05559618d9: function() {
          return l(function(e, t) {
            return e.readAsArrayBuffer(t);
          }, arguments);
        },
        __wbg_require_b4edbdcf3e2a1ef0: function() {
          return l(function() {
            return C.require;
          }, arguments);
        },
        __wbg_resolve_25a7e548d5881dca: function(e) {
          return Promise.resolve(e);
        },
        __wbg_setTimeout_f757f00851f76c42: function(e, t) {
          return setTimeout(e, t);
        },
        __wbg_set_29c99a8aac1c01e5: function(e, t, n) {
          e.set(A(t, n));
        },
        __wbg_set_52b1e1eb5bed906a: function(e, t, n) {
          return e.set(t, n);
        },
        __wbg_set_6be42768c690e380: function(e, t, n) {
          e[t] = n;
        },
        __wbg_set_body_36614c7e61546809: function(e, t) {
          e.body = t;
        },
        __wbg_set_cache_488ea16c11cbf20d: function(e, t) {
          e.cache = Q[t];
        },
        __wbg_set_credentials_fa9c491a27c4bdf0: function(e, t) {
          e.credentials = Z[t];
        },
        __wbg_set_dca99999bba88a9a: function(e, t, n) {
          e[t >>> 0] = n;
        },
        __wbg_set_headers_7c1e39ece7826bec: function(e, t) {
          e.headers = t;
        },
        __wbg_set_method_7a6811dec7a4feff: function(e, t, n) {
          e.method = y(t, n);
        },
        __wbg_set_mode_c90e3667002857d4: function(e, t) {
          e.mode = ee[t];
        },
        __wbg_set_signal_d9da62b3f215c821: function(e, t) {
          e.signal = t;
        },
        __wbg_signal_e03304a84df9ed09: function(e) {
          return e.signal;
        },
        __wbg_size_9970092b88b1094c: function(e) {
          return e.size;
        },
        __wbg_slice_02bb778501725738: function() {
          return l(function(e, t, n) {
            return e.slice(t, n);
          }, arguments);
        },
        __wbg_stack_3b0d974bbf31e44f: function(e, t) {
          const n = t.stack, _ = f(n, o.__wbindgen_malloc, o.__wbindgen_realloc), c = a;
          m().setInt32(e + 4, c, !0), m().setInt32(e + 0, _, !0);
        },
        __wbg_static_accessor_GLOBAL_9d53f2689e622ca1: function() {
          const e = typeof global > "u" ? null : global;
          return w(e) ? 0 : R(e);
        },
        __wbg_static_accessor_GLOBAL_THIS_a1a35cec07001a8a: function() {
          const e = typeof globalThis > "u" ? null : globalThis;
          return w(e) ? 0 : R(e);
        },
        __wbg_static_accessor_SELF_4c59f6c7ea29a144: function() {
          const e = typeof self > "u" ? null : self;
          return w(e) ? 0 : R(e);
        },
        __wbg_static_accessor_WINDOW_e70ae9f2eb052253: function() {
          const e = typeof window > "u" ? null : window;
          return w(e) ? 0 : R(e);
        },
        __wbg_status_00549d55b78d949e: function(e) {
          return e.status;
        },
        __wbg_stringify_8286df6dcc591521: function() {
          return l(function(e) {
            return JSON.stringify(e);
          }, arguments);
        },
        __wbg_subarray_4aa221f6a4f5ab22: function(e, t, n) {
          return e.subarray(t >>> 0, n >>> 0);
        },
        __wbg_then_18f476d590e58992: function(e, t, n) {
          return e.then(t, n);
        },
        __wbg_then_ac7b025999b52837: function(e, t) {
          return e.then(t);
        },
        __wbg_url_6808f1c468f2d0cd: function(e, t) {
          const n = t.url, _ = f(n, o.__wbindgen_malloc, o.__wbindgen_realloc), c = a;
          m().setInt32(e + 4, c, !0), m().setInt32(e + 0, _, !0);
        },
        __wbg_valueOf_41ae57308c1f031c: function(e) {
          return e.valueOf();
        },
        __wbg_value_f3625092ee4b37f4: function(e) {
          return e.value;
        },
        __wbg_versions_276b2795b1c6a219: function(e) {
          return e.versions;
        },
        __wbg_wasmreader_new: function(e) {
          return I.__wrap(e);
        },
        __wbindgen_cast_0000000000000001: function(e, t) {
          return J(e, t, Y);
        },
        __wbindgen_cast_0000000000000002: function(e, t) {
          return J(e, t, X);
        },
        __wbindgen_cast_0000000000000003: function(e) {
          return e;
        },
        __wbindgen_cast_0000000000000004: function(e) {
          return e;
        },
        __wbindgen_cast_0000000000000005: function(e, t) {
          return A(e, t);
        },
        __wbindgen_cast_0000000000000006: function(e, t) {
          return y(e, t);
        },
        __wbindgen_cast_0000000000000007: function(e) {
          return BigInt.asUintN(64, e);
        },
        __wbindgen_cast_0000000000000008: function(e, t) {
          var n = A(e, t).slice();
          return o.__wbindgen_free(e, t * 1, 1), n;
        },
        __wbindgen_init_externref_table: function() {
          const e = o.__wbindgen_externrefs, t = e.grow(4);
          e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, !0), e.set(t + 3, !1);
        }
      }
    };
  }
  function X(r, e) {
    o.wasm_bindgen_304c265eb9e6f0af___convert__closures_____invoke_______true_(r, e);
  }
  function Y(r, e, t) {
    const n = o.wasm_bindgen_304c265eb9e6f0af___convert__closures_____invoke___wasm_bindgen_304c265eb9e6f0af___JsValue__core_9b3796e30d99ddb7___result__Result_____wasm_bindgen_304c265eb9e6f0af___JsError___true_(r, e, t);
    if (n[1])
      throw b(n[0]);
  }
  function K(r, e, t, n) {
    o.wasm_bindgen_304c265eb9e6f0af___convert__closures_____invoke___js_sys_74e7014fb12660c3___Function_fn_wasm_bindgen_304c265eb9e6f0af___JsValue_____wasm_bindgen_304c265eb9e6f0af___sys__Undefined___js_sys_74e7014fb12660c3___Function_fn_wasm_bindgen_304c265eb9e6f0af___JsValue_____wasm_bindgen_304c265eb9e6f0af___sys__Undefined_______true_(r, e, t, n);
  }
  const Q = ["default", "no-store", "reload", "no-cache", "force-cache", "only-if-cached"], Z = ["omit", "same-origin", "include"], ee = ["same-origin", "no-cors", "cors", "navigate"], k = typeof FinalizationRegistry > "u" ? { register: () => {
  }, unregister: () => {
  } } : new FinalizationRegistry((r) => o.__wbg_wasmbuilder_free(r, 1)), N = typeof FinalizationRegistry > "u" ? { register: () => {
  }, unregister: () => {
  } } : new FinalizationRegistry((r) => o.__wbg_wasmreader_free(r, 1));
  typeof FinalizationRegistry > "u" || new FinalizationRegistry((r) => o.__wbg_wasmsigner_free(r, 1));
  function R(r) {
    const e = o.__externref_table_alloc();
    return o.__wbindgen_externrefs.set(e, r), e;
  }
  const z = typeof FinalizationRegistry > "u" ? { register: () => {
  }, unregister: () => {
  } } : new FinalizationRegistry((r) => o.__wbindgen_destroy_closure(r.a, r.b));
  function x(r) {
    const e = typeof r;
    if (e == "number" || e == "boolean" || r == null)
      return `${r}`;
    if (e == "string")
      return `"${r}"`;
    if (e == "symbol") {
      const _ = r.description;
      return _ == null ? "Symbol" : `Symbol(${_})`;
    }
    if (e == "function") {
      const _ = r.name;
      return typeof _ == "string" && _.length > 0 ? `Function(${_})` : "Function";
    }
    if (Array.isArray(r)) {
      const _ = r.length;
      let c = "[";
      _ > 0 && (c += x(r[0]));
      for (let i = 1; i < _; i++)
        c += ", " + x(r[i]);
      return c += "]", c;
    }
    const t = /\[object ([^\]]+)\]/.exec(toString.call(r));
    let n;
    if (t && t.length > 1)
      n = t[1];
    else
      return toString.call(r);
    if (n == "Object")
      try {
        return "Object(" + JSON.stringify(r) + ")";
      } catch {
        return "Object";
      }
    return r instanceof Error ? `${r.name}: ${r.message}
${r.stack}` : n;
  }
  function A(r, e) {
    return r = r >>> 0, T().subarray(r / 1, r / 1 + e);
  }
  let v = null;
  function m() {
    return (v === null || v.buffer.detached === !0 || v.buffer.detached === void 0 && v.buffer !== o.memory.buffer) && (v = new DataView(o.memory.buffer)), v;
  }
  function y(r, e) {
    return re(r >>> 0, e);
  }
  let S = null;
  function te() {
    return (S === null || S.byteLength === 0) && (S = new Uint32Array(o.memory.buffer)), S;
  }
  let B = null;
  function T() {
    return (B === null || B.byteLength === 0) && (B = new Uint8Array(o.memory.buffer)), B;
  }
  function l(r, e) {
    try {
      return r.apply(this, e);
    } catch (t) {
      const n = R(t);
      o.__wbindgen_exn_store(n);
    }
  }
  function w(r) {
    return r == null;
  }
  function J(r, e, t) {
    const n = { a: r, b: e, cnt: 1 }, _ = (...c) => {
      n.cnt++;
      const i = n.a;
      n.a = 0;
      try {
        return t(i, n.b, ...c);
      } finally {
        n.a = i, _._wbg_cb_unref();
      }
    };
    return _._wbg_cb_unref = () => {
      --n.cnt === 0 && (o.__wbindgen_destroy_closure(n.a, n.b), n.a = 0, z.unregister(n));
    }, z.register(_, n, n), _;
  }
  function E(r, e) {
    const t = e(r.length * 4, 4) >>> 0;
    return te().set(r, t / 4), a = r.length, t;
  }
  function f(r, e, t) {
    if (t === void 0) {
      const s = j.encode(r), u = e(s.length, 1) >>> 0;
      return T().subarray(u, u + s.length).set(s), a = s.length, u;
    }
    let n = r.length, _ = e(n, 1) >>> 0;
    const c = T();
    let i = 0;
    for (; i < n; i++) {
      const s = r.charCodeAt(i);
      if (s > 127) break;
      c[_ + i] = s;
    }
    if (i !== n) {
      i !== 0 && (r = r.slice(i)), _ = t(_, n, n = i + r.length * 3, 1) >>> 0;
      const s = T().subarray(_ + i, _ + n), u = j.encodeInto(r, s);
      i += u.written, _ = t(_, n, i, 1) >>> 0;
    }
    return a = i, _;
  }
  function b(r) {
    const e = o.__wbindgen_externrefs.get(r);
    return o.__externref_table_dealloc(r), e;
  }
  let O = new TextDecoder("utf-8", { ignoreBOM: !0, fatal: !0 });
  O.decode();
  const ne = 2146435072;
  let U = 0;
  function re(r, e) {
    return U += e, U >= ne && (O = new TextDecoder("utf-8", { ignoreBOM: !0, fatal: !0 }), O.decode(), U = e), O.decode(T().subarray(r, r + e));
  }
  const j = new TextEncoder();
  "encodeInto" in j || (j.encodeInto = function(r, e) {
    const t = j.encode(r);
    return e.set(t), {
      read: r.length,
      written: t.length
    };
  });
  let a = 0, o;
  function _e(r, e) {
    return o = r.exports, v = null, S = null, B = null, o.__wbindgen_start(), o;
  }
  function oe(r) {
    if (o !== void 0) return o;
    r !== void 0 && (Object.getPrototypeOf(r) === Object.prototype ? { module: r } = r : console.warn("using deprecated parameters for `initSync()`; pass a single object instead"));
    const e = H();
    r instanceof WebAssembly.Module || (r = new WebAssembly.Module(r));
    const t = new WebAssembly.Instance(r, e);
    return _e(t);
  }
  function D() {
    let r = 0;
    const e = /* @__PURE__ */ new Map();
    return {
      add(t) {
        const n = r++;
        return e.set(n, t), n;
      },
      get(t) {
        const n = e.get(t);
        if (!n)
          throw new Error("Attempted to use an object that has been freed");
        return n;
      },
      remove(t) {
        return e.delete(t);
      }
    };
  }
  const q = Symbol("transfer");
  function M(r, e) {
    return {
      type: q,
      value: r,
      transfer: e ? Array.isArray(e) ? e : [e] : [r]
    };
  }
  function L(r) {
    return !!(r && typeof r == "object" && Reflect.get(r, "type") === q);
  }
  function W(r = "default") {
    return {
      createTx(e) {
        const t = /* @__PURE__ */ new Map(), n = e ?? self;
        return n.addEventListener("message", (_) => {
          const { data: c } = _;
          if (c.channelName !== r)
            return;
          const { id: i, result: s, error: u } = c, g = t.get(i);
          g && (u ? g.reject(u) : g.resolve(s), t.delete(i));
        }), new Proxy(
          {},
          {
            get(_, c) {
              return (...i) => {
                const s = ce(), u = [], g = [];
                return i.forEach((F) => {
                  L(F) ? (u.push(F.value), g.push(...F.transfer)) : u.push(F);
                }), n.postMessage(
                  { method: c, args: u, id: s, channelName: r },
                  { transfer: g }
                ), new Promise((F, P) => {
                  t.set(s, { resolve: F, reject: P });
                });
              };
            }
          }
        );
      },
      rx(e, t) {
        const n = t ?? self;
        n.addEventListener("message", async (_) => {
          const { data: c } = _;
          if (c.channelName !== r)
            return;
          const { method: i, args: s, id: u } = c;
          try {
            const g = await e[i](...s);
            L(g) ? n.postMessage(
              { result: g.value, id: u, channelName: r },
              { transfer: g.transfer }
            ) : n.postMessage({ result: g, id: u, channelName: r });
          } catch (g) {
            n.postMessage({ error: g, id: u, channelName: r });
          }
        });
      }
    };
  }
  function ce() {
    return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
  }
  const { rx: ie } = W(), { createTx: se } = W("worker");
  function ae(r) {
    if (!(r != null && r.manifests))
      return r;
    const e = r.manifests, t = Object.assign(/* @__PURE__ */ Object.create(null), e), n = Object.getPrototypeOf(e);
    return n !== null && n !== Object.prototype && r.active_manifest && (t[r.active_manifest] = n), r.manifests = t, r;
  }
  const p = D(), d = D(), V = se();
  ie(
    ue({
      async initWorker(r, e) {
        oe({ module: r }), e && $(e);
      },
      async reader_fromBlob(r, e, t) {
        const n = await I.fromBlob(r, e, t);
        return p.add(n);
      },
      async reader_fromBlobFragment(r, e, t, n) {
        const _ = await I.fromBlobFragment(
          r,
          e,
          t,
          n
        );
        return p.add(_);
      },
      reader_activeLabel(r) {
        return p.get(r).activeLabel() ?? null;
      },
      reader_manifestStore(r) {
        const e = p.get(r);
        return ae(e.manifestStore());
      },
      reader_activeManifest(r) {
        return p.get(r).activeManifest();
      },
      reader_json(r) {
        return p.get(r).json();
      },
      reader_crJson(r) {
        return p.get(r).crJson();
      },
      reader_resourceToBytes(r, e) {
        const n = p.get(r).resourceToBytes(e);
        return M(n, n.buffer);
      },
      reader_free(r) {
        p.get(r).free(), p.remove(r);
      },
      builder_new(r) {
        const e = h.new(r);
        return d.add(e);
      },
      builder_fromJson(r, e) {
        const t = h.fromJson(r, e);
        return d.add(t);
      },
      builder_fromArchive(r, e) {
        const t = h.fromArchive(r, e);
        return d.add(t);
      },
      builder_setIntent(r, e) {
        d.get(r).setIntent(e);
      },
      builder_addAction(r, e) {
        d.get(r).addAction(e);
      },
      builder_addAssertion(r, e, t) {
        d.get(r).addAssertion(e, t);
      },
      builder_addRedaction(r, e, t) {
        d.get(r).addRedaction(e, t);
      },
      builder_filterActionsAt(r, e) {
        d.get(r).filterActionsAt(Uint32Array.from(e));
      },
      builder_updateActionsAt(r, e) {
        d.get(r).updateActionsAt(e);
      },
      builder_filterIngredientsAt(r, e) {
        d.get(r).filterIngredientsAt(Uint32Array.from(e));
      },
      builder_filterActionsAndIngredientsAt(r, e, t) {
        d.get(r).filterActionsAndIngredientsAt(
          Uint32Array.from(e),
          Uint32Array.from(t)
        );
      },
      builder_setRemoteUrl(r, e) {
        d.get(r).setRemoteUrl(e);
      },
      builder_setNoEmbed(r, e) {
        d.get(r).setNoEmbed(e);
      },
      builder_setThumbnailFromBlob(r, e, t) {
        d.get(r).setThumbnailFromBlob(e, t);
      },
      builder_addIngredient(r, e) {
        d.get(r).addIngredient(e);
      },
      async builder_addIngredientFromBlob(r, e, t, n) {
        await d.get(r).addIngredientFromBlob(e, t, n);
      },
      builder_addResourceFromBlob(r, e, t) {
        d.get(r).addResourceFromBlob(e, t);
      },
      builder_getDefinition(r) {
        return d.get(r).getDefinition();
      },
      builder_toArchive(r) {
        const t = d.get(r).toArchive();
        return M(t, t.buffer);
      },
      async builder_sign(r, e, t, n, _) {
        const i = await d.get(r).sign(
          {
            reserveSize: t.reserveSize,
            alg: t.alg,
            sign: async (s) => await V.sign(
              e,
              M(s, s.buffer),
              t.reserveSize
            )
          },
          n,
          _
        );
        return M(i, i.buffer);
      },
      async builder_signAndGetManifestBytes(r, e, t, n, _) {
        const c = d.get(r), { manifest: i, asset: s } = await c.signAndGetManifestBytes(
          {
            reserveSize: t.reserveSize,
            alg: t.alg,
            sign: async (u) => await V.sign(
              e,
              M(u, u.buffer),
              t.reserveSize
            )
          },
          n,
          _
        );
        return M(
          {
            manifest: i,
            asset: s
          },
          [i.buffer, s.buffer]
        );
      },
      builder_free(r) {
        d.get(r).free(), d.remove(r);
      }
    })
  );
  function ue(r) {
    const e = {};
    for (const [t, n] of Object.entries(r))
      e[t] = async (..._) => {
        try {
          return await n(..._);
        } catch (c) {
          throw typeof c == "string" ? new Error(c) : c;
        }
      };
    return e;
  }
});
export default be();
