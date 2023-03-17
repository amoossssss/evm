import { expect } from 'chai';
// import { utils } from 'ethers';
import { readFileSync } from 'fs';
import { EVM } from '../src/evm';
import { State } from '../src/state';

// mocha.timeout ( 5000);

describe('examples', function () {
    this.timeout(5000);

    [
        {
            name: 'Compound-0x3FDA67f7583380E67ef93072294a7fAc882FD7E7',
            count: 13245,
            lines: [],
        },
        {
            name: 'CryptoKitties-0x06012c8cf97BEaD5deAe237070F9587f8E7A266d',
            count: 8108,
            lines: [],
        },
        {
            name: 'DAI-0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
            count: 2118,
            lines: [],
        },
        {
            name: 'ENS-0x314159265dD8dbb310642f98f50C066173C1259b',
            count: 284,
            lines: [],
        },
        {
            name: 'UnicornToken-0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7',
            count: 1214,
            lines: [
                /^event Transfer\(address indexed _arg0, address indexed _arg1, uint256 _arg2\);$/m,
                /^event FrozenFunds\(address _arg0, bool _arg1\);$/m,
                /^mapping \(address => unknown\) public balanceOf;$/m,
                /^mapping \(address => unknown\) public frozenAccount;$/m,
                /^mapping \(address => mapping \(address => uint256\)\) public allowance;$/m,
                /^mapping \(address => mapping \(address => unknown\)\) mapping4;$/m,
                /^unknown public owner;$/m,
                /^unknown public decimals;$/m,
                /^unknown public totalSupply;$/m,
                /^function approve\(address _arg0, uint256 _arg1\) public payable {$/m,
                /^function transferFrom\(address _arg0, address _arg1, uint256 _arg2\) public payable returns \(uint256\) {$/m,
                /^function mintToken\(address _arg0, uint256 _arg1\) public payable {$/m,
                /^function name\(\)/m,
                /^function symbol\(\) public payable {$/m,
                /^function transfer\(address _arg0, uint256 _arg1\) public payable {$/m,
                /^function freezeAccount\(address _arg0, bool _arg1\) public payable {$/m,
                /^function transferOwnership\(address _arg0\) public payable {$/m,
            ],
        },
        {
            /**
             * Bytecode of USDC _proxy_ contract.
             * Fetched with this RPC provider https://api.avax-test.network/ext/bc/C/rpc.
             *
             * See it on Snowtrace https://testnet.snowtrace.io/address/0x5425890298aed601595a70AB815c96711a31Bc65.
             */
            name: 'USDC-0x5425890298aed601595a70AB815c96711a31Bc65',
            count: 741,
            lines: [
                /^address public implementation;/m,
                /^address public admin;/m,
                /^function upgradeTo\(address _arg0\) public {$/m,
                /^function upgradeToAndCall\(address _arg0, bytes _arg1\) public payable {$/m,
                /^function changeAdmin\(address _arg0\) public {$/m,
            ],
        },
        {
            name: 'WETH-0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            count: 1555,
            lines: [
                /^mapping \(address => unknown\) public balanceOf;$/m,
                /^mapping \(address => mapping \(address => uint256\)\) public allowance;$/m,
                /^unknown public decimals;/m,
                /^function name\(\)/m,
                /^function approve\(address _arg0, uint256 _arg1\)/m,
                /^function totalSupply\(\)/m,
                /^function transferFrom\(address _arg0, address _arg1, uint256 _arg2\)/m,
                /^function withdraw\(uint256 _arg0\)/m,
                /^function symbol\(\)/m,
                /^function transfer\(address _arg0, uint256 _arg1\)/m,
                /^function deposit\(\)/m,
            ],
        },
    ].forEach(({ name, count }) => {
        describe(`for ${name}`, () => {
            let evm: EVM;
            // let text: string;

            before(() => {
                const bytecode = readFileSync(`./test/examples/${name}.bytecode`, 'utf8');
                evm = EVM.from(bytecode);
                // evm.start();
                // text = evm.decompile();
                evm.run(0, new State());
                for (const [s, branch] of evm.functionBranches) {
                    // console.log(s);
                    if (s === 'f2b9fdb8') evm.run(branch.pc, branch.state);
                }
            });

            it(`should decode bytecode correctly`, () => {
                // expect(evm.opcodes).to.be.of.length(count);
            });

            // it(`should detect functions correctly`, () => {
            //     const defs = lines.map(line =>
            //         line.source
            //             .replace(/\\/g, '')
            //             .replace('^', '')
            //             .replace('$', '')
            //             .replace('{', '')
            //             .replace(';', '')
            //     );

            //     const functions = defs
            //         .filter(line => line.startsWith('function '))
            //         .map(line => utils.Fragment.from(line).format());
            //     expect(evm.getFunctions()).to.include.members(functions);

            //     const variables = defs
            //         .filter(line => line.includes(' public ') && !line.includes('('))
            //         .map(line => line.split(' ').pop()! + '()');
            //     expect(evm.getFunctions()).to.include.members(variables);

            //     const mappings = defs
            //         .filter(line => line.startsWith('mapping ') && line.includes(' public '))
            //         .map(line => {
            //             const parts = line
            //                 .replace(/mapping /g, '')
            //                 .replace(/\(/g, '')
            //                 .replace(/\)/g, '')
            //                 .replace(/ => /g, ' ')
            //                 .replace(' public ', ' ')
            //                 .split(' ');
            //             const name = parts.pop();
            //             parts.pop();
            //             return `${name!}(${parts.join(',')})`;
            //         });
            //     expect(evm.getFunctions()).to.include.members(mappings);

            //     if (lines.length > 0) {
            //         const expected = [...functions, ...variables, ...mappings];
            //         expect(
            //             new Set(evm.getFunctions()),
            //             `actual ${inspect(evm.getFunctions())} != expected ${inspect(expected)}`
            //         ).to.be.deep.equal(new Set(expected));
            //     }
            // });

            // lines.forEach(line => {
            //     it(`should match decompiled bytecode to '${line.source}'`, () => {
            //         expect(text).to.match(line);
            //     });
            // });
        });
    });
});
