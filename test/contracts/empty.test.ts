import { expect } from 'chai';

import { Contract, type EVM } from 'sevm';
import { Revert, Val } from 'sevm/ast';

import { contracts } from '../utils/solc';

contracts('empty', (compile, _fallback, version) => {
    let contract: Contract;
    let evm: EVM;

    // eslint-disable-next-line mocha/no-top-level-hooks
    before(function () {
        const src = 'contract Empty { }';
        contract = new Contract(compile(src, this).bytecode);
        evm = contract.evm;
    });

    it(`should get metadata hash for minimal contract definition`, function () {
        const HASHES = {
            '0.5.5': ['bzzr', '7e3073410730b2cd71eac5640978c7422e85ded020b64ccb92ee6206e65de3bf'],
            '0.5.17': ['bzzr', '5265bc663fcc158fefb6c68337005c5573444d95c65fd54340b3e8d49da0096f'],
            '0.6.12': [
                'ipfs',
                '1220c67e9ef697533dc059c1189497c213374602a18778dace5f181af54029a137c1',
            ],
            '0.7.6': [
                'ipfs',
                '1220deb4ae4ab871ec5cfe3304c5b0495e81f60d657182d526a695610446e69323ac',
            ],
            '0.8.16': [
                'ipfs',
                '1220ab6d312183fd3151b5c599ff692e3fe622281770888e2e1133ac33add9d0285b',
            ],
        } as const;

        expect(evm.metadata).to.be.not.undefined;

        const hash = HASHES[version];
        expect(evm.metadata!.protocol).to.be.equal(hash[0]);
        expect(evm.metadata!.solc).to.be.equal(version === '0.5.5' ? '<0.5.9' : version);

        expect(evm.metadata!.hash).to.be.equal(hash[1]);
        expect(evm.metadata!.url).to.be.equal(`${hash[0]}://${hash[1]}`);
    });

    it('should not have functions nor events', function () {
        expect(contract.functions).to.be.empty;
        expect(evm.functionBranches).to.be.empty;
        expect(evm.events).to.be.empty;
    });

    it.skip('should have 1 block & 1 `revert`', function () {
        expect(contract.evm.chunks).to.be.of.length(1);
        const chunk = contract.evm.chunks.get(0)!;
        expect(evm.opcodes[chunk.pcend - 1]!.mnemonic).to.be.equal('REVERT');
        expect(chunk.states).to.be.of.length(1);
        const state = chunk.states[0]!;
        expect(state.last?.eval()).to.be.deep.equal(
            new Revert(new Val(0n, true), new Val(0n, true), [])
        );

        expect(contract.main.length).to.be.at.least(1);
        expect(contract.main.at(-1)?.eval()).to.be.deep.equal(
            new Revert(new Val(0n, true), new Val(0n, true), [])
        );
    });

    it('should `decompile` bytecode', function () {
        expect(contract.decompile()).to.be.equal('revert();\n');
    });
});
