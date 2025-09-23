import { construct_cell } from '../../Cell/Cell.ts';
import { p_sync } from '../../Propagator/BuiltInProps.ts';
import { update } from '../../AdvanceReactivity/interface.ts';
import { cell_strongest_base_value } from '../../Cell/Cell.ts';

export function buildMicroDiamond() {
	const A = construct_cell('A');
	const B = construct_cell('B');
	const C = construct_cell('C');
	const D = construct_cell('D');
	p_sync(A, B);
	p_sync(A, C);
	p_sync(B, D);
	p_sync(C, D);

	const execute = async () => {
		update(A, 1);
	};

	const observed = ['A','B','C','D'] as const;
	const read = () => ({
		A: cell_strongest_base_value(A),
		B: cell_strongest_base_value(B),
		C: cell_strongest_base_value(C),
		D: cell_strongest_base_value(D),
	});
	return { execute, observed, read };
}
