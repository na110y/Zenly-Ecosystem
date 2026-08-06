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

//#region app/composables/useProfileForm.ts
function useProfileForm(fetcher) {
	const displayName = ref("");
	const email = ref("");
	const status = ref("idle");
	async function load() {
		status.value = "loading";
		try {
			const profile = await fetcher.get();
			displayName.value = profile.displayName;
			email.value = profile.email;
			status.value = "idle";
		} catch {
			status.value = "error";
		}
	}
	async function submit() {
		status.value = "loading";
		try {
			await fetcher.update({ displayName: displayName.value });
			status.value = "success";
		} catch {
			status.value = "error";
		}
	}
	return {
		displayName,
		email,
		status,
		load,
		submit
	};
}
//#endregion
//#region app/pages/account/profile.vue?vue&type=script&setup=true&lang.ts
var profile_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "profile",
	__ssrInlineRender: true,
	setup(__props) {
		const { displayName, email, status} = useProfileForm({
			async get() {
				return await $fetch$2("/api/user/profile");
			},
			async update(body) {
				await $fetch$2("/api/user/profile", {
					method: "PATCH",
					body
				});
			}
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<main${ssrRenderAttrs(mergeProps({ class: "mx-auto max-w-md p-6" }, _attrs))}><h1 class="mb-4 text-xl font-semibold">Hồ sơ</h1><form class="flex flex-col gap-3"><label class="flex flex-col gap-1"><span>Email</span><input${ssrRenderAttr("value", unref(email))} type="email" disabled class="border p-2" data-testid="profile-email"></label><label class="flex flex-col gap-1"><span>Tên hiển thị</span><input${ssrRenderAttr("value", unref(displayName))} type="text" required class="border p-2" data-testid="profile-display-name"></label><button type="submit"${ssrIncludeBooleanAttr(unref(status) === "loading") ? " disabled" : ""} class="border p-2" data-testid="profile-submit">${ssrInterpolate(unref(status) === "loading" ? "Đang lưu..." : "Lưu thay đổi")}</button>`);
			if (unref(status) === "success") _push(`<p data-testid="profile-success">Đã cập nhật hồ sơ.</p>`);
			else _push(`<!---->`);
			if (unref(status) === "error") _push(`<p role="alert" data-testid="profile-error"> Đã có lỗi xảy ra. Vui lòng thử lại. </p>`);
			else _push(`<!---->`);
			_push(`</form></main>`);
		};
	}
});
//#endregion
//#region app/pages/account/profile.vue
var _sfc_setup = profile_vue_vue_type_script_setup_true_lang_default.setup;
profile_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/account/profile.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var profile_default = profile_vue_vue_type_script_setup_true_lang_default;

export { profile_default as default };
//# sourceMappingURL=profile-D0Al1nPs.mjs.map
