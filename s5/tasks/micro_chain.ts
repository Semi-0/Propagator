import { construct_cell } from '../../Cell/Cell.ts';
import { p_sync } from '../../Propagator/BuiltInProps.ts';
import { update } from '../../AdvanceReactivity/interface.ts';
import { cell_strongest_base_value } from '../../Cell/Cell.ts';

export function buildMicroChain() {
	const A = construct_cell('A');
	const B = construct_cell('B');
	const C = construct_cell('C');
	p_sync(A, B);
	p_sync(B, C);

	const execute = async () => {
		update(A, 1);
	};

	const observed = ['A','B','C'] as const;
	const read = () => ({
		A: cell_strongest_base_value(A),
		B: cell_strongest_base_value(B),
		C: cell_strongest_base_value(C),
	});
	return { execute, observed, read };
}
