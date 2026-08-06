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

//#region app/composables/useForgotPasswordForm.ts
function useForgotPasswordForm(fetcher) {
	const email = ref("");
	const status = ref("idle");
	async function submit() {
		status.value = "loading";
		try {
			await fetcher({ email: email.value });
			status.value = "success";
		} catch {
			status.value = "error";
		}
	}
	return {
		email,
		status,
		submit
	};
}
//#endregion
//#region app/pages/account/password/forgot.vue?vue&type=script&setup=true&lang.ts
var forgot_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "forgot",
	__ssrInlineRender: true,
	setup(__props) {
		const { email, status} = useForgotPasswordForm(async (body) => {
			await $fetch$2("/api/user/password/forgot", {
				method: "POST",
				body
			});
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "mx-auto max-w-md p-6" }, _attrs))}><h1 class="mb-4 text-xl font-semibold">Quên mật khẩu</h1>`);
			if (unref(status) !== "success") {
				_push(`<form class="flex flex-col gap-3"><label class="flex flex-col gap-1"><span>Email</span><input${ssrRenderAttr("value", unref(email))} type="email" required class="border p-2" data-testid="forgot-email"></label><button type="submit"${ssrIncludeBooleanAttr(unref(status) === "loading") ? " disabled" : ""} class="border p-2" data-testid="forgot-submit">${ssrInterpolate(unref(status) === "loading" ? "Đang gửi..." : "Gửi liên kết đặt lại")}</button>`);
				if (unref(status) === "error") _push(`<p role="alert" data-testid="forgot-error"> Đã có lỗi xảy ra. Vui lòng thử lại. </p>`);
				else _push(`<!---->`);
				_push(`</form>`);
			} else _push(`<p data-testid="forgot-success"> Nếu email tồn tại trong hệ thống, một liên kết đặt lại mật khẩu đã được gửi. </p>`);
			_push(`</main>`);
		};
	}
});
//#endregion
//#region app/pages/account/password/forgot.vue
var _sfc_setup = forgot_vue_vue_type_script_setup_true_lang_default.setup;
forgot_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/account/password/forgot.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var forgot_default = forgot_vue_vue_type_script_setup_true_lang_default;

export { forgot_default as default };
//# sourceMappingURL=forgot-CMB9B2sL.mjs.map
