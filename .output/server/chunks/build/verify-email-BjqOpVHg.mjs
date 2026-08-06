import { u as useRoute$1, $ as $fetch$2 } from '../virtual/entry.mjs';
import { defineComponent, mergeProps, unref, ref, useSSRContext } from 'vue';
import { ssrRenderAttrs } from 'vue/server-renderer';
import '../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'consola';
import 'zod';
import 'node:fs';
import 'node:url';
import 'node:crypto';
import 'nuxtseo-shared/utils';
import 'nuxtseo-shared/server';
import 'sitemapd/parse';
import 'ipx';
import '@prisma/client';
import '@prisma/adapter-pg';
import 'node:path';
import 'vue-router';
import 'unhead/utils';
import '../routes/renderer.mjs';
import 'unhead/server';
import 'unhead/legacy';
import 'unhead/plugins';
import 'nostics';
import 'vue-bundle-renderer/runtime';
import 'devalue';

//#region app/composables/useVerifyEmail.ts
function useVerifyEmail(fetcher) {
	const status = ref("loading");
	async function verify(token) {
		if (typeof token !== "string" || token.length === 0) {
			status.value = "error";
			return;
		}
		try {
			await fetcher({ token });
			status.value = "success";
		} catch {
			status.value = "error";
		}
	}
	return {
		status,
		verify
	};
}
//#endregion
//#region app/pages/account/verify-email.vue?vue&type=script&setup=true&lang.ts
var verify_email_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "verify-email",
	__ssrInlineRender: true,
	setup(__props) {
		useRoute$1();
		const { status} = useVerifyEmail(async (body) => {
			await $fetch$2("/api/user/register/verify-email", {
				method: "POST",
				body
			});
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "mx-auto max-w-md p-6" }, _attrs))}><h1 class="mb-4 text-xl font-semibold">Xác minh email</h1>`);
			if (unref(status) === "loading") _push(`<p data-testid="verify-loading">Đang xác minh...</p>`);
			else if (unref(status) === "success") _push(`<p data-testid="verify-success"> Email đã được xác minh thành công. Bạn có thể đăng nhập. </p>`);
			else _push(`<p role="alert" data-testid="verify-error"> Liên kết xác minh không hợp lệ hoặc đã hết hạn. </p>`);
			_push(`</main>`);
		};
	}
});
//#endregion
//#region app/pages/account/verify-email.vue
var _sfc_setup = verify_email_vue_vue_type_script_setup_true_lang_default.setup;
verify_email_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/account/verify-email.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var verify_email_default = verify_email_vue_vue_type_script_setup_true_lang_default;

export { verify_email_default as default };
//# sourceMappingURL=verify-email-BjqOpVHg.mjs.map
