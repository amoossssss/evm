import { expect } from 'chai';
import { Metadata, stripMetadataHash } from '../src';
import { compile, VERSIONS } from './contracts/utils/solc';

describe('metadata', () => {
    const HASHES = {
        '0.5.5': ['bzzr', '760b7e60f3ed5bd6e3aa987ceb719e6f969d34cd9f5a7998528738ff7f1b061a'],
        '0.5.17': ['bzzr', 'a8069697346c7e74a85a870bebf9590429864e888d46f6bcc091bf3b402309a6'],
        '0.6.12': ['ipfs', '12201f5f012878155213dffca1b7edc8362e12f3b3fc92086c5f67d6a5d0cf2ca98b'],
        '0.7.6': ['ipfs', '12201997d77004cc732ef3f48d11e9d17be4c5f58b103d4a44285fdf0c772b2cef25'],
        '0.8.16': ['ipfs', '12208ebe81467a9118d8a0387f22cc7713981d4c8f85aea00cbf07fa8848b20ca85b'],
    } as const;

    VERSIONS.forEach(version => {
        it(`should get metadata for bytecode compiled with solc-${version}`, () => {
            const [, metadata] = stripMetadataHash(
                compile('contract C {}', version).deployedBytecode
            );

            const [protocol, hash] = HASHES[version];
            expect(metadata).to.be.deep.equal(new Metadata(protocol, hash, version));
            expect(metadata?.url).to.be.equal(`${protocol}://${hash}`);
        });
    });
});