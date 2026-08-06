import { u as useRoute$1, $ as $fetch$2 } from '../virtual/entry.mjs';
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

//#region app/composables/useResetPasswordForm.ts
function useResetPasswordForm(fetcher) {
	const newPassword = ref("");
	const status = ref("idle");
	const errorMessage = ref("");
	async function submit(token) {
		if (typeof token !== "string" || token.length === 0) {
			status.value = "error";
			errorMessage.value = "Liên kết đặt lại mật khẩu không hợp lệ.";
			return;
		}
		status.value = "loading";
		errorMessage.value = "";
		try {
			await fetcher({
				token,
				newPassword: newPassword.value
			});
			status.value = "success";
		} catch {
			status.value = "error";
			errorMessage.value = "Liên kết đã hết hạn hoặc đã được sử dụng.";
		}
	}
	return {
		newPassword,
		status,
		errorMessage,
		submit
	};
}
//#endregion
//#region app/pages/account/password/reset.vue?vue&type=script&setup=true&lang.ts
var reset_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "reset",
	__ssrInlineRender: true,
	setup(__props) {
		useRoute$1();
		const { newPassword, status, errorMessage} = useResetPasswordForm(async (body) => {
			await $fetch$2("/api/user/password/reset", {
				method: "POST",
				body
			});
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "mx-auto max-w-md p-6" }, _attrs))}><h1 class="mb-4 text-xl font-semibold">Đặt lại mật khẩu</h1>`);
			if (unref(status) !== "success") {
				_push(`<form class="flex flex-col gap-3"><label class="flex flex-col gap-1"><span>Mật khẩu mới</span><input${ssrRenderAttr("value", unref(newPassword))} type="password" required minlength="8" class="border p-2" data-testid="reset-new-password"></label><button type="submit"${ssrIncludeBooleanAttr(unref(status) === "loading") ? " disabled" : ""} class="border p-2" data-testid="reset-submit">${ssrInterpolate(unref(status) === "loading" ? "Đang xử lý..." : "Đặt lại mật khẩu")}</button>`);
				if (unref(status) === "error") _push(`<p role="alert" data-testid="reset-error">${ssrInterpolate(unref(errorMessage))}</p>`);
				else _push(`<!---->`);
				_push(`</form>`);
			} else _push(`<p data-testid="reset-success"> Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập lại. </p>`);
			_push(`</main>`);
		};
	}
});
//#endregion
//#region app/pages/account/password/reset.vue
var _sfc_setup = reset_vue_vue_type_script_setup_true_lang_default.setup;
reset_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/account/password/reset.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var reset_default = reset_vue_vue_type_script_setup_true_lang_default;

export { reset_default as default };
//# sourceMappingURL=reset-DXsGzb1I.mjs.map
