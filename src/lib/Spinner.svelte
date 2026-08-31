<script lang="ts">
	let { color = 'ink', size = 16 }: { color?: 'ink' | 'deficit' | 'surplus' | 'white'; size?: number } =
		$props();
	const cls = $derived(
		color === 'deficit'
			? 'border-deficit'
			: color === 'surplus'
				? 'border-surplus'
				: color === 'white'
					? 'border-white'
					: 'border-ink'
	);
</script>

<span
	class="inline-block animate-spin rounded-full border-2 {cls}"
	style={`border-right-color: transparent; width: ${size}px; height: ${size}px;`}
	aria-hidden="true"
></span>