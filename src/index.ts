import { type Expr, type Inst, Throw, type Val } from './ast/expr';
import type { Type } from './type';
import { Not } from './ast/logic';
import type { Return, Revert } from './ast/system';
import { State } from './state';
import { EVM } from './evm';
import { type SLoad, Variable, type MappingLoad } from './ast/storage';
import { solEvents, solMappings, solStructs, solVars, solStmts } from './sol';
import ERCs from './ercs';
import type { Step } from './step';
import { CallSite, If, Require, type Stmt } from './stmt';

export * from './metadata';
export * from './opcode';
export * from './state';
export * from './step';
export * from './type';
export * from './evm';
export * from './stmt';
export * from './sol';
export * from './yul';

/**
 *
 */
export const ERCIds = Object.keys(ERCs);

/**
 *
 */
export class Contract {
    /**
     *
     */
    readonly evm: EVM;

    /**
     *
     */
    readonly main: Stmt[];

    /**
     *
     */
    readonly functions: { [selector: string]: PublicFunction } = {};

    readonly payable: boolean;

    /**
     *
     * @param bytecode the bytecode to analyze in hexadecimal format.
     */
    constructor(readonly bytecode: string, insts: Partial<Step> = {}) {
        this.evm = new EVM(bytecode, insts);
        const main = new State<Inst, Expr>();
        this.evm.run(0, main);
        this.main = build(main);

        this.payable = !requiresNoValue(this.main);

        for (const [selector, branch] of this.evm.functionBranches) {
            this.evm.run(branch.pc, branch.state);
            this.functions[selector] = new PublicFunction(this, build(branch.state), selector);
        }
    }

    get metadata(): EVM['metadata'] {
        return this.evm.metadata;
    }

    /**
     *
     */
    chunks(): { pcstart: number; pcend: number; states?: State<Inst, Expr>[] }[] {
        let lastPc = 0;

        const result = [];
        const pcs = [...this.evm.chunks.keys()];
        pcs.sort((a, b) => a - b);
        for (const pc of pcs) {
            const chunk = this.evm.chunks.get(pc)!;
            if (lastPc !== pc) {
                result.push({ pcstart: lastPc, pcend: pc });
            }
            lastPc = chunk.pcend;
            result.push({ pcstart: pc, pcend: chunk.pcend, states: chunk.states });
        }

        if (lastPc !== this.evm.opcodes.length) {
            result.push({ pcstart: lastPc, pcend: this.evm.opcodes.length });
        }

        return result;
    }

    /**
     *
     * @returns
     */
    getFunctions(): string[] {
        return Object.values(this.functions).flatMap(fn =>
            fn.label === undefined ? [] : [fn.label]
        );
    }

    /**
     *
     * @returns
     */
    getEvents(): string[] {
        return Object.values(this.evm.events).flatMap(event =>
            event.sig === undefined ? [] : [event.sig]
        );
    }

    // getABI() {
    //     return Object.values(this.contract).map(fn => {
    //         return {
    //             type: 'function',
    //             name: fn.label.split('(')[0],
    //             payable: fn.payable,
    //             constant: fn.constant,
    //         };
    //     });
    // }

    /**
     * https://eips.ethereum.org/EIPS/eip-165
     * https://eips.ethereum.org/EIPS/eip-20
     * https://eips.ethereum.org/EIPS/eip-20
     * https://eips.ethereum.org/EIPS/eip-721
     *
     * @param ercid
     * @returns
     */
    isERC(ercid: (typeof ERCIds)[number], checkEvents = true): boolean {
        return (
            ERCs[ercid].selectors.every(s => this.evm.functionBranches.has(s)) &&
            (!checkEvents || ERCs[ercid].topics.every(t => t in this.evm.events))
        );
    }

    /**
     *
     * @returns
     */
    decompile(): string {
        let text = '';

        text += solEvents(this.evm.events);
        text += solStructs(this.evm.mappings);
        text += solMappings(this.evm.mappings);
        text += solVars(this.evm.variables);
        text += solStmts(this.main);
        for (const [, fn] of Object.entries(this.functions)) {
            text += fn.decompile();
        }

        return text;
    }
}

