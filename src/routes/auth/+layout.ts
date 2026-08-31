import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ parent }) => {
	const { session } = await parent();
	// Đã đăng nhập mà vào trang login/signup -> về trang chính
	if (session) {
		throw redirect(307, '/');
	}
	return {};
};