import { EVM } from '../evm';
import { Opcode } from '../opcode';
export declare class CALL {
    readonly name: string;
    readonly type?: string;
    readonly wrapped: boolean;
    readonly gas: any;
    readonly address: any;
    readonly value: any;
    readonly memoryStart: any;
    readonly memoryLength: any;
    readonly outputStart: any;
    readonly outputLength: any;
    readonly throwOnFail: boolean;
    constructor(gas: any, address: any, value: any, memoryStart: any, memoryLength: any, outputStart: any, outputLength: any);
    toString(): string;
}
declare const _default: (_opcode: Opcode, state: EVM) => void;
export default _default;