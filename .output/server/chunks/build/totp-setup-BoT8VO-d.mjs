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

//#region app/composables/useAdminTotpSetup.ts
function useAdminTotpSetup(deps) {
	const step = ref("login");
	const status = ref("idle");
	const errorMessage = ref("");
	const email = ref("");
	const password = ref("");
	const code = ref("");
	const qrCodeDataUrl = ref("");
	async function submitLogin() {
		status.value = "loading";
		errorMessage.value = "";
		try {
			await deps.login({
				email: email.value,
				password: password.value
			});
			const result = await deps.setup();
			qrCodeDataUrl.value = result.qrCodeDataUrl;
			step.value = "activate";
			status.value = "idle";
		} catch {
			status.value = "error";
			errorMessage.value = "Email hoặc mật khẩu không đúng.";
		}
	}
	async function submitActivate() {
		status.value = "loading";
		errorMessage.value = "";
		try {
			await deps.activate({ code: code.value });
			step.value = "done";
			status.value = "idle";
		} catch {
			status.value = "error";
			errorMessage.value = "Mã xác minh không đúng.";
		}
	}
	return {
		step,
		status,
		errorMessage,
		email,
		password,
		code,
		qrCodeDataUrl,
		submitLogin,
		submitActivate
	};
}
//#endregion
//#region app/pages/system/totp-setup.vue?vue&type=script&setup=true&lang.ts
var totp_setup_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "totp-setup",
	__ssrInlineRender: true,
	setup(__props) {
		const { step, status, errorMessage, email, password, code, qrCodeDataUrl} = useAdminTotpSetup({
			login: async (body) => {
				await $fetch$2("/api/admin/login", {
					method: "POST",
					body
				});
			},
			setup: async () => {
				return await $fetch$2("/api/admin/totp/setup", { method: "POST" });
			},
			activate: async (body) => {
				await $fetch$2("/api/admin/totp/activate", {
					method: "POST",
					body
				});
			}
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "mx-auto max-w-md p-6" }, _attrs))}><h1 class="mb-4 text-xl font-semibold">Thiết lập TOTP</h1>`);
			if (unref(step) === "login") {
				_push(`<form class="flex flex-col gap-3"><label class="flex flex-col gap-1"><span>Email</span><input${ssrRenderAttr("value", unref(email))} type="email" required class="border p-2" data-testid="admin-login-email"></label><label class="flex flex-col gap-1"><span>Mật khẩu</span><input${ssrRenderAttr("value", unref(password))} type="password" required class="border p-2" data-testid="admin-login-password"></label><button type="submit"${ssrIncludeBooleanAttr(unref(status) === "loading") ? " disabled" : ""} class="border p-2" data-testid="admin-login-submit">${ssrInterpolate(unref(status) === "loading" ? "Đang xử lý..." : "Tiếp tục")}</button>`);
				if (unref(status) === "error") _push(`<p role="alert" data-testid="admin-login-error">${ssrInterpolate(unref(errorMessage))}</p>`);
				else _push(`<!---->`);
				_push(`</form>`);
			} else if (unref(step) === "activate") {
				_push(`<div class="flex flex-col gap-3"><p>Quét mã QR bằng ứng dụng xác thực, sau đó nhập mã 6 số.</p><img${ssrRenderAttr("src", unref(qrCodeDataUrl))} alt="Mã QR thiết lập TOTP" data-testid="admin-totp-qr"><form class="flex flex-col gap-3"><label class="flex flex-col gap-1"><span>Mã xác minh</span><input${ssrRenderAttr("value", unref(code))} type="text" inputmode="numeric" maxlength="6" required class="border p-2" data-testid="admin-totp-code"></label><button type="submit"${ssrIncludeBooleanAttr(unref(status) === "loading") ? " disabled" : ""} class="border p-2" data-testid="admin-totp-activate-submit">${ssrInterpolate(unref(status) === "loading" ? "Đang xác minh..." : "Kích hoạt")}</button>`);
				if (unref(status) === "error") _push(`<p role="alert" data-testid="admin-totp-error">${ssrInterpolate(unref(errorMessage))}</p>`);
				else _push(`<!---->`);
				_push(`</form></div>`);
			} else if (unref(step) === "done") _push(`<p data-testid="admin-totp-success"> Đã kích hoạt TOTP thành công. </p>`);
			else _push(`<!---->`);
			_push(`</main>`);
		};
	}
});
//#endregion
//#region app/pages/system/totp-setup.vue
var _sfc_setup = totp_setup_vue_vue_type_script_setup_true_lang_default.setup;
totp_setup_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/system/totp-setup.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var totp_setup_default = totp_setup_vue_vue_type_script_setup_true_lang_default;

export { totp_setup_default as default };
//# sourceMappingURL=totp-setup-BoT8VO-d.mjs.map