export function isRevertBlock(falseBlock: Stmt[]): falseBlock is [Revert] {
    return falseBlock.length === 1 && falseBlock[0].name === 'Revert';
}

export class PublicFunction {
    /**
     *
     */
    private _label: string | undefined = undefined;
    readonly payable: boolean;
    readonly visibility: string;
    readonly constant: boolean;
    readonly returns: string[] = [];

    constructor(
        readonly contract: Contract,
        readonly stmts: Stmt[],
        readonly selector: string // readonly gasUsed: number, // functionHashes: { [s: string]: string }
    ) {
        this.visibility = 'public';
        this.constant = false;
        // this.label = this.hash in functionHashes ? functionHashes[this.hash] : this.hash + '()';

        if (requiresNoValue(this.stmts)) {
            this.payable = false;
            this.stmts.shift();
        } else if (!contract.payable) {
            this.payable = false;
        } else {
            this.payable = true;
        }
        if (this.stmts.length === 1 && this.stmts[0].name === 'Return') {
            this.constant = true;
        }

        const returns: Expr[][] = [];
        PublicFunction.findReturns(stmts, returns);
        if (
            returns.length > 0 &&
            returns.every(
                args =>
                    args.length === returns[0].length &&
                    args.map(arg => arg.type).join('') === returns[0].map(arg => arg.type).join('')
            )
        ) {
            returns[0].forEach(arg => {
                if (arg.isVal()) {
                    this.returns.push('uint256');
                } else if (arg.type) {
                    this.returns.push(arg.type);
                } else {
                    this.returns.push('unknown');
                }
            });
        } else if (returns.length > 0) {
            this.returns.push('<unknown>');
        }
    }

    get label(): string | undefined {
        return this._label;
    }

    set label(value: string | undefined) {
        this._label = value;
        if (value !== undefined) {
            const functionName = value.split('(')[0];

            if (this.isGetter()) {
                const location = this.stmts[0].args[0].location.val.toString();
                const variable = this.contract.evm.variables[location];
                this.contract.evm.variables[this.selector] = new Variable(
                    functionName,
                    variable ? variable.types : []
                );
            }

            if (this.isMappingGetter()) {
                const location = this.stmts[0].args[0].location;
                this.contract.evm.mappings[location].name = functionName;
            }

            const paramTypes = value.replace(functionName, '').slice(1, -1).split(',');
            if (paramTypes.length > 1 || (paramTypes.length === 1 && paramTypes[0] !== '')) {
                this.stmts.forEach(stmt =>
                    PublicFunction.patchCallDataLoad(
                        stmt as unknown as Record<string, Expr>,
                        paramTypes as Type[]
                    )
                );
            }
        }
    }

    private isGetter(): this is { stmts: [Return & { args: [SLoad & { location: Val }] }] } {
        const exit = this.stmts[0];
        return (
            this.stmts.length === 1 &&
            exit.name === 'Return' &&
            exit.args !== undefined &&
            exit.args.length === 1 &&
            exit.args[0].tag === 'SLoad' &&
            exit.args[0].location.isVal()
        );
    }

    private isMappingGetter(): this is { stmts: [Return & { args: MappingLoad[] }] } {
        const exit = this.stmts[0];
        return (
            this.stmts.length === 1 &&
            exit.name === 'Return' &&
            exit.args !== undefined &&
            exit.args.every(arg => arg.tag === 'MappingLoad')
        );
    }

    private static findReturns(stmts: Stmt[], returns: Expr[][]) {
        for (const stmt of stmts) {
            if (stmt.name === 'Return' && stmt.args && stmt.args.length > 0) {
                returns.push(stmt.args);
            } else if (stmt.name === 'If') {
                [stmt.trueBlock, stmt.falseBlock].forEach(stmts => {
                    if (stmts !== undefined) {
                        PublicFunction.findReturns(stmts, returns);
                    }
                });
            }
        }
    }

