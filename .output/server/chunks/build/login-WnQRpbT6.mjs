import { $ as $fetch$2 } from '../virtual/entry.mjs';
import { defineComponent, mergeProps, unref, ref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrIncludeBooleanAttr, ssrInterpolate } from 'vue/server-renderer';
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

//#region app/composables/useLoginForm.ts
function useLoginForm(fetcher) {
	const email = ref("");
	const password = ref("");
	const status = ref("idle");
	const errorMessage = ref("");
	async function submit() {
		status.value = "loading";
		errorMessage.value = "";
		try {
			await fetcher({
				email: email.value,
				password: password.value
			});
			status.value = "success";
		} catch {
			status.value = "error";
			errorMessage.value = "Email hoặc mật khẩu không đúng.";
		}
	}
	return {
		email,
		password,
		status,
		errorMessage,
		submit
	};
}
//#endregion
//#region app/pages/account/login.vue?vue&type=script&setup=true&lang.ts
var login_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "login",
	__ssrInlineRender: true,
	setup(__props) {
		const { email, password, status, errorMessage} = useLoginForm(async (body) => {
			await $fetch$2("/api/user/login", {
				method: "POST",
				body
			});
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "mx-auto max-w-md p-6" }, _attrs))}><h1 class="mb-4 text-xl font-semibold">Đăng nhập</h1>`);
			if (unref(status) !== "success") {
				_push(`<form class="flex flex-col gap-3"><label class="flex flex-col gap-1"><span>Email</span><input${ssrRenderAttr("value", unref(email))} type="email" required class="border p-2" data-testid="login-email"></label><label class="flex flex-col gap-1"><span>Mật khẩu</span><input${ssrRenderAttr("value", unref(password))} type="password" required class="border p-2" data-testid="login-password"></label><button type="submit"${ssrIncludeBooleanAttr(unref(status) === "loading") ? " disabled" : ""} class="border p-2" data-testid="login-submit">${ssrInterpolate(unref(status) === "loading" ? "Đang đăng nhập..." : "Đăng nhập")}</button>`);
				if (unref(status) === "error") _push(`<p role="alert" data-testid="login-error">${ssrInterpolate(unref(errorMessage))}</p>`);
				else _push(`<!---->`);
				_push(`</form>`);
			} else _push(`<p data-testid="login-success">Đăng nhập thành công.</p>`);
			_push(`</main>`);
		};
	}
});
//#endregion
//#region app/pages/account/login.vue
var _sfc_setup = login_vue_vue_type_script_setup_true_lang_default.setup;
login_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/account/login.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var login_default = login_vue_vue_type_script_setup_true_lang_default;

export { login_default as default };
//# sourceMappingURL=login-WnQRpbT6.mjs.map
