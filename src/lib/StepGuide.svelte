<script lang="ts">
	// Hướng dẫn từng bước cho người dùng mới, hiển thị dạng modal 1 lần đầu.
	// Mở lại bất cứ lúc nào qua nút (?) ở góc trên phải của các trang (app).

	let { open = false, onclose }: { open?: boolean; onclose?: () => void } = $props();

	type Step = {
		title: string;
		body: string;
		icon: string;
	};

	const steps: Step[] = [
		{
			title: 'Chào mừng đến với Tideline',
			body: 'Tideline giúp bạn kiểm soát chi tiêu mỗi ngày bằng một hạn mức cố định. Số dư/thiếu mỗi ngày sẽ tự cộng dồn sang ngày kế tiếp, rồi reset về ngày đầu của vòng. Hãy dành 30 giây đọc qua các bước bên dưới nhé.',
			icon: 'wave'
		},
		{
			title: 'Trang “Hôm nay”',
			body: 'Số lớn màu xanh cho biết còn bao nhiêu để chi hôm nay. Nếu chi vượt, số sẽ chuyển đỏ và báo “Đã vượt hạn mức” — bạn thấy ngay hôm nay còn dư hay đã vượt, cùng hạn mức và số đã chi ở phía dưới.',
			icon: 'today'
		},
		{
			title: 'Thêm khoản chi',
			body: 'Nhập số tiền (kèm ghi chú tuỳ ý, ví dụ “cà phê sáng”) rồi bấm “Thêm khoản chi”. Nhấn vào một khoản chi để sửa lại số tiền/ghi chú hoặc xoá (có hỏi xác nhận trước khi xoá).',
			icon: 'plus'
		},
		{
			title: 'Xem lịch sử',
			body: 'Trang “Lịch sử” liệt kê hạn mức, số đã chi và số dư của từng ngày trong vòng. Dùng nút “Vòng trước / Vòng sau” để xem vòng chi tiêu khác.',
			icon: 'history'
		},
		{
			title: 'Thống kê',
			body: 'Trang “Thống kê” tóm tắt tổng chi, số ngày tiết kiệm/vượt hạn mức. Phần biểu đồ cho phép xem theo ngày, tuần hoặc tháng để nhìn nhanh xu hướng chi tiêu của cả vòng.',
			icon: 'stats'
		},
		{
			title: 'Điều chỉnh trong “Cài đặt”',
			body: 'Thay đổi hạn mức mặc định mỗi ngày, hoặc đặt ngày bắt đầu vòng chi tiêu (ví dụ mùng 21 theo ngày nhận lương). Hướng dẫn chỉ hiện lần đầu — bạn có thể mở lại bất cứ lúc nào bằng nút (?) trên màn hình.',
			icon: 'settings'
		}
	];

	let index = $state(0);
	let isOpen = $state(false);

	// Đồng bộ khi prop `open` chuyển thành true: reset bước về đầu và mở modal.
	$effect(() => {
		if (open) {
			index = 0;
			isOpen = true;
		}
	});

	const current = $derived(steps[index]);
	const isLast = $derived(index === steps.length - 1);

	// Bấm Escape để đóng khi modal đang mở.
	$effect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	function next() {
		if (index < steps.length - 1) index += 1;
	}

	function close() {
		isOpen = false;
		onclose?.();
	}

	function closeFromBackdrop(e: MouseEvent) {
		// Chỉ đóng khi bấm vào chính backdrop (x = 50% vùng xám), không phải bấm trong hộp.
		if (e.target === e.currentTarget) close();
	}
</script>

<!-- Modal overlay -->
{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 sm:items-center"
		role="dialog"
		aria-modal="true"
		aria-label="Hướng dẫn sử dụng"
		tabindex="-1"
		onclick={closeFromBackdrop}
		onkeydown={(event) => {
			if (event.key === 'Escape') close();
		}}
	>
		<div
			class="ui-dialog rounded-b-none pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-panel mx-auto w-full max-w-[430px] px-6 pt-6"
		>
			<!-- Header: icon + step indicator -->
			<div class="flex items-center justify-between">
				{@render StepIcon({ name: current.icon })}
				<span class="text-sm font-medium text-muted tabular-nums">
					{index + 1} / {steps.length}
				</span>
			</div>

			<!-- Dot indicator -->
			<div class="mt-3 flex items-center gap-1.5" aria-hidden="true">
				{#each steps as _, i (i)}
					<span
						class="h-1.5 rounded-full transition-all {i === index ? 'w-6 bg-ink' : 'w-1.5 bg-line'}"
					></span>
				{/each}
			</div>

			<h2 class="section-title mt-6">{current.title}</h2>
			<p class="mt-2 text-sm leading-relaxed text-muted">{current.body}</p>

			<!-- Footer buttons -->
			<div class="mt-6 flex items-center gap-3">
				{#if index > 0}
					<button
						type="button"
						onclick={() => (index -= 1)}
						class="ui-button ui-button-secondary text-sm"
					>
						Quay lại
					</button>
				{:else}
					<span class="flex-1"></span>
				{/if}

				<button
					type="button"
					onclick={isLast ? close : next}
					class="ui-button ui-button-primary flex-1"
				>
					{isLast ? 'Bắt đầu dùng' : 'Tiếp theo'}
				</button>

				<button
					type="button"
					onclick={close}
					class="rounded-xl px-2 py-3 text-sm font-medium text-muted hover:text-ink"
				>
					Bỏ qua
				</button>
			</div>
		</div>
	</div>
{/if}

{#snippet StepIcon(opts: { name: string })}
	{@const { name } = opts}
	<span class="rounded-xl bg-ink p-2.5 text-white">
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			{#if name === 'wave'}
				<path d="M12 5v14" />
				<path d="M8 8l4-3 8 2.5" />
				<path d="M8 16l4 3" />
				<path d="M5 9l-2 3 2 3" />
				<path d="M19 9l2 3-2 3" />
			{:else if name === 'today'}
				<circle cx="12" cy="13" r="8" />
				<path d="M12 8v5l3 2" />
				<path d="M5 3 4 4" />
				<path d="M19 3l1 1" />
			{:else if name === 'plus'}
				<circle cx="12" cy="12" r="9" />
				<path d="M12 8v8" />
				<path d="M8 12h8" />
			{:else if name === 'history'}
				<path d="M3 12a9 9 0 1 0 3-6.7" />
				<path d="M3 5v4h4" />
				<path d="M12 8v4l2.5 2.5" />
			{:else if name === 'stats'}
				<path d="M4 20V10" />
				<path d="M9 20V4" />
				<path d="M14 20v-7" />
				<path d="M19 20V8" />
			{:else}
				<circle cx="12" cy="12" r="3" />
				<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
			{/if}
		</svg>
	</span>
{/snippet}
