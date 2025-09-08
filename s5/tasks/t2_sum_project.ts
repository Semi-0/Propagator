import { construct_cell } from '../../Cell/Cell.ts';
import { p_add } from '../../Propagator/BuiltInProps.ts';
import { update } from '../../AdvanceReactivity/interface.ts';
import { cell_strongest_base_value } from '../../Cell/Cell.ts';

export function buildSumProjection() {
	const a = construct_cell('a');
	const b = construct_cell('b');
	const c = construct_cell('c');
	p_add(a, b, c);

	const execute = async () => {
		update(a, 2);
		update(b, 3);
	};

	const observed = ['a','b','c'] as const;
	const read = () => ({
		a: cell_strongest_base_value(a),
		b: cell_strongest_base_value(b),
		c: cell_strongest_base_value(c),
	});
	return { execute, observed, read };
}
