const parseSingle = (data: any, type: any) => {
    if (type === 'string') {
        return '"' + Buffer.from(data, 'hex').toString('utf8') + '"';
    } else if (type === 'address') {
        return '0x' + data.substring(24);
    } else if (type === 'uint256' || type === 'uint8') {
        return BigInt('0x' + data).toString();
    } else if (type === 'bool') {
        return (BigInt('0x' + data) !== 0n).toString();
    } else {
        return data;
    }
};

export class Transaction {
    blockHash?: string;
    blockNumber?: number;
    from?: string;
    gas?: number;
    gasPrice?: number;
    input?: string;
    to?: string;
    value?: number;

    constructor(transactionObject?: any) {
        if (transactionObject) {
            if ('blockHash' in transactionObject) {
                this.blockHash = transactionObject.blockHash;
            }
            if ('blockNumber' in transactionObject) {
                this.blockNumber = transactionObject.blockNumber;
            }
            if ('from' in transactionObject) {
                this.from = transactionObject.from;
            }
            if ('gas' in transactionObject) {
                this.gas = transactionObject.gas;
            }
            if ('gasPrice' in transactionObject) {
                this.gasPrice = transactionObject.gasPrice;
            }
            if ('input' in transactionObject) {
                this.input = transactionObject.input.replace('0x', '');
            }
            if ('to' in transactionObject) {
                this.to = transactionObject.to;
            }
            if ('value' in transactionObject) {
                this.value = transactionObject.value;
            }
        }
    }

    setInput(input: string): void {
        this.input = input.replace('0x', '');
    }

    getFunctionHash(): string | false {
        if (this.input && this.input.length >= 8) {
            return this.input.substr(0, 8);
        } else {
            return false;
        }
    }

    getFunction(functionHashes: { [s: string]: string }): string | false {
        const functionHash = this.getFunctionHash();
        if (functionHash && functionHash in functionHashes) {
            return (functionHashes as any)[functionHash];
        } else {
            return false;
        }
    }

    getFunctionName(functionHashes: { [s: string]: string }): string | false {
        const rawFunction = this.getFunction(functionHashes);
        if (rawFunction) {
            return rawFunction.split('(')[0];
        } else {
            return false;
        }
    }

    getRawArguments(): string[] {
        if (this.input && this.input.length >= 70) {
            return this.input.substr(8).match(/.{1,64}/g)!;
        } else {
            return [];
        }
    }

    getArguments(functionHashes: { [s: string]: string }, _descriptive = true): string[] {
        const functionName = this.getFunction(functionHashes);
        const functionArguments = this.getRawArguments();
        if (functionName && this.input) {
            const rawFunctionArguments = functionName.split('(')[1].slice(0, -1).split(',');
            if (
                rawFunctionArguments.length === 1 &&
                rawFunctionArguments[0] === '' &&
                functionArguments.length === 0
            ) {
                return [];
            } else {
                const result: string[] = [];
                for (let i = 0; i < rawFunctionArguments.length; i++) {
                    const functionArgumentType = rawFunctionArguments[i] || 'unknown';
                    const functionArgument = functionArguments[i];
                    if (functionArgumentType === 'string') {
                        const location = Number(BigInt('0x' + functionArgument) / 32n);
                        const length = Number(BigInt('0x' + functionArguments[location]) * 2n);
                        const data = this.input.substring(8).substr((location + 1) * 64, length);
                        result.push(parseSingle(data, functionArgumentType));
                    } else {
                        result.push(parseSingle(functionArgument, functionArgumentType));
                    }
                }
                return result;
            }
        } else {
            return functionArguments;
        }
    }

    isContractCreation(): boolean {
        return this.to === null;
    }
}