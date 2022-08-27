import { expect } from 'chai';
import { stripMetadataHash } from '../../src/metadata';
import EVM from '../utils/evmtest';
import { solc } from './utils/solc';

describe('contracts::vars', () => {
    it('single private var', () => {
        const CONTRACT = `contract C {
            uint256 value;
        }`;
        const evm = new EVM(stripMetadataHash(solc('C', CONTRACT, '0.8.16'))[0]);
        expect(evm.decompile()).to.match(/revert/);
    });
});