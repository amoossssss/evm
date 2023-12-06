import { expect } from 'chai';

import { Metadata, stripMetadataHash } from 'sevm';

import { forVersion } from './utils/solc';

describe('::metadata', function () {
    it(`should return original bytecode when no metadata`, function () {
        const originalCode = '01020304';
        const [code, metadata] = stripMetadataHash(originalCode);

        expect(code).to.be.equal(originalCode);
        expect(metadata).to.be.undefined;
    });

    /**
     * IPFS hashes need to be computed manually in order to avoid adding
     * [`ipfs-core`](https://github.com/ipfs/js-ipfs#install-as-an-application-developer)
     * as a dependency.
     * This is a bloated and deprecated package.
     *
     * To get the IPFS hash of each contract run
     *
     * ```sh
     * cat $ARTIFACT | jq -r .metadata | tr -d '\n' | ipfs add --quiet --only-hash
     * ```
     *
     * where `$ARTIFACT` refers to the output of solc compiler.
     */
    const HASHES = {
        '0.5.5': [
            'bzzr',
            '886590b34f4504f97d0869b9d2210fb027f1057978e99c5a955fd1ea6ab603e9',
            '<0.5.9',
        ],
        '0.5.17': ['bzzr', '99edd4d2083be1b43f60e5f50ceb4ef57a6b968f18f236047a97a0eb54036a99'],
        '0.6.12': ['ipfs', 'QmR2wMAiGogVWTxtXh1AVNboWSHNggtn9jYzG2zLXi836A'],
        '0.7.6': ['ipfs', 'QmaRBmmGGny5mjFjSJcbvcQLsJMRsbcSB4QoEcxFu9mxhB'],
        '0.8.16': ['ipfs', 'QmcshgdTcz3T2rD8BgPAw2njvp2WsCCcsi6qh9VQhJhwLZ'],
    } as const;

    forVersion((compile, _fallback, version) => {
        it('should get metadata for deployed bytecode', function () {
            const { bytecode } = compile('contract Test {}', this);

            const [, metadata] = stripMetadataHash(bytecode);

            const [protocol, hash, expectedVersion] = HASHES[version];
            expect(metadata).to.be.deep.equal(
                new Metadata(protocol, hash, expectedVersion ?? version)
            );
            expect(metadata?.url).to.be.equal(`${protocol}://${hash}`);
        });
    });
});