    private static patchCallDataLoad(stmtOrExpr: Record<string, Expr>, paramTypes: Type[]) {
        for (const propKey in stmtOrExpr) {
            if (propKey === 'mappings') continue;

            if (Object.prototype.hasOwnProperty.call(stmtOrExpr, propKey)) {
                const expr = stmtOrExpr[propKey];
                if (expr && expr.tag === 'CallDataLoad' && expr.location.isVal()) {
                    const argNumber = Number((expr.location.val - 4n) / 32n);
                    expr.type = paramTypes[argNumber];
                }
                if (
                    typeof expr === 'object' &&
                    !(expr instanceof Variable) &&
                    !(expr instanceof Throw)
                ) {
                    PublicFunction.patchCallDataLoad(
                        expr as unknown as Record<string, Expr>,
                        paramTypes
                    );
                }
            }
        }
    }

    /**
     *
     * @returns the decompiled text for `this` function.
     */
    decompile(): string {
        let output = '';
        output += 'function ';
        if (this.label !== undefined) {
            const fullFunction = this.label;
            const fullFunctionName = fullFunction.split('(')[0];
            const fullFunctionArguments = fullFunction
                .replace(fullFunctionName, '')
                .substring(1)
                .slice(0, -1);
            if (fullFunctionArguments) {
                output += fullFunctionName + '(';
                output += fullFunctionArguments
                    .split(',')
                    .map((a: string, i: number) => `${a} _arg${i}`)
                    .join(', ');
                output += ')';
            } else {
                output += fullFunction;
            }
        } else {
            output += this.selector + '()';
        }
        output += ' ' + this.visibility;
        if (this.constant) {
            output += ' view';
        }
        if (this.payable) {
            output += ' payable';
        }
        if (this.returns.length > 0) {
            output += ` returns (${this.returns.join(', ')})`;
        }
        output += ' {\n';
        output += solStmts(this.stmts, 4);
        output += '}\n\n';
        return output;
    }
}

export function build(state: State<Inst, Expr>): Stmt[] {
    const visited = new WeakSet();
    return buildState(state);

    function buildState(state: State<Inst, Expr>): Stmt[] {
        if (visited.has(state)) {
            return [];
        }

        visited.add(state);

        const last = state.last!;
        if (last === undefined) return [];

        for (let i = 0; i < state.stmts.length; i++) {
            state.stmts[i] = state.stmts[i].eval();
        }

        switch (last.name) {
            case 'Jumpi': {
                if (last.evalCond.isVal()) {
                    if (last.evalCond.val === 0n) {
                        return [...state.stmts.slice(0, -1), ...buildState(last.fallBranch.state)];
                    } else {
                        return [...state.stmts.slice(0, -1), ...buildState(last.destBranch.state)];
                    }
                }

                const trueBlock = buildState(last.destBranch.state);
                const falseBlock = buildState(last.fallBranch.state);
                return [
                    ...state.stmts.slice(0, -1),
                    ...(isRevertBlock(falseBlock)
                        ? [
                              new Require(
                                  last.cond.eval(),
                                  (falseBlock[0].args ?? []).map(e => e.eval())
                              ),
                              ...trueBlock,
                          ]
                        : [new If(new Not(last.cond), falseBlock), ...trueBlock]),
                ];
            }
            case 'SigCase': {
                const falseBlock = buildState(last.fallBranch.state);
                return [
                    ...state.stmts.slice(0, -1),
                    new If(last.condition, [new CallSite(last.condition.selector)], falseBlock),
                ];
            }
            case 'Jump':
                return [...state.stmts.slice(0, -1), ...buildState(last.destBranch.state)];
            case 'JumpDest':
                return [...state.stmts.slice(0, -1), ...buildState(last.fallBranch.state)];
            default:
                return state.stmts;
        }
    }
}

function requiresNoValue(stmts: Stmt[]): boolean {
    return (
        stmts.length > 0 &&
        stmts[0] instanceof Require &&
        stmts[0].condition.tag === 'IsZero' &&
        stmts[0].condition.value.tag === 'CallValue'
    );
}
