import { EVM } from '../classes/evm.class';
import { Opcode } from '../opcode.interface';
import * as BigNumber from '../../node_modules/big-integer';
import stringify from '../utils/stringify';

export class LT {
    readonly name: string;
    readonly type?: string;
    readonly wrapped: boolean;
    readonly left: any;
    readonly right: any;
    readonly equal: boolean;

    constructor(left: any, right: any, equal = false) {
        this.name = 'LT';
        this.wrapped = true;
        this.left = left;
        this.right = right;
        this.equal = equal;
    }

    toString() {
        if (this.equal) {
            return stringify(this.left) + ' <= ' + stringify(this.right);
        } else {
            return stringify(this.left) + ' < ' + stringify(this.right);
        }
    }
}

export default (opcode: Opcode, state: EVM): void => {
    const left = state.stack.pop();
    const right = state.stack.pop();
    if (BigNumber.isInstance(left) && BigNumber.isInstance(right)) {
        state.stack.push(BigNumber(left.lesser(right) === true ? 1 : 0));
    } else {
        state.stack.push(new LT(left, right));
    }
};
