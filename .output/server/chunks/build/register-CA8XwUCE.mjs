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

//#region app/composables/useRegisterForm.ts
function useRegisterForm(fetcher) {
	const email = ref("");
	const password = ref("");
	const displayName = ref("");
	const status = ref("idle");
	const errorMessage = ref("");
	async function submit() {
		status.value = "loading";
		errorMessage.value = "";
		try {
			await fetcher({
				email: email.value,
				password: password.value,
				displayName: displayName.value
			});
			status.value = "success";
		} catch {
			status.value = "error";
			errorMessage.value = "Đăng ký thất bại. Vui lòng thử lại.";
		}
	}
	return {
		email,
		password,
		displayName,
		status,
		errorMessage,
		submit
	};
}
//#endregion
//#region app/pages/account/register.vue?vue&type=script&setup=true&lang.ts
var register_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "register",
	__ssrInlineRender: true,
	setup(__props) {
		const { email, password, displayName, status, errorMessage} = useRegisterForm(async (body) => {
			await $fetch$2("/api/user/register", {
				method: "POST",
				body
			});
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "mx-auto max-w-md p-6" }, _attrs))}><h1 class="mb-4 text-xl font-semibold">Đăng ký tài khoản</h1>`);
			if (unref(status) !== "success") {
				_push(`<form class="flex flex-col gap-3"><label class="flex flex-col gap-1"><span>Email</span><input${ssrRenderAttr("value", unref(email))} type="email" required class="border p-2" data-testid="register-email"></label><label class="flex flex-col gap-1"><span>Tên hiển thị</span><input${ssrRenderAttr("value", unref(displayName))} type="text" required class="border p-2" data-testid="register-display-name"></label><label class="flex flex-col gap-1"><span>Mật khẩu</span><input${ssrRenderAttr("value", unref(password))} type="password" required minlength="8" class="border p-2" data-testid="register-password"></label><button type="submit"${ssrIncludeBooleanAttr(unref(status) === "loading") ? " disabled" : ""} class="border p-2" data-testid="register-submit">${ssrInterpolate(unref(status) === "loading" ? "Đang gửi..." : "Đăng ký")}</button>`);
				if (unref(status) === "error") _push(`<p role="alert" data-testid="register-error">${ssrInterpolate(unref(errorMessage))}</p>`);
				else _push(`<!---->`);
				_push(`</form>`);
			} else _push(`<p data-testid="register-success"> Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản. </p>`);
			_push(`</main>`);
		};
	}
});
//#endregion
//#region app/pages/account/register.vue
var _sfc_setup = register_vue_vue_type_script_setup_true_lang_default.setup;
register_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/account/register.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var register_default = register_vue_vue_type_script_setup_true_lang_default;

export { register_default as default };
//# sourceMappingURL=register-CA8XwUCE.mjs.map
